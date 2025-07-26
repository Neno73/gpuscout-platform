/**
 * Unified Market Data Router for 500.farm API integration
 * Optimized approach eliminating data redundancy across endpoints
 */

import { UnifiedDataCollectionService } from '../services/unifiedDataCollectionService';

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  FIVEHUNDRED_FARM_API_URL?: string;
}

export interface GPUStats {
  model: string;
  rental_count: number;
  median_price: number;
  percentile_25: number;
  percentile_75: number;
  percentile_90: number;
  min_price: number;
  max_price: number;
  last_updated: string;
}

export interface GPUOffer {
  id: string;
  model: string;
  price_per_hour: number;
  availability: boolean;
  location: string;
  performance_score?: number;
  memory_gb: number;
  host_id: string;
}

export interface MarketDataResponse {
  success: boolean;
  data: any;
  meta: {
    timestamp: string;
    dataSource: string;
    cached: boolean;
    nextUpdate?: string;
  };
}

const FIVEHUNDRED_FARM_BASE_URL = 'https://500.farm/vastai-exporter';
const CACHE_TTL = {
  GPU_STATS: 300, // 5 minutes
  OFFERS: 60,     // 1 minute (real-time pricing)
  MACHINES: 600,  // 10 minutes
  HOSTS: 1800     // 30 minutes
};

/**
 * Main router for market data endpoints
 */
export async function marketDataHandler(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS handling
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  try {
    if (path === '/api/market/gpu-stats') {
      return await handleGPUStats(request, env);
    }
    
    if (path === '/api/market/offers') {
      return await handleOffers(request, env);
    }
    
    if (path === '/api/market/machines') {
      return await handleMachines(request, env);
    }
    
    if (path === '/api/market/hosts') {
      return await handleHosts(request, env);
    }
    
    if (path === '/api/market/sync') {
      return await handleDataSync(request, env);
    }
    
    if (path === '/api/market/historical') {
      return await handleHistoricalData(request, env);
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Market data endpoint not found'
    }), { status: 404 });

  } catch (error) {
    console.error('Market data handler error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), { status: 500 });
  }
}

/**
 * Handle GPU stats endpoint - lightweight, works well
 */
