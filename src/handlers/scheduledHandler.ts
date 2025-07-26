/**
 * Scheduled Event Handler for GPUScout Platform
 * Handles cron jobs including daily data retention
 */

import { DataRetentionService } from '../services/dataRetentionService';
import { UnifiedDataCollectionService } from '../services/unifiedDataCollectionService';

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
}

/**
 * Main scheduled event handler
 */
export async function handleScheduled(event: ScheduledEvent, env: Env): Promise<void> {
  const cron = event.cron;
  const scheduledTime = new Date(event.scheduledTime);
  
  console.log(`🕐 Scheduled event triggered: ${cron} at ${scheduledTime.toISOString()}`);

  try {
    switch (cron) {
      case "0 2 * * *": // Daily data retention at 2 AM UTC
        await handleDailyRetention(env);
        break;
        
      case "*/5 * * * *": // GPU stats collection every 5 minutes
        await handleDataCollection(env, 'gpu-stats');
        break;
        
      case "*/2 * * * *": // Offers collection every 2 minutes
        await handleDataCollection(env, 'offers');
        break;
        
      case "*/30 * * * *": // Hosts collection every 30 minutes
        await handleDataCollection(env, 'hosts');
        break;
        
      case "*/1 * * * *": // Metrics collection every 1 minute
        await handleDataCollection(env, 'metrics/global');
        break;
        
      default:
        console.warn(`⚠️ Unknown cron schedule: ${cron}`);
    }
    
    console.log(`✅ Scheduled event completed: ${cron}`);
    
  } catch (error) {
    console.error(`❌ Scheduled event failed: ${cron}`, error);
    
    // Store error in cache for monitoring
    await env.CACHE.put(
      `scheduled_error_${Date.now()}`, 
      JSON.stringify({
        cron,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: scheduledTime.toISOString()
      }),
      { expirationTtl: 86400 } // Keep error logs for 24 hours
    );
    
    throw error; // Re-throw to ensure Cloudflare marks the job as failed
  }
}

/**
 * Handle data collection for specific endpoint
 */
async function handleDataCollection(env: Env, endpoint: string): Promise<void> {
  console.log(`🔄 Starting data collection for: ${endpoint}`);
  
  const collectionService = new UnifiedDataCollectionService(env);
  
  // Create a strategy for the specific endpoint
  const strategies = [
    {
      endpoint: endpoint,
      priority: 1,
      dataSource: 'primary' as const,
      frequency: getFrequencyForEndpoint(endpoint),
      processingMethod: getProcessingMethodForEndpoint(endpoint)
    }
  ];
  
  try {
    const result = await collectionService.collectMarketData(false); // Only collect due endpoints
    
    console.log(`📊 Data collection for ${endpoint} completed:`, {
      success: result.success,
      duration: `${result.duration}ms`,
      results: result.results
    });

    if (!result.success) {
      console.error(`❌ Data collection failed for ${endpoint}:`, result.results);
    }
    
  } catch (error) {
    console.error(`❌ Data collection error for ${endpoint}:`, error);
    throw error; // Re-throw to mark cron job as failed
  }
}

/**
 * Get frequency setting for endpoint
 */
function getFrequencyForEndpoint(endpoint: string): 'realtime' | 'frequent' | 'periodic' {
  switch (endpoint) {
    case 'gpu-stats': return 'frequent';
    case 'offers': return 'realtime'; 
    case 'hosts': return 'periodic';
    case 'metrics/global': return 'realtime';
    default: return 'frequent';
  }
}

/**
 * Get processing method for endpoint
 */
function getProcessingMethodForEndpoint(endpoint: string): 'direct' | 'chunked' | 'streaming' {
  switch (endpoint) {
    case 'offers': return 'chunked'; // Large dataset
    default: return 'direct';
  }
}

/**
 * Handle daily data retention job
 */
async function handleDailyRetention(env: Env): Promise<void> {
  console.log('🔄 Starting daily data retention job...');
  
  const retentionService = new DataRetentionService(env);
  const result = await retentionService.runDailyRetention();
  
  console.log(`📊 Data retention completed:`, {
    success: result.success,
    duration: `${result.duration}ms`,
    operations: result.results.length
  });

  // Log detailed results
  for (const operation of result.results) {
    if (operation.success) {
      console.log(`✅ ${operation.operation}:`, operation.details);
    } else {
      console.error(`❌ ${operation.operation} failed:`, operation.details);
    }
  }

  // Optional: Trigger data collection to refresh cache after cleanup
  if (result.success) {
    console.log('🔄 Triggering fresh data collection after retention...');
    try {
      const collectionService = new UnifiedDataCollectionService(env);
      const collectionResult = await collectionService.collectMarketData(false); // Only collect due endpoints
      
      console.log(`📈 Data collection after retention:`, {
        success: collectionResult.success,
        endpoints: collectionResult.results.length
      });
    } catch (error) {
      console.warn('⚠️ Data collection after retention failed:', error);
      // Don't fail the retention job if collection fails
    }
  }

  if (!result.success) {
    throw new Error(`Data retention job failed: ${JSON.stringify(result.results)}`);
  }
}

/**
 * Manual trigger endpoint for scheduled jobs (for testing)
 */
export async function handleManualScheduled(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const jobType = url.searchParams.get('job');
  
  if (!jobType) {
    return Response.json({
      success: false,
      error: 'Missing job parameter. Use ?job=retention'
    }, { status: 400 });
  }

  try {
    switch (jobType) {
      case 'retention':
        console.log('🔧 Manual data retention triggered');
        
        const retentionService = new DataRetentionService(env);
        const result = await retentionService.runDailyRetention();
        
        return Response.json({
          success: result.success,
          data: {
            duration: result.duration,
            operations: result.results,
            message: result.success ? 'Data retention completed successfully' : 'Data retention failed'
          }
        });
        
      case 'collection':
        console.log('🔧 Manual data collection triggered');
        
        const collectionService = new UnifiedDataCollectionService(env);
        const collectionResult = await collectionService.collectMarketData(true); // Force all endpoints
        
        return Response.json({
          success: collectionResult.success,
          data: {
            duration: collectionResult.duration,
            results: collectionResult.results,
            message: collectionResult.success ? 'Data collection completed successfully' : 'Data collection failed'
          }
        });
        
      default:
        return Response.json({
          success: false,
          error: `Unknown job type: ${jobType}. Available: retention, collection`
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error(`❌ Manual scheduled job failed: ${jobType}`, error);
    
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Get status of recent scheduled jobs
 */
export async function getScheduledJobStatus(env: Env): Promise<Response> {
  try {
    // Get retention job history
    const retentionService = new DataRetentionService(env);
    const retentionHistory = await retentionService.getRetentionHistory(7);
    
    // Get retention status from cache
    const retentionStatusCache = await env.CACHE.get('retention_status');
    const retentionStatus = retentionStatusCache ? JSON.parse(retentionStatusCache) : null;
    
    // Get any recent errors
    const errorKeys = await env.CACHE.list({ prefix: 'scheduled_error_' });
    const recentErrors = [];
    
    for (const key of errorKeys.keys.slice(0, 5)) { // Get last 5 errors
      const error = await env.CACHE.get(key.name);
      if (error) {
        recentErrors.push(JSON.parse(error));
      }
    }

    return Response.json({
      success: true,
      data: {
        retentionHistory: retentionHistory.slice(0, 10), // Last 10 jobs
        lastRetentionStatus: retentionStatus,
        recentErrors,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to get scheduled job status:', error);
    
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}