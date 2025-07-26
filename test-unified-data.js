import { D1Database } from '@cloudflare/workers-types';

// Test script to retrieve sample data from all unified market data tables
export async function testUnifiedData(env) {
    const results = {};
    
    try {
        // 1. GPU Market Statistics - Top 10 GPUs by availability
        console.log('\n=== GPU MARKET STATISTICS ===');
        const marketStats = await env.DB.prepare(`
            SELECT 
                model,
                total_all_count,
                total_all_median,
                total_all_p10,
                total_all_p90,
                available_verified_count,
                available_verified_median,
                rented_verified_count,
                rented_verified_median,
                vram_gb,
                dlperf,
                tflops,
                data_timestamp
            FROM gpu_market_stats
            ORDER BY total_all_count DESC
            LIMIT 10
        `).all();
        
        results.marketStats = marketStats.results;
        console.log(`Found ${marketStats.results.length} GPU models`);
        console.log('Sample:', JSON.stringify(marketStats.results[0], null, 2));
        
        // 2. GPU Providers - Top providers by fleet size
        console.log('\n=== GPU PROVIDERS ===');
        const providers = await env.DB.prepare(`
            SELECT 
                host_id,
                total_machines,
                total_gpus_by_model,
                total_tflops,
                country,
                location,
                latitude,
                longitude,
                avg_reliability,
                verification_rate,
                price_competitiveness,
                inet_up_mbps,
                inet_down_mbps
            FROM gpu_providers
            ORDER BY total_machines DESC
            LIMIT 10
        `).all();
        
        results.providers = providers.results;
        console.log(`Found ${providers.results.length} providers`);
        console.log('Sample:', JSON.stringify(providers.results[0], null, 2));
        
        // 3. GPU Marketplace Offers - Price distribution by GPU
        console.log('\n=== MARKETPLACE OFFERS ===');
        const offers = await env.DB.prepare(`
            SELECT 
                gpu_name,
                COUNT(*) as offer_count,
                AVG(price_base_per_hour) as avg_price,
                MIN(price_base_per_hour) as min_price,
                MAX(price_base_per_hour) as max_price,
                AVG(dlperf_per_dollar) as avg_dlperf_per_dollar,
                AVG(reliability_score) as avg_reliability
            FROM gpu_marketplace_offers
            WHERE rentable = 1
            GROUP BY gpu_name
            ORDER BY offer_count DESC
            LIMIT 15
        `).all();
        
        results.offersByGPU = offers.results;
        console.log(`Found offers for ${offers.results.length} GPU models`);
        console.log('Sample:', JSON.stringify(offers.results[0], null, 2));
        
        // Get a few individual offers for detail
        const sampleOffers = await env.DB.prepare(`
            SELECT 
                offer_id,
                gpu_name,
                num_gpus,
                price_base_per_hour,
                dlperf,
                dlperf_per_dollar,
                cpu_name,
                cpu_ram_mb,
                storage_gb,
                country,
                location,
                reliability_score,
                verified
            FROM gpu_marketplace_offers
            WHERE gpu_name = 'RTX 4090'
            ORDER BY price_base_per_hour ASC
            LIMIT 5
        `).all();
        
        results.sampleOffers = sampleOffers.results;
        console.log('\nSample RTX 4090 offers:', JSON.stringify(sampleOffers.results, null, 2));
        
        // 4. Real-time Availability Metrics
        console.log('\n=== AVAILABILITY METRICS ===');
        const availability = await env.DB.prepare(`
            SELECT 
                gpu_name,
                SUM(CASE WHEN rented = 0 THEN count ELSE 0 END) as available_count,
                SUM(CASE WHEN rented = 1 THEN count ELSE 0 END) as rented_count,
                SUM(count) as total_count,
                ROUND(CAST(SUM(CASE WHEN rented = 0 THEN count ELSE 0 END) AS FLOAT) / SUM(count) * 100, 2) as availability_rate,
                MAX(collected_at) as last_update
            FROM gpu_availability_metrics
            GROUP BY gpu_name
            ORDER BY total_count DESC
            LIMIT 10
        `).all();
        
        results.availability = availability.results;
        console.log(`Found availability for ${availability.results.length} GPU models`);
        console.log('Sample:', JSON.stringify(availability.results[0], null, 2));
        
        // 5. Price Trends (if any historical data exists)
        console.log('\n=== PRICE TRENDS ===');
        const trends = await env.DB.prepare(`
            SELECT 
                gpu_model,
                COUNT(*) as data_points,
                MIN(price_median) as min_median_price,
                MAX(price_median) as max_median_price,
                AVG(price_median) as avg_median_price,
                MIN(sample_date) as earliest_date,
                MAX(sample_date) as latest_date
            FROM gpu_price_trends
            GROUP BY gpu_model
            ORDER BY data_points DESC
            LIMIT 10
        `).all();
        
        results.trends = trends.results;
        console.log(`Found trends for ${trends.results.length} GPU models`);
        if (trends.results.length > 0) {
            console.log('Sample:', JSON.stringify(trends.results[0], null, 2));
        }
        
        // 6. Geographic Distribution
        console.log('\n=== GEOGRAPHIC DISTRIBUTION ===');
        const geographic = await env.DB.prepare(`
            SELECT 
                country,
                COUNT(DISTINCT host_id) as provider_count,
                COUNT(*) as offer_count,
                AVG(price_base_per_hour) as avg_price,
                AVG(reliability_score) as avg_reliability
            FROM gpu_marketplace_offers
            WHERE country IS NOT NULL
            GROUP BY country
            ORDER BY offer_count DESC
            LIMIT 15
        `).all();
        
        results.geographic = geographic.results;
        console.log(`Found data for ${geographic.results.length} countries`);
        console.log('Sample:', JSON.stringify(geographic.results[0], null, 2));
        
        // 7. Performance Leaders
        console.log('\n=== PERFORMANCE LEADERS ===');
        const performance = await env.DB.prepare(`
            SELECT 
                gpu_name,
                MAX(dlperf) as max_dlperf,
                MAX(total_flops) as max_flops,
                AVG(dlperf_per_dollar) as avg_dlperf_per_dollar,
                COUNT(*) as offer_count
            FROM gpu_marketplace_offers
            WHERE dlperf > 0
            GROUP BY gpu_name
            ORDER BY max_dlperf DESC
            LIMIT 10
        `).all();
        
        results.performance = performance.results;
        console.log(`Found performance data for ${performance.results.length} GPUs`);
        console.log('Sample:', JSON.stringify(performance.results[0], null, 2));
        
        return {
            success: true,
            summary: {
                marketStatsCount: marketStats.results.length,
                providersCount: providers.results.length,
                totalOffers: offers.results.reduce((sum, o) => sum + o.offer_count, 0),
                gpuModelsWithOffers: offers.results.length,
                countriesRepresented: geographic.results.length
            },
            data: results
        };
        
    } catch (error) {
        console.error('Error testing unified data:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Export handler for Cloudflare Worker
export default {
    async fetch(request, env) {
        const result = await testUnifiedData(env);
        
        return new Response(JSON.stringify(result, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
};