/**
 * Unified Data Collection Service for 500.farm API
 * Optimized strategy that eliminates data redundancy and maximizes efficiency
 */

interface UnifiedCollectionConfig {
  maxRetries: number;
  chunkSize: number;
  delayBetweenRequests: number;
  timeout: number;
}

interface CollectionStrategy {
  endpoint: string;
  priority: number; // 1 = highest priority
  dataSource: 'primary' | 'enrichment' | 'metrics';
  frequency: 'realtime' | 'frequent' | 'periodic';
  processingMethod: 'direct' | 'chunked' | 'streaming';
}

const DEFAULT_CONFIG: UnifiedCollectionConfig = {
  maxRetries: 3,
  chunkSize: 1000,
  delayBetweenRequests: 1000,
  timeout: 30000
};

// Optimized collection strategy based on data analysis
const COLLECTION_STRATEGIES: CollectionStrategy[] = [
  {
    endpoint: 'gpu-stats',
    priority: 1,
    dataSource: 'primary',
    frequency: 'frequent', // Every 5 minutes
    processingMethod: 'direct' // Small dataset, works perfectly
  },
  {
    endpoint: 'offers', 
    priority: 2,
    dataSource: 'primary',
    frequency: 'realtime', // Every 1-2 minutes
    processingMethod: 'chunked' // Large dataset, needs chunking
  },
  {
    endpoint: 'hosts',
    priority: 3,
    dataSource: 'enrichment',
    frequency: 'periodic', // Every 30 minutes
    processingMethod: 'direct' // Medium dataset, manageable
  },
  {
    endpoint: 'metrics/global',
    priority: 4,
    dataSource: 'metrics',
    frequency: 'realtime', // Every 30 seconds
    processingMethod: 'direct' // Prometheus format, small and fast
  }
  // Note: /machines endpoint SKIPPED - data is redundant with /offers
];

export class UnifiedDataCollectionService {
  private config: UnifiedCollectionConfig;
  private env: any;
  private baseUrl = 'https://500.farm/vastai-exporter';

  constructor(env: any, config: Partial<UnifiedCollectionConfig> = {}) {
    this.env = env;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Main collection orchestrator - runs all endpoints based on priority and frequency
   */
  async collectMarketData(forceAll = false): Promise<{
    success: boolean;
    results: Array<{ endpoint: string; success: boolean; records: number; error?: string }>;
    duration: number;
  }> {
    const startTime = Date.now();
    const results: Array<{ endpoint: string; success: boolean; records: number; error?: string }> = [];

    // Determine which endpoints to collect based on frequency and cache status
    const endpointsToCollect = forceAll 
      ? COLLECTION_STRATEGIES 
      : await this.getEndpointsDueForCollection();

    // Process endpoints in priority order
    for (const strategy of endpointsToCollect.sort((a, b) => a.priority - b.priority)) {
      try {
        console.log(`🔄 Starting collection: ${strategy.endpoint} (${strategy.dataSource})`);
        
        const result = await this.collectEndpoint(strategy);
        results.push({
          endpoint: strategy.endpoint,
          success: result.success,
          records: result.recordsProcessed,
          error: result.error
        });

        // Short delay between endpoints to avoid overwhelming the API
        if (strategy !== endpointsToCollect[endpointsToCollect.length - 1]) {
          await this.delay(this.config.delayBetweenRequests);
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          endpoint: strategy.endpoint,
          success: false,
          records: 0,
          error: errorMsg
        });
      }
    }

    return {
      success: results.every(r => r.success),
      results,
      duration: Date.now() - startTime
    };
  }

  /**
   * Collect data from a specific endpoint using the appropriate strategy
   */
  private async collectEndpoint(strategy: CollectionStrategy): Promise<{
    success: boolean;
    recordsProcessed: number;
    error?: string;
  }> {
    const syncJobId = `sync-${strategy.endpoint}-${Date.now()}`;
    
    try {
      // Create sync job
      await this.createSyncJob(syncJobId, strategy.endpoint);

      let result: { success: boolean; recordsProcessed: number; error?: string };

      switch (strategy.processingMethod) {
        case 'direct':
          result = await this.collectDirect(strategy.endpoint, syncJobId);
          break;
        case 'chunked':
          result = await this.collectChunked(strategy.endpoint, syncJobId);
          break;
        case 'streaming':
          result = await this.collectStreaming(strategy.endpoint, syncJobId);
          break;
        default:
          throw new Error(`Unknown processing method: ${strategy.processingMethod}`);
      }

      // Update sync job
      await this.updateSyncJob(syncJobId, result.success ? 'completed' : 'failed', result.recordsProcessed, result.error);
      
      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.updateSyncJob(syncJobId, 'failed', 0, errorMsg);
      return { success: false, recordsProcessed: 0, error: errorMsg };
    }
  }