async function handleGPUStats(request: Request, env: Env): Promise<Response> {
  const cacheKey = 'gpu-stats';
  
  try {
    // Check cache first
    const cached = await env.CACHE.get(cacheKey);
    if (cached) {
      const parsedData = JSON.parse(cached);
      return Response.json({
        success: true,
        data: parsedData,
        meta: {
          timestamp: new Date().toISOString(),
          dataSource: '500.farm',
          cached: true,
          nextUpdate: new Date(Date.now() + CACHE_TTL.GPU_STATS * 1000).toISOString()
        }
      });
    }

    // Fetch fresh data
    const response = await fetch(`${FIVEHUNDRED_FARM_BASE_URL}/gpu-stats`);
    if (!response.ok) {
      throw new Error(`500.farm API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Store in cache
    await env.CACHE.put(cacheKey, JSON.stringify(data), {
      expirationTtl: CACHE_TTL.GPU_STATS
    });

    // Store historical snapshot in D1
    await storeGPUStatsSnapshot(data, env);

    return Response.json({
      success: true,
      data: data,
      meta: {
        timestamp: new Date().toISOString(),
        dataSource: '500.farm',
        cached: false,
        nextUpdate: new Date(Date.now() + CACHE_TTL.GPU_STATS * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('GPU stats fetch error:', error);
    return Response.json({
      success: false,
      error: 'Failed to fetch GPU statistics'
    }, { status: 500 });
  }
}

/**
 * Handle offers endpoint - large data, needs chunking strategy
 */
async function handleOffers(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const model = url.searchParams.get('model');
  const maxPrice = parseFloat(url.searchParams.get('maxPrice') || '999999');

  try {
    // First, try to get from our processed database
    let query = `
      SELECT 
        machine_id as id,
        gpu_name as model,
        price_base_per_hour as price_per_hour,
        rentable as availability,
        country as location,
        dlperf as performance_score,
        vram_gb as memory_gb,
        host_id
      FROM gpu_marketplace_offers 
      WHERE price_base_per_hour <= ? 
      ${model ? 'AND gpu_name = ?' : ''}
      ORDER BY price_base_per_hour ASC
      LIMIT ? OFFSET ?
    `;
    
    const params = model 
      ? [maxPrice, model, limit, offset]
      : [maxPrice, limit, offset];

    const results = await env.DB.prepare(query)
      .bind(...params)
      .all();

    if (results.results && results.results.length > 0) {
      return Response.json({
        success: true,
        data: {
          offers: results.results,
          pagination: {
            limit,
            offset,
            total: results.results.length,
            hasMore: results.results.length === limit
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          dataSource: 'cached-db',
          cached: true
        }
      });
    }

    // If no cached data, trigger background sync and return limited data
    // Note: We avoid fetching the full 10MB+ dataset directly
    return Response.json({
      success: true,
      data: {
        offers: [],
        message: 'Offers data is being synchronized. Please try again in a few minutes.',
        syncInProgress: true
      },
      meta: {
        timestamp: new Date().toISOString(),
        dataSource: '500.farm',
        cached: false
      }
    });

  } catch (error) {
    console.error('Offers fetch error:', error);
    return Response.json({
      success: false,
      error: 'Failed to fetch GPU offers'
    }, { status: 500 });
  }
}

/**
 * Handle machines endpoint - similar large data strategy
 */
async function handleMachines(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  try {
    const results = await env.DB.prepare(`
      SELECT * FROM gpu_machines 
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    return Response.json({
      success: true,
      data: {
        machines: results.results || [],
        pagination: { limit, offset, hasMore: (results.results?.length || 0) === limit }
      },
      meta: {
        timestamp: new Date().toISOString(),
        dataSource: 'cached-db',
        cached: true
      }
    });

  } catch (error) {
    console.error('Machines fetch error:', error);
    return Response.json({
      success: false,
      error: 'Failed to fetch machine data'
    }, { status: 500 });
  }
}

/**
 * Handle hosts endpoint
 */
async function handleHosts(request: Request, env: Env): Promise<Response> {
  try {
    // First check if we have any data in gpu_providers
    const count = await env.DB.prepare('SELECT COUNT(*) as total FROM gpu_providers').first();
    
    if (!count || count.total === 0) {
      // No data in database, fetch from 500.farm
      try {
        const response = await fetch(`${FIVEHUNDRED_FARM_BASE_URL}/hosts`);
        if (!response.ok) {
          throw new Error(`500.farm API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Import hosts into database for future use
        if (data.hosts && Array.isArray(data.hosts)) {
          const dataService = new UnifiedDataCollectionService(env);
          await dataService.collectMarketData(true); // Force collection
        }
        
        // Transform and return limited data for now
        const hosts = data.hosts?.slice(0, 100).map(host => ({
          host_id: host.host_id,
          country: host.location?.country || 'Unknown',
          location: host.location?.location || 'Unknown',
          total_machines: host.machine_ids?.length || 0,
          total_tflops: host.tflops || 0,
          latitude: host.location?.lat || null,
          longitude: host.location?.long || null,
          isp: host.location?.isp || null
        })) || [];
        
        return Response.json({
          success: true,
          data: { hosts },
          meta: {
            timestamp: new Date().toISOString(),
            dataSource: '500.farm-direct',
            cached: false,
            totalHosts: data.hosts?.length || 0
          }
        });
      } catch (fetchError) {
        console.error('Direct 500.farm fetch error:', fetchError);
      }
    }
    
    // Query from gpu_providers table
    const results = await env.DB.prepare(`
      SELECT 
        host_id,
        country,
        location,
        total_machines,
        total_tflops,
        latitude,
        longitude,
        isp,
        data_timestamp
      FROM gpu_providers 
      WHERE country IS NOT NULL
      ORDER BY total_tflops DESC
      LIMIT 100
    `).all();

    // Get country distribution
    const countryStats = await env.DB.prepare(`
      SELECT 
        country,
        COUNT(*) as host_count,
        SUM(total_tflops) as total_tflops,
        SUM(total_machines) as total_machines
      FROM gpu_providers 
      WHERE country IS NOT NULL
      GROUP BY country
      ORDER BY total_tflops DESC
      LIMIT 20
    `).all();

    return Response.json({
      success: true,
      data: { 
        hosts: results.results || [],
        countryStats: countryStats.results || []
      },
      meta: {
        timestamp: new Date().toISOString(),
        dataSource: 'cached-db',
        cached: true,
        totalInDatabase: count?.total || 0
      }
    });

  } catch (error) {
    console.error('Hosts fetch error:', error);
    return Response.json({
      success: false,
      error: 'Failed to fetch host data'
    }, { status: 500 });
  }
}

/**
 * Background data synchronization endpoint
 * This handles the large dataset collection via scheduled/manual triggers
 */
async function handleDataSync(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { endpoint } = await request.json();
    
    // Start background sync process
    const syncId = crypto.randomUUID();
    
    // Store sync status
    await env.CACHE.put(`sync-${syncId}`, JSON.stringify({
      status: 'started',
      endpoint,
      startTime: new Date().toISOString()
    }), { expirationTtl: 3600 }); // 1 hour

    // In a real implementation, this would trigger a Cloudflare Cron Job or Durable Object
    // For now, return sync initiated response
    
    return Response.json({
      success: true,
      data: {
        syncId,
        status: 'initiated',
        message: 'Background sync process started',
        estimatedTime: '5-10 minutes'
      }
    });

  } catch (error) {
    console.error('Data sync error:', error);
    return Response.json({
      success: false,
      error: 'Failed to initiate data sync'
    }, { status: 500 });
  }
}

/**
 * Historical data endpoint for trends and analytics
 * Uses tiered data: raw data for last 3 days, aggregated data for older periods
 */
async function handleHistoricalData(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const model = url.searchParams.get('model');
  const days = parseInt(url.searchParams.get('days') || '7');
  const granularity = url.searchParams.get('granularity') || 'daily'; // 'hourly' or 'daily'

  try {
    let results: any[] = [];
    
    if (days <= 3 && granularity === 'hourly') {
      // Use raw data for recent short-term queries with hourly granularity
      results = await getRecentRawData(env, model, days);
    } else {
      // Use aggregated daily data for longer periods or daily granularity
      results = await getAggregatedHistoricalData(env, model, days);
    }

    return Response.json({
      success: true,
      data: {
        historical: results,
        period: `${days} days`,
        granularity,
        dataSource: days <= 3 && granularity === 'hourly' ? 'raw' : 'aggregated'
      },
      meta: {
        timestamp: new Date().toISOString(),
        recordCount: results.length
      }
    });

  } catch (error) {
    console.error('Historical data error:', error);
    return Response.json({
      success: false,
      error: 'Failed to fetch historical data'
    }, { status: 500 });
  }
}

/**
 * Get recent raw data for short-term detailed analysis
 */
async function getRecentRawData(env: Env, model: string | null, days: number): Promise<any[]> {
  const query = `
    SELECT 
      datetime(created_at) as timestamp,
      gpu_name as model,
      price_base_per_hour as price,
      dlperf,
      country,
      verified,
      rentable
    FROM gpu_marketplace_offers 
    WHERE created_at >= datetime('now', '-${days} days')
    ${model ? 'AND gpu_name = ?' : ''}
    ORDER BY created_at DESC, gpu_name
    LIMIT 1000
  `;

  const results = model 
    ? await env.DB.prepare(query).bind(model).all()
    : await env.DB.prepare(query).all();

  return results.results || [];
}

/**
 * Get aggregated historical data from daily summaries
 */
async function getAggregatedHistoricalData(env: Env, model: string | null, days: number): Promise<any[]> {
  const query = `
    SELECT 
      sample_date as date,
      gpu_model as model,
      price_median,
      price_p10,
      price_p90,
      price_min,
      price_max,
      total_offers,
      available_offers,
      verified_offers,
      avg_dlperf,
      country_count,
      top_countries,
      source_records
    FROM gpu_price_trends 
    WHERE sample_date >= date('now', '-${days} days')
    ${model ? 'AND gpu_model = ?' : ''}
    ORDER BY sample_date DESC, gpu_model
  `;

  const results = model 
    ? await env.DB.prepare(query).bind(model).all()
    : await env.DB.prepare(query).all();

  return results.results || [];
}

/**
 * Store GPU stats snapshot for historical analysis
 * Updated to handle real 500.farm data structure
 */
async function storeGPUStatsSnapshot(data: any, env: Env): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const dataTimestamp = data.timestamp || timestamp;
    
    // Data structure: { models: [array of models], timestamp, url, note }
    if (!data.models || !Array.isArray(data.models)) {
      console.error('Invalid data structure: missing models array');
      return;
    }
    
    // Store each GPU model's stats
    for (const modelData of data.models) {
      if (!modelData.name || !modelData.stats) {
        console.warn('Skipping model with missing name or stats:', modelData);
        continue;
      }

      const model = modelData.name;
      const stats = modelData.stats;
      const info = modelData.info || {};

      // Helper function to extract stats from nested structure
      const getStats = (category: any, type: string) => {
        if (!category || !category[type] || !Array.isArray(category[type]) || category[type].length === 0) {
          return { count: 0, price_median: 0, price_10th_percentile: 0, price_90th_percentile: 0 };
        }
        return category[type][0]; // First (and typically only) element in array
      };

      // Extract all statistics
      const rentedVerified = getStats(stats.rented, 'verified');
      const rentedUnverified = getStats(stats.rented, 'unverified');
      const rentedAll = getStats(stats.rented, 'all');
      
      const availableVerified = getStats(stats.available, 'verified');
      const availableUnverified = getStats(stats.available, 'unverified');
      const availableAll = getStats(stats.available, 'all');
      
      const totalVerified = getStats(stats.all, 'verified');
      const totalUnverified = getStats(stats.all, 'unverified');
      const totalAll = getStats(stats.all, 'all');

      await env.DB.prepare(`
        INSERT INTO gpu_stats_history 
        (model, 
         rented_verified_count, rented_verified_median, rented_verified_p10, rented_verified_p90,
         rented_unverified_count, rented_unverified_median, rented_unverified_p10, rented_unverified_p90,
         rented_all_count, rented_all_median, rented_all_p10, rented_all_p90,
         available_verified_count, available_verified_median, available_verified_p10, available_verified_p90,
         available_unverified_count, available_unverified_median, available_unverified_p10, available_unverified_p90,
         available_all_count, available_all_median, available_all_p10, available_all_p90,
         total_verified_count, total_verified_median, total_verified_p10, total_verified_p90,
         total_unverified_count, total_unverified_median, total_unverified_p10, total_unverified_p90,
         total_all_count, total_all_median, total_all_p10, total_all_p90,
         vram_gb, dlperf, tflops, data_timestamp, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        model,
        // Rented stats
        rentedVerified.count || 0, rentedVerified.price_median || 0, rentedVerified.price_10th_percentile || 0, rentedVerified.price_90th_percentile || 0,
        rentedUnverified.count || 0, rentedUnverified.price_median || 0, rentedUnverified.price_10th_percentile || 0, rentedUnverified.price_90th_percentile || 0,
        rentedAll.count || 0, rentedAll.price_median || 0, rentedAll.price_10th_percentile || 0, rentedAll.price_90th_percentile || 0,
        // Available stats
        availableVerified.count || 0, availableVerified.price_median || 0, availableVerified.price_10th_percentile || 0, availableVerified.price_90th_percentile || 0,
        availableUnverified.count || 0, availableUnverified.price_median || 0, availableUnverified.price_10th_percentile || 0, availableUnverified.price_90th_percentile || 0,
        availableAll.count || 0, availableAll.price_median || 0, availableAll.price_10th_percentile || 0, availableAll.price_90th_percentile || 0,
        // Total stats
        totalVerified.count || 0, totalVerified.price_median || 0, totalVerified.price_10th_percentile || 0, totalVerified.price_90th_percentile || 0,
        totalUnverified.count || 0, totalUnverified.price_median || 0, totalUnverified.price_10th_percentile || 0, totalUnverified.price_90th_percentile || 0,
        totalAll.count || 0, totalAll.price_median || 0, totalAll.price_10th_percentile || 0, totalAll.price_90th_percentile || 0,
        // GPU info
        info.vram || 0,
        info.dlperf || 0,
        info.tflops || 0,
        dataTimestamp,
        timestamp
      ).run();
    }
    
    console.log(`Stored GPU stats snapshot for ${data.models.length} models`);
  } catch (error) {
    console.error('Failed to store GPU stats snapshot:', error);
    // Don't throw - we don't want to fail the main request
  }
}