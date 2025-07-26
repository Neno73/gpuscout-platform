#!/usr/bin/env node
/**
 * Analyze unified market data and suggest chart visualizations
 * Run with: node analyze-market-data.js
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Connect to local D1 database
const dbPath = join(__dirname, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite');
const db = new Database(dbPath);

console.log('🔍 Analyzing GPUScout Market Data...\n');

// 1. Market Overview Stats
console.log('📊 === MARKET OVERVIEW ===');
const marketOverview = db.prepare(`
    SELECT 
        COUNT(DISTINCT model) as total_gpu_models,
        SUM(total_all_count) as total_gpus_tracked,
        AVG(total_all_median) as avg_median_price
    FROM gpu_market_stats
`).get();
console.log('Market Overview:', marketOverview);

// 2. Top GPUs by Market Share
console.log('\n📈 === TOP GPUS BY MARKET SHARE ===');
const topGPUs = db.prepare(`
    SELECT 
        model,
        total_all_count,
        ROUND(total_all_count * 100.0 / (SELECT SUM(total_all_count) FROM gpu_market_stats), 2) as market_share_percent,
        total_all_median as median_price,
        available_verified_count,
        vram_gb,
        dlperf
    FROM gpu_market_stats
    ORDER BY total_all_count DESC
    LIMIT 15
`).all();

console.log('Top GPUs:');
topGPUs.forEach((gpu, i) => {
    console.log(`${i+1}. ${gpu.model}: ${gpu.total_all_count} units (${gpu.market_share_percent}%) - $${gpu.median_price}/hr`);
});

// 3. Price Distribution Analysis
console.log('\n💰 === PRICE DISTRIBUTION ===');
const priceRanges = db.prepare(`
    SELECT 
        gpu_name,
        COUNT(*) as offers,
        MIN(price_base_per_hour) as min_price,
        AVG(price_base_per_hour) as avg_price,
        MAX(price_base_per_hour) as max_price,
        ROUND(MAX(price_base_per_hour) / MIN(price_base_per_hour), 2) as price_variance_ratio
    FROM gpu_marketplace_offers
    WHERE rentable = 1 AND price_base_per_hour > 0
    GROUP BY gpu_name
    HAVING offers > 10
    ORDER BY avg_price DESC
    LIMIT 10
`).all();

console.log('\nPrice Ranges by GPU:');
priceRanges.forEach(gpu => {
    console.log(`${gpu.gpu_name}: $${gpu.min_price} - $${gpu.max_price} (${gpu.price_variance_ratio}x variance)`);
});

// 4. Geographic Distribution
console.log('\n🌍 === GEOGRAPHIC DISTRIBUTION ===');
const geoStats = db.prepare(`
    SELECT 
        country,
        COUNT(DISTINCT host_id) as providers,
        COUNT(*) as total_offers,
        ROUND(AVG(price_base_per_hour), 3) as avg_price,
        ROUND(AVG(reliability_score), 2) as avg_reliability,
        SUM(num_gpus) as total_gpus
    FROM gpu_marketplace_offers
    WHERE country IS NOT NULL
    GROUP BY country
    HAVING total_offers > 50
    ORDER BY total_offers DESC
    LIMIT 15
`).all();

console.log('\nTop Countries by GPU Offers:');
geoStats.forEach((country, i) => {
    console.log(`${i+1}. ${country.country}: ${country.total_offers} offers, ${country.providers} providers, avg $${country.avg_price}/hr`);
});

// 5. Performance/Value Analysis
console.log('\n⚡ === PERFORMANCE/VALUE LEADERS ===');
const perfValue = db.prepare(`
    SELECT 
        gpu_name,
        COUNT(*) as samples,
        ROUND(AVG(dlperf), 2) as avg_dlperf,
        ROUND(AVG(dlperf_per_dollar), 2) as avg_dlperf_per_dollar,
        ROUND(AVG(price_base_per_hour), 3) as avg_price
    FROM gpu_marketplace_offers
    WHERE dlperf > 0 AND dlperf_per_dollar > 0
    GROUP BY gpu_name
    HAVING samples > 10
    ORDER BY avg_dlperf_per_dollar DESC
    LIMIT 10
`).all();

console.log('\nBest Performance per Dollar:');
perfValue.forEach((gpu, i) => {
    console.log(`${i+1}. ${gpu.gpu_name}: ${gpu.avg_dlperf_per_dollar} DLPERF/$ at avg $${gpu.avg_price}/hr`);
});

// 6. Provider Analysis
console.log('\n🏢 === PROVIDER ANALYSIS ===');
const providerStats = db.prepare(`
    SELECT 
        COUNT(*) as total_providers,
        AVG(total_machines) as avg_machines_per_provider,
        MAX(total_machines) as max_machines,
        AVG(total_tflops) as avg_tflops,
        AVG(verification_rate) as avg_verification_rate
    FROM gpu_providers
`).get();

console.log('Provider Statistics:', providerStats);

const topProviders = db.prepare(`
    SELECT 
        host_id,
        total_machines,
        total_gpus_by_model,
        total_tflops,
        country,
        ROUND(avg_reliability, 2) as reliability,
        ROUND(verification_rate, 2) as verification_rate
    FROM gpu_providers
    ORDER BY total_machines DESC
    LIMIT 5
`).all();

console.log('\nTop 5 Providers by Fleet Size:');
topProviders.forEach((provider, i) => {
    const gpuFleet = JSON.parse(provider.total_gpus_by_model || '{}');
    const fleetStr = Object.entries(gpuFleet).slice(0, 3).map(([gpu, count]) => `${gpu}: ${count}`).join(', ');
    console.log(`${i+1}. Host ${provider.host_id}: ${provider.total_machines} machines, ${fleetStr}`);
});

// 7. Availability Patterns
console.log('\n📊 === AVAILABILITY PATTERNS ===');
const availabilityStats = db.prepare(`
    SELECT 
        gpu_name,
        SUM(CASE WHEN rented = 0 THEN count ELSE 0 END) as available,
        SUM(CASE WHEN rented = 1 THEN count ELSE 0 END) as rented,
        ROUND(100.0 * SUM(CASE WHEN rented = 0 THEN count ELSE 0 END) / SUM(count), 2) as availability_rate
    FROM gpu_availability_metrics
    GROUP BY gpu_name
    HAVING SUM(count) > 50
    ORDER BY availability_rate ASC
    LIMIT 10
`).all();

console.log('\nGPUs with Lowest Availability (High Demand):');
availabilityStats.forEach((gpu, i) => {
    console.log(`${i+1}. ${gpu.gpu_name}: ${gpu.availability_rate}% available (${gpu.available}/${gpu.available + gpu.rented})`);
});

// Chart Recommendations
console.log('\n\n📊 === RECOMMENDED DASHBOARD CHARTS ===\n');

console.log('1. **Market Overview Dashboard**');
console.log('   - Donut Chart: GPU Market Share (top 10 models)');
console.log('   - Bar Chart: GPU Count by Model');
console.log('   - Heatmap: Price Distribution (verified vs unverified, rented vs available)');

console.log('\n2. **Pricing Intelligence Dashboard**');
console.log('   - Box Plot: Price Distribution by GPU Model');
console.log('   - Scatter Plot: Price vs Performance (DLPERF)');
console.log('   - Line Chart: Price Trends Over Time (when historical data accumulates)');
console.log('   - Bubble Chart: Price vs Availability vs Market Share');

console.log('\n3. **Geographic Analytics Dashboard**');
console.log('   - World Map: GPU Distribution by Country (choropleth)');
console.log('   - Bar Chart: Average Prices by Country');
console.log('   - Scatter Plot: Reliability vs Price by Location');

console.log('\n4. **Performance/Value Dashboard**');
console.log('   - Bar Chart: DLPERF per Dollar Rankings');
console.log('   - Scatter Plot: TFLOPS vs Price');
console.log('   - Radar Chart: GPU Comparison (price, performance, availability, reliability)');

console.log('\n5. **Provider Analytics Dashboard**');
console.log('   - Treemap: Provider Fleet Composition');
console.log('   - Bar Chart: Top Providers by Fleet Size');
console.log('   - Scatter Plot: Provider Reliability vs Verification Rate');

console.log('\n6. **Real-time Availability Dashboard**');
console.log('   - Stacked Bar: Available vs Rented by GPU Model');
console.log('   - Gauge Charts: Availability Rate per GPU');
console.log('   - Time Series: Availability Trends (with WebSocket updates)');

console.log('\n7. **Alert-Worthy Metrics**');
console.log('   - Price drops > 20% below median');
console.log('   - Availability spikes for high-demand GPUs');
console.log('   - New providers with large fleets');
console.log('   - Geographic arbitrage opportunities');

// Close database
db.close();

console.log('\n✅ Analysis complete!');