  /**
   * Direct collection for small/medium datasets (gpu-stats, hosts, metrics)
   */
  private async collectDirect(endpoint: string, syncJobId: string): Promise<{
    success: boolean;
    recordsProcessed: number;
    error?: string;
  }> {
    try {
      const url = `${this.baseUrl}/${endpoint}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      let recordsProcessed = 0;

      switch (endpoint) {
        case 'gpu-stats':
          recordsProcessed = await this.processGPUStats(data);
          break;
        case 'hosts':
          recordsProcessed = await this.processHosts(data);
          break;
        case 'metrics/global':
          recordsProcessed = await this.processMetrics(data);
          break;
        default:
          throw new Error(`Unknown direct endpoint: ${endpoint}`);
      }

      return { success: true, recordsProcessed };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, recordsProcessed: 0, error: errorMsg };
    }
  }

  /**
   * Chunked collection for large datasets (offers)
   */
  private async collectChunked(endpoint: string, syncJobId: string): Promise<{
    success: boolean;
    recordsProcessed: number;
    error?: string;
  }> {
    // This would implement the chunked strategy from the original dataCollectionService
    // For now, let's try direct and see if it works with current data size
    console.log(`⚠️ Chunked collection not yet implemented for ${endpoint}, falling back to direct`);
    return await this.collectDirect(endpoint, syncJobId);
  }

  /**
   * Streaming collection for very large datasets
   */
  private async collectStreaming(endpoint: string, syncJobId: string): Promise<{
    success: boolean;
    recordsProcessed: number;
    error?: string;
  }> {
    console.log(`⚠️ Streaming collection not yet implemented for ${endpoint}`);
    return { success: false, recordsProcessed: 0, error: 'Streaming not implemented' };
  }

  /**
   * Process GPU statistics data (from /gpu-stats)
   */
  private async processGPUStats(data: any): Promise<number> {
    if (!data.models || !Array.isArray(data.models)) {
      throw new Error('Invalid GPU stats data structure');
    }

    const timestamp = data.timestamp;
    let processed = 0;

    for (const modelData of data.models) {
      try {
        const stats = modelData.stats;
        const info = modelData.info;

        await this.env.DB.prepare(`
          INSERT OR REPLACE INTO gpu_market_stats 
          (model, 
           rented_verified_count, rented_verified_median, rented_verified_p10, rented_verified_p90,
           rented_unverified_count, rented_unverified_median, rented_unverified_p10, rented_unverified_p90,
           available_verified_count, available_verified_median, available_verified_p10, available_verified_p90,
           available_unverified_count, available_unverified_median, available_unverified_p10, available_unverified_p90,
           total_all_count, total_all_median, total_all_p10, total_all_p90,
           vram_gb, dlperf, tflops, data_timestamp, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          modelData.name,
          this.getStatValue(stats, 'rented', 'verified', 'count'),
          this.getStatValue(stats, 'rented', 'verified', 'price_median'),
          this.getStatValue(stats, 'rented', 'verified', 'price_10th_percentile'),
          this.getStatValue(stats, 'rented', 'verified', 'price_90th_percentile'),
          this.getStatValue(stats, 'rented', 'unverified', 'count'),
          this.getStatValue(stats, 'rented', 'unverified', 'price_median'),
          this.getStatValue(stats, 'rented', 'unverified', 'price_10th_percentile'),
          this.getStatValue(stats, 'rented', 'unverified', 'price_90th_percentile'),
          this.getStatValue(stats, 'available', 'verified', 'count'),
          this.getStatValue(stats, 'available', 'verified', 'price_median'),
          this.getStatValue(stats, 'available', 'verified', 'price_10th_percentile'),
          this.getStatValue(stats, 'available', 'verified', 'price_90th_percentile'),
          this.getStatValue(stats, 'available', 'unverified', 'count'),
          this.getStatValue(stats, 'available', 'unverified', 'price_median'),
          this.getStatValue(stats, 'available', 'unverified', 'price_10th_percentile'),
          this.getStatValue(stats, 'available', 'unverified', 'price_90th_percentile'),
          this.getStatValue(stats, 'all', 'all', 'count'),
          this.getStatValue(stats, 'all', 'all', 'price_median'),
          this.getStatValue(stats, 'all', 'all', 'price_10th_percentile'),
          this.getStatValue(stats, 'all', 'all', 'price_90th_percentile'),
          info?.vram || null,
          info?.dlperf || null,
          info?.tflops || null,
          timestamp,
          this.getExpirationDate()
        ).run();

        processed++;
      } catch (error) {
        console.error(`Error processing GPU stats for ${modelData.name}:`, error);
      }
    }

    return processed;
  }

  /**
   * Process hosts data (from /hosts)
   */
  private async processHosts(data: any): Promise<number> {
    if (!data.hosts || !Array.isArray(data.hosts)) {
      throw new Error('Invalid hosts data structure');
    }

    const timestamp = data.timestamp;
    let processed = 0;

    for (const host of data.hosts) {
      try {
        const location = host.location || {};
        
        await this.env.DB.prepare(`
          INSERT OR REPLACE INTO gpu_providers 
          (host_id, total_machines, total_gpus_by_model, total_tflops,
           country, location, latitude, longitude, location_accuracy, isp, domain,
           inet_up_mbps, inet_down_mbps, ip_address_count, data_timestamp, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          host.host_id,
          host.machine_ids?.length || 0,
          JSON.stringify(host.gpus || {}),
          host.tflops || 0,
          location.country || null,
          location.location || null,
          location.lat || null,
          location.long || null,
          location.accuracy || null,
          location.isp || null,
          location.domain || null,
          host.inet_up || null,
          host.inet_down || null,
          host.ip_addresses?.length || 0,
          timestamp,
          this.getExpirationDate()
        ).run();

        processed++;
      } catch (error) {
        console.error(`Error processing host ${host.host_id}:`, error);
      }
    }

    return processed;
  }

  /**
   * Process metrics data (from /metrics/global)
   */
  private async processMetrics(metricsText: string): Promise<number> {
    const lines = metricsText.split('\n');
    const timestamp = new Date().toISOString();
    let processed = 0;

    for (const line of lines) {
      if (line.startsWith('vastai_gpu_count{')) {
        try {
          // Parse Prometheus format: vastai_gpu_count{gpu_name="RTX 4090",rented="no",verified="yes"} 1997
          const match = line.match(/gpu_name="([^"]+)",rented="([^"]+)",verified="([^"]+)"\}\s+(\d+)/);
          if (match) {
            const [, gpuName, rented, verified, count] = match;
            
            await this.env.DB.prepare(`
              INSERT INTO gpu_availability_metrics 
              (gpu_name, rented, verified, count, collected_at, expires_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `).bind(
              gpuName,
              rented === 'yes',
              verified === 'yes',
              parseInt(count),
              timestamp,
              this.getExpirationDate()
            ).run();

            processed++;
          }
        } catch (error) {
          console.error('Error processing metrics line:', line, error);
        }
      }
    }

    return processed;
  }

  /**
   * Helper to safely extract nested stat values
   */
  private getStatValue(stats: any, category: string, verification: string, field: string): number {
    try {
      const categoryData = stats[category];
      if (!categoryData) return 0;
      
      const verificationData = categoryData[verification];
      if (!verificationData || !Array.isArray(verificationData) || verificationData.length === 0) return 0;
      
      return verificationData[0][field] || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Determine which endpoints need collection based on cache TTL
   */
  private async getEndpointsDueForCollection(): Promise<CollectionStrategy[]> {
    const now = Date.now();
    const dueEndpoints: CollectionStrategy[] = [];

    for (const strategy of COLLECTION_STRATEGIES) {
      const cacheKey = `last_collection_${strategy.endpoint}`;
      const lastCollection = await this.env.CACHE?.get(cacheKey);
      
      if (!lastCollection) {
        dueEndpoints.push(strategy);
        continue;
      }

      const timeSinceCollection = now - parseInt(lastCollection);
      const ttl = this.getTTLForFrequency(strategy.frequency);

      if (timeSinceCollection >= ttl) {
        dueEndpoints.push(strategy);
      }
    }

    return dueEndpoints;
  }

  /**
   * Get TTL in milliseconds based on frequency
   */
  private getTTLForFrequency(frequency: string): number {
    switch (frequency) {
      case 'realtime': return 60 * 1000; // 1 minute
      case 'frequent': return 5 * 60 * 1000; // 5 minutes
      case 'periodic': return 30 * 60 * 1000; // 30 minutes
      default: return 5 * 60 * 1000;
    }
  }

  /**
   * Create sync job record
   */
  private async createSyncJob(id: string, endpoint: string): Promise<void> {
    await this.env.DB.prepare(`
      INSERT INTO market_sync_jobs (id, endpoint, status, metadata)
      VALUES (?, ?, 'running', ?)
    `).bind(id, endpoint, JSON.stringify({ strategy: 'unified' })).run();
  }

  /**
   * Update sync job status
   */
  private async updateSyncJob(id: string, status: string, recordsProcessed: number, errorMessage?: string): Promise<void> {
    await this.env.DB.prepare(`
      UPDATE market_sync_jobs 
      SET status = ?, records_processed = ?, completed_at = ?, error_message = ?
      WHERE id = ?
    `).bind(
      status,
      recordsProcessed,
      status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
      errorMessage || null,
      id
    ).run();
  }

  /**
   * Get expiration date for new records (3 days from now)
   */
  private getExpirationDate(): string {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 3);
    return expiration.toISOString();
  }

  /**
   * Utility: Add delay
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}