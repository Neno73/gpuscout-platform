/**
 * Diagnostic Router for checking data collection status
 * Temporary endpoint for debugging data issues
 */

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
}

export async function handleDiagnostics(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // Check GPU providers (hosts) data
    if (path.includes('/diagnostics/hosts')) {
      const hostsCount = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM gpu_providers'
      ).first();

      const recentHosts = await env.DB.prepare(`
        SELECT host_id, country, location, total_machines, total_tflops, 
               data_timestamp, datetime(data_timestamp) as timestamp_readable
        FROM gpu_providers 
        ORDER BY data_timestamp DESC 
        LIMIT 10
      `).all();

      const countriesCount = await env.DB.prepare(`
        SELECT country, COUNT(*) as count 
        FROM gpu_providers 
        WHERE country IS NOT NULL
        GROUP BY country
        ORDER BY count DESC
      `).all();

      return new Response(JSON.stringify({
        success: true,
        data: {
          totalHosts: hostsCount?.count || 0,
          recentHosts: recentHosts.results,
          countriesDistribution: countriesCount.results,
          message: "Diagnostic data for hosts/providers"
        }
      }, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check data collection timeline
    if (path.includes('/diagnostics/timeline')) {
      // GPU stats timeline
      const gpuStatsTimeline = await env.DB.prepare(`
        SELECT 
          strftime('%Y-%m-%d %H:00', created_at) as hour,
          COUNT(*) as records,
          MIN(created_at) as first_record,
          MAX(created_at) as last_record
        FROM gpu_stats 
        WHERE created_at > datetime('now', '-24 hours')
        GROUP BY hour
        ORDER BY hour DESC
      `).all();

      // Offers timeline
      const offersTimeline = await env.DB.prepare(`
        SELECT 
          strftime('%Y-%m-%d %H:00', created_at) as hour,
          COUNT(*) as records,
          MIN(created_at) as first_record,
          MAX(created_at) as last_record
        FROM marketplace_offers 
        WHERE created_at > datetime('now', '-24 hours')
        GROUP BY hour
        ORDER BY hour DESC
      `).all();

      // Hosts timeline
      const hostsTimeline = await env.DB.prepare(`
        SELECT 
          strftime('%Y-%m-%d %H:00', data_timestamp) as hour,
          COUNT(*) as records,
          MIN(data_timestamp) as first_record,
          MAX(data_timestamp) as last_record
        FROM gpu_providers 
        WHERE data_timestamp > datetime('now', '-24 hours')
        GROUP BY hour
        ORDER BY hour DESC
      `).all();

      return new Response(JSON.stringify({
        success: true,
        data: {
          gpuStats: gpuStatsTimeline.results,
          offers: offersTimeline.results,
          hosts: hostsTimeline.results,
          currentTime: new Date().toISOString()
        }
      }, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check all tables overview
    if (path.includes('/diagnostics/overview')) {
      const tables = ['gpu_stats', 'marketplace_offers', 'gpu_providers', 'real_time_metrics'];
      const overview = {};

      for (const table of tables) {
        const count = await env.DB.prepare(`SELECT COUNT(*) as count FROM ${table}`).first();
        const latest = await env.DB.prepare(`
          SELECT MAX(${table === 'gpu_providers' ? 'data_timestamp' : 'created_at'}) as latest 
          FROM ${table}
        `).first();
        
        overview[table] = {
          totalRecords: count?.count || 0,
          latestRecord: latest?.latest || 'No data',
          minutesSinceLastUpdate: latest?.latest ? 
            Math.floor((Date.now() - new Date(latest.latest).getTime()) / 60000) : null
        };
      }

      return new Response(JSON.stringify({
        success: true,
        data: overview,
        currentTime: new Date().toISOString()
      }, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      endpoints: [
        '/api/diagnostics/overview',
        '/api/diagnostics/hosts',
        '/api/diagnostics/timeline'
      ]
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}