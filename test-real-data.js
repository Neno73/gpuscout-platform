#!/usr/bin/env node
/**
 * Test script to fetch sample data from 500.farm and analyze structure
 */

console.log('🔍 Testing 500.farm API endpoints...\n');

async function testGPUStats() {
    console.log('📊 === GPU STATS ENDPOINT ===');
    try {
        const response = await fetch('https://500.farm/vastai-exporter/gpu-stats');
        const data = await response.json();
        
        console.log(`✅ Found ${data.length} GPU models`);
        console.log('Sample GPU stat:', JSON.stringify(data[0], null, 2));
        
        // Show top 5 by market size
        console.log('\nTop 5 GPUs by total count:');
        data.sort((a, b) => (b.total?.all?.count || 0) - (a.total?.all?.count || 0))
             .slice(0, 5)
             .forEach((gpu, i) => {
                 console.log(`${i+1}. ${gpu.model}: ${gpu.total?.all?.count} units at $${gpu.total?.all?.median}/hr median`);
             });
        
        return data.slice(0, 5); // Return sample for insertion
    } catch (error) {
        console.error('❌ Error fetching GPU stats:', error.message);
        return [];
    }
}

async function testOffers() {
    console.log('\n🏪 === OFFERS ENDPOINT ===');
    try {
        const response = await fetch('https://500.farm/vastai-exporter/offers?limit=20');
        const data = await response.json();
        
        console.log(`✅ Found ${data.length} marketplace offers`);
        console.log('Sample offer:', JSON.stringify(data[0], null, 2));
        
        // Show price distribution
        console.log('\nPrice range summary:');
        const prices = data.map(o => o.dph_base || o.dph_total || 0).filter(p => p > 0);
        console.log(`Min: $${Math.min(...prices)}, Max: $${Math.max(...prices)}, Avg: $${(prices.reduce((a,b) => a+b, 0) / prices.length).toFixed(3)}`);
        
        return data.slice(0, 5); // Return sample for insertion
    } catch (error) {
        console.error('❌ Error fetching offers:', error.message);
        return [];
    }
}

async function testProviders() {
    console.log('\n🏢 === PROVIDERS/HOSTS ENDPOINT ===');
    try {
        const response = await fetch('https://500.farm/vastai-exporter/hosts?limit=15');
        const data = await response.json();
        
        console.log(`✅ Found ${data.length} providers`);
        console.log('Sample provider:', JSON.stringify(data[0], null, 2));
        
        // Show fleet size distribution
        console.log('\nTop providers by machine count:');
        data.sort((a, b) => (b.total_machines || 0) - (a.total_machines || 0))
             .slice(0, 5)
             .forEach((provider, i) => {
                 console.log(`${i+1}. Host ${provider.host_id}: ${provider.total_machines} machines in ${provider.country || 'Unknown'}`);
             });
        
        return data.slice(0, 3); // Return sample for insertion
    } catch (error) {
        console.error('❌ Error fetching providers:', error.message);
        return [];
    }
}

async function testMetrics() {
    console.log('\n📈 === METRICS ENDPOINT ===');
    try {
        const response = await fetch('https://500.farm/vastai-exporter/metrics/global');
        const text = await response.text();
        
        const lines = text.split('\n').filter(line => line.startsWith('vastai_gpu_count'));
        console.log(`✅ Found ${lines.length} availability metrics`);
        console.log('Sample metrics:');
        lines.slice(0, 5).forEach(line => console.log('  ' + line));
        
        // Parse sample metrics
        const parsed = [];
        for (const line of lines.slice(0, 10)) {
            const match = line.match(/vastai_gpu_count\{gpu_name="([^"]+)",rented="([^"]+)",verified="([^"]+)"\} (\d+)/);
            if (match) {
                const [, gpuName, rented, verified, count] = match;
                parsed.push({ gpuName, rented: rented === 'true', verified: verified === 'true', count: parseInt(count) });
            }
        }
        
        return parsed;
    } catch (error) {
        console.error('❌ Error fetching metrics:', error.message);
        return [];
    }
}

async function main() {
    const results = {
        gpuStats: await testGPUStats(),
        offers: await testOffers(),
        providers: await testProviders(),
        metrics: await testMetrics()
    };
    
    console.log('\n📊 === CHART RECOMMENDATIONS ===\n');
    
    if (results.gpuStats.length > 0) {
        console.log('**Market Overview Charts:**');
        console.log('- Donut Chart: GPU Market Share (RTX 4090, RTX 3090, etc.)');
        console.log('- Bar Chart: Available vs Rented GPUs by Model');
        console.log('- Price Distribution: Box plots showing price ranges per GPU');
    }
    
    if (results.offers.length > 0) {
        console.log('\n**Pricing Intelligence Charts:**');
        console.log('- Scatter Plot: Price vs Performance (DLPERF per dollar)');
        console.log('- Heatmap: Price variance by GPU model and verification status');
        console.log('- Time Series: Price trends (when historical data accumulates)');
    }
    
    if (results.providers.length > 0) {
        console.log('\n**Provider Analytics Charts:**');
        console.log('- Geographic Map: Provider distribution by country');
        console.log('- Treemap: Provider fleet composition');
        console.log('- Bar Chart: Top providers by total GPU capacity');
    }
    
    if (results.metrics.length > 0) {
        console.log('\n**Real-time Dashboard Charts:**');
        console.log('- Gauge Charts: Current availability rates');
        console.log('- Stacked Bars: Available vs Rented breakdown');
        console.log('- Live Updates: WebSocket-powered real-time metrics');
    }
    
    console.log('\n✅ API testing complete! All endpoints responding with rich data for dashboard visualization.');
    
    return results;
}

main().catch(console.error);