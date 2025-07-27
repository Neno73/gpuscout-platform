import { D1Database } from '@cloudflare/workers-types';

/**
 * Service class for managing user portfolios and GPU instances.
 * Handles all database interactions and business logic.
 */
export class PortfolioService {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * Creates a new portfolio for a user.
   * @param userId The ID of the user creating the portfolio.
   * @param data The portfolio data (name, description).
   * @returns The newly created portfolio object.
   */
  async createPortfolio(userId: string, data: { name: string; description?: string }) {
    // TODO: Implement business logic from spec: "Free tier users limited to 1 portfolio."
    // This would involve checking the user's subscription tier and current portfolio count.

    const portfolio = {
      id: crypto.randomUUID(),
      user_id: userId,
      name: data.name,
      description: data.description || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const stmt = this.db.prepare(
      'INSERT INTO portfolios (id, user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    await stmt.bind(...Object.values(portfolio)).run();

    return portfolio;
  }

  /**
   * Retrieves all portfolios for a given user.
   * @param userId The ID of the user.
   * @returns An array of portfolio objects.
   */
  async getPortfolios(userId: string) {
    const stmt = this.db.prepare('SELECT * FROM portfolios WHERE user_id = ? ORDER BY created_at DESC');
    const { results } = await stmt.bind(userId).all();
    return results;
  }

  /**
   * Retrieves a single portfolio by its ID, including its GPU instances.
   * Ensures the portfolio belongs to the specified user.
   * @param userId The ID of the user.
   * @param portfolioId The ID of the portfolio.
   * @returns The portfolio object with a nested array of GPUs, or null if not found.
   */
  async getPortfolioById(userId: string, portfolioId: string) {
    const portfolioStmt = this.db.prepare('SELECT * FROM portfolios WHERE id = ? AND user_id = ?');
    const portfolio = await portfolioStmt.bind(portfolioId, userId).first();

    if (!portfolio) {
      return null;
    }

    const gpusStmt = this.db.prepare('SELECT * FROM gpu_instances WHERE portfolio_id = ?');
    const { results: gpus } = await gpusStmt.bind(portfolioId).all();

    return { ...portfolio, gpus };
  }

  /**
   * Updates a portfolio's details.
   * @param userId The ID of the user.
   * @param portfolioId The ID of the portfolio to update.
   * @param data The data to update (name, description).
   * @returns The updated portfolio object.
   */
  async updatePortfolio(userId: string, portfolioId: string, data: { name?: string; description?: string }) {
    const { name, description } = data;
    const updatedAt = new Date().toISOString();

    const stmt = this.db.prepare(
      'UPDATE portfolios SET name = COALESCE(?, name), description = COALESCE(?, description), updated_at = ? WHERE id = ? AND user_id = ? RETURNING *'
    );
    const updatedPortfolio = await stmt.bind(name, description, updatedAt, portfolioId, userId).first();
    return updatedPortfolio;
  }

  /**
   * Deletes a portfolio and all its associated GPU instances.
   * @param userId The ID of the user.
   * @param portfolioId The ID of the portfolio to delete.
   * @returns A boolean indicating if the deletion was successful.
   */
  async deletePortfolio(userId: string, portfolioId: string): Promise<boolean> {
    // D1 does not support cascading deletes via FOREIGN KEYs automatically.
    // We must perform the deletion in a transaction.
    const results = await this.db.batch([
      this.db.prepare('DELETE FROM gpu_instances WHERE portfolio_id = ?'),
      this.db.prepare('DELETE FROM portfolios WHERE id = ? AND user_id = ?'),
    ]);
    // This is a simplified check. A robust implementation would check results of each statement.
    return results.every(r => r.success);
  }

  /**
   * Adds one or more GPU instances to a portfolio.
   * @param userId The ID of the user.
   * @param portfolioId The ID of the portfolio.
   * @param data The GPU data (model, quantity, etc.).
   * @returns An array of the newly created GPU instance objects.
   */
  async addGpuInstances(userId: string, portfolioId: string, data: { gpuModel: string; quantity: number; customNamePrefix?: string }) {
    // First, verify the user owns the portfolio
    const portfolio = await this.db.prepare('SELECT id FROM portfolios WHERE id = ? AND user_id = ?').bind(portfolioId, userId).first();
    if (!portfolio) {
      return null; // Or throw an error
    }

    const { gpuModel, quantity, customNamePrefix } = data;
    const stmts = [];
    const newInstances = [];

    for (let i = 0; i < quantity; i++) {
      const instance = {
        id: crypto.randomUUID(),
        portfolio_id: portfolioId,
        gpu_model: gpuModel,
        custom_name: customNamePrefix ? `${customNamePrefix} ${i + 1}` : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      newInstances.push(instance);
      stmts.push(
        this.db.prepare('INSERT INTO gpu_instances (id, portfolio_id, gpu_model, custom_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(instance.id, instance.portfolio_id, instance.gpu_model, instance.custom_name, instance.created_at, instance.updated_at)
      );
    }

    await this.db.batch(stmts);
    return newInstances;
  }

  /**
   * Adds real marketplace offers to a portfolio using actual offer IDs from our database.
   * @param userId The ID of the user.
   * @param portfolioId The ID of the portfolio.
   * @param data The marketplace offer data (offerIds, customName).
   * @returns An array of the newly created GPU instance objects linked to real offers.
   */
  async addMarketplaceOffers(userId: string, portfolioId: string, data: { offerIds: number[]; customName?: string }) {
    // First, verify the user owns the portfolio
    const portfolio = await this.db.prepare('SELECT id FROM portfolios WHERE id = ? AND user_id = ?').bind(portfolioId, userId).first();
    if (!portfolio) {
      return null;
    }

    // Verify all offer IDs exist in our marketplace data
    const placeholders = data.offerIds.map(() => '?').join(',');
    const offersStmt = this.db.prepare(`SELECT offer_id, gpu_name, price_base_per_hour, location FROM gpu_marketplace_offers WHERE offer_id IN (${placeholders})`);
    const { results: offers } = await offersStmt.bind(...data.offerIds).all();
    
    if (offers.length !== data.offerIds.length) {
      return null; // Some offer IDs are invalid
    }

    // Create GPU instances linked to real marketplace offers
    const stmts = [];
    const newInstances = [];

    for (const offer of offers) {
      const instance = {
        id: crypto.randomUUID(),
        portfolio_id: portfolioId,
        gpu_model: offer.gpu_name,
        custom_name: data.customName || `${offer.gpu_name} - ${offer.location}`,
        platform_instance_id: offer.offer_id.toString(), // Store the real offer ID
        settings: JSON.stringify({
          offer_id: offer.offer_id,
          base_price: offer.price_base_per_hour,
          location: offer.location
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      newInstances.push(instance);
      stmts.push(
        this.db.prepare('INSERT INTO gpu_instances (id, portfolio_id, gpu_model, custom_name, platform_instance_id, settings, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(instance.id, instance.portfolio_id, instance.gpu_model, instance.custom_name, instance.platform_instance_id, instance.settings, instance.created_at, instance.updated_at)
      );
    }

    await this.db.batch(stmts);
    return newInstances;
  }

  /**
   * Updates a single GPU instance.
   * @param userId The ID of the user.
   * @param portfolioId The ID of the portfolio containing the GPU.
   * @param gpuId The ID of the GPU instance to update.
   * @param data The data to update.
   * @returns The updated GPU instance object.
   */
  async updateGpuInstance(userId: string, portfolioId: string, gpuId: string, data: { customName?: string; platformInstanceId?: string; settings?: object }) {
    // Verify ownership via portfolio
    const portfolio = await this.db.prepare('SELECT id FROM portfolios WHERE id = ? AND user_id = ?').bind(portfolioId, userId).first();
    if (!portfolio) {
      return null;
    }

    const { customName, platformInstanceId, settings } = data;
    const updatedAt = new Date().toISOString();
    const settingsJson = settings ? JSON.stringify(settings) : null;

    const stmt = this.db.prepare(
      'UPDATE gpu_instances SET custom_name = COALESCE(?, custom_name), platform_instance_id = COALESCE(?, platform_instance_id), settings = COALESCE(?, settings), updated_at = ? WHERE id = ? AND portfolio_id = ? RETURNING *'
    );
    const updatedInstance = await stmt.bind(customName, platformInstanceId, settingsJson, updatedAt, gpuId, portfolioId).first();
    return updatedInstance;
  }
}