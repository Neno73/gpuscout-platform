/**
 * Data Retention Service for GPUScout Platform
 * Implements tiered retention: 3-day raw data + daily aggregations
 */

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
}

interface AggregationResult {
  success: boolean;
  recordsAggregated: number;
  recordsDeleted: number;
  error?: string;
}

interface RetentionJobRecord {
  id?: number;
  job_type: 'aggregation' | 'cleanup';
  target_date: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  records_processed: number;
  records_deleted: number;
  records_aggregated: number;
  error_message?: string;
  metadata?: string;
}

export class DataRetentionService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Main daily retention job - aggregates and cleans up data
   */
  async runDailyRetention(): Promise<{
    success: boolean;
    results: Array<{ operation: string; success: boolean; details: any }>;
    duration: number;
  }> {
    const startTime = Date.now();
    const results: Array<{ operation: string; success: boolean; details: any }> = [];

    try {
      // Target date: 4 days ago (day before our 3-day retention window)
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - 4);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      console.log(`🔄 Starting daily retention for date: ${targetDateStr}`);

      // Step 1: Aggregate data into daily summaries
      const aggregationResult = await this.aggregateDailyData(targetDateStr);
      results.push({
        operation: 'aggregation',
        success: aggregationResult.success,
        details: {
          recordsAggregated: aggregationResult.recordsAggregated,
          error: aggregationResult.error
        }
      });

      // Step 2: Clean up raw data older than 3 days (only if aggregation succeeded)
      if (aggregationResult.success) {
        const cleanupResult = await this.cleanupExpiredData();
        results.push({
          operation: 'cleanup',
          success: cleanupResult.success,
          details: {
            recordsDeleted: cleanupResult.recordsDeleted,
            error: cleanupResult.error
          }
        });
      } else {
        console.error('⚠️ Skipping cleanup due to aggregation failure');
        results.push({
          operation: 'cleanup',
          success: false,
          details: { error: 'Skipped due to aggregation failure' }
        });
      }

      // Step 3: Update cache with retention status
      await this.updateRetentionStatus(results);

      return {
        success: results.every(r => r.success),
        results,
        duration: Date.now() - startTime
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Daily retention job failed:', errorMsg);
      
      results.push({
        operation: 'retention_job',
        success: false,
        details: { error: errorMsg }
      });

      return {
        success: false,
        results,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Aggregate data from target date into daily summaries
   */
  private async aggregateDailyData(targetDate: string): Promise<AggregationResult> {
    const jobId = `agg-${targetDate}-${Date.now()}`;
    
    try {
      // Create job record
      await this.createRetentionJob(jobId, 'aggregation', targetDate);

      let totalAggregated = 0;

      // Aggregate GPU marketplace offers into daily price trends
      const offersResult = await this.aggregateMarketplaceOffers(targetDate);
      totalAggregated += offersResult.recordsAggregated;

      // Aggregate GPU market stats (if needed - they're already somewhat aggregated)
      const statsResult = await this.aggregateMarketStats(targetDate);
      totalAggregated += statsResult.recordsAggregated;

      // Update job as completed
      await this.updateRetentionJob(jobId, 'completed', totalAggregated, 0);

      console.log(`✅ Aggregated ${totalAggregated} records for ${targetDate}`);
      
      return {
        success: true,
        recordsAggregated: totalAggregated,
        recordsDeleted: 0
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.updateRetentionJob(jobId, 'failed', 0, 0, errorMsg);
      
      return {
        success: false,
        recordsAggregated: 0,
        recordsDeleted: 0,
        error: errorMsg
      };
    }
  }

  /**
   * Aggregate marketplace offers data for a specific date
   */
  private async aggregateMarketplaceOffers(targetDate: string): Promise<{ recordsAggregated: number }> {
    // Simplified aggregation that works with D1/SQLite constraints
    const aggregationQuery = `
      INSERT OR REPLACE INTO gpu_price_trends (
        gpu_model, price_median, price_min, price_max, price_avg,
        total_offers, available_offers, verified_offers,
        avg_dlperf, country_count, sample_date, source_records
      )
      SELECT 
        gpu_name as gpu_model,
        
        -- Simplified price statistics
        AVG(price_base_per_hour) as price_median, -- Using AVG as median approximation
        MIN(price_base_per_hour) as price_min,
        MAX(price_base_per_hour) as price_max,
        AVG(price_base_per_hour) as price_avg,
        
        -- Counts
        COUNT(*) as total_offers,
        SUM(CASE WHEN rentable = true THEN 1 ELSE 0 END) as available_offers,
        SUM(CASE WHEN verified = true THEN 1 ELSE 0 END) as verified_offers,
        
        -- Performance metrics
        AVG(dlperf) as avg_dlperf,
        
        -- Geographic diversity
        COUNT(DISTINCT country) as country_count,
        
        -- Metadata
        ? as sample_date,
        COUNT(*) as source_records
        
      FROM gpu_marketplace_offers
      WHERE DATE(created_at) = ?
      GROUP BY gpu_name
      HAVING COUNT(*) > 0
    `;

    const result = await this.env.DB.prepare(aggregationQuery)
      .bind(targetDate, targetDate)
      .run();

    console.log(`📊 Aggregated ${result.changes || 0} GPU models for ${targetDate}`);
    return { recordsAggregated: result.changes || 0 };
  }

  /**
   * Aggregate market stats data for a specific date (lightweight)
   */
  private async aggregateMarketStats(targetDate: string): Promise<{ recordsAggregated: number }> {
    // Market stats are already somewhat aggregated, so this is lighter
    // We could add additional aggregation logic here if needed
    
    console.log(`📊 Market stats aggregation for ${targetDate} (skipped - already aggregated)`);
    return { recordsAggregated: 0 };
  }

  /**
   * Clean up expired raw data (older than 3 days)
   */
  private async cleanupExpiredData(): Promise<AggregationResult> {
    const jobId = `cleanup-${Date.now()}`;
    
    try {
      await this.createRetentionJob(jobId, 'cleanup', new Date().toISOString().split('T')[0]);

      let totalDeleted = 0;

      // Clean up each table
      const tables = [
        'gpu_marketplace_offers',
        'gpu_market_stats', 
        'gpu_providers',
        'gpu_availability_metrics'
      ];

      for (const table of tables) {
        const deleteResult = await this.env.DB.prepare(`
          DELETE FROM ${table} 
          WHERE expires_at IS NOT NULL AND expires_at < datetime('now')
        `).run();

        const deleted = deleteResult.changes || 0;
        totalDeleted += deleted;
        
        console.log(`🗑️ Deleted ${deleted} expired records from ${table}`);
      }

      await this.updateRetentionJob(jobId, 'completed', 0, totalDeleted);

      return {
        success: true,
        recordsAggregated: 0,
        recordsDeleted: totalDeleted
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.updateRetentionJob(jobId, 'failed', 0, 0, errorMsg);
      
      return {
        success: false,
        recordsAggregated: 0,
        recordsDeleted: 0,
        error: errorMsg
      };
    }
  }

  /**
   * Create a retention job record
   */
  private async createRetentionJob(
    id: string, 
    jobType: 'aggregation' | 'cleanup', 
    targetDate: string
  ): Promise<void> {
    await this.env.DB.prepare(`
      INSERT INTO data_retention_jobs (id, job_type, target_date, status, metadata)
      VALUES (?, ?, ?, 'running', ?)
    `).bind(id, jobType, targetDate, JSON.stringify({ started_by: 'cron' })).run();
  }

  /**
   * Update retention job status
   */
  private async updateRetentionJob(
    id: string,
    status: 'completed' | 'failed',
    recordsAggregated: number,
    recordsDeleted: number,
    errorMessage?: string
  ): Promise<void> {
    await this.env.DB.prepare(`
      UPDATE data_retention_jobs 
      SET status = ?, records_aggregated = ?, records_deleted = ?, 
          completed_at = datetime('now'), error_message = ?
      WHERE id = ?
    `).bind(status, recordsAggregated, recordsDeleted, errorMessage || null, id).run();
  }

  /**
   * Update cache with retention status for monitoring
   */
  private async updateRetentionStatus(results: any[]): Promise<void> {
    const status = {
      lastRun: new Date().toISOString(),
      success: results.every(r => r.success),
      results: results
    };

    await this.env.CACHE.put('retention_status', JSON.stringify(status), {
      expirationTtl: 86400 // 24 hours
    });
  }

  /**
   * Get retention job history for monitoring
   */
  async getRetentionHistory(days = 7): Promise<RetentionJobRecord[]> {
    const result = await this.env.DB.prepare(`
      SELECT * FROM data_retention_jobs 
      WHERE started_at >= datetime('now', '-${days} days')
      ORDER BY started_at DESC
      LIMIT 50
    `).all();

    return result.results as RetentionJobRecord[];
  }

  /**
   * Manual trigger for data retention (for testing/emergency)
   */
  async manualRetention(targetDate?: string): Promise<AggregationResult> {
    const date = targetDate || new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log(`🔧 Manual retention triggered for date: ${date}`);
    
    const result = await this.runDailyRetention();
    return {
      success: result.success,
      recordsAggregated: result.results.reduce((sum, r) => sum + (r.details.recordsAggregated || 0), 0),
      recordsDeleted: result.results.reduce((sum, r) => sum + (r.details.recordsDeleted || 0), 0),
      error: result.success ? undefined : 'See results for details'
    };
  }
}