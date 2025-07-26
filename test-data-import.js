/**
 * Test script to verify data import from 500.farm API
 * This script simulates the data collection process
 */

// Simulate the data processing that would happen in Cloudflare Workers
async function testDataImport() {
  console.log('🔄 Testing GPU stats data import...\n');

  try {
    // Fetch real data from 500.farm
    console.log('📡 Fetching data from 500.farm API...');
    const response = await fetch('https://500.farm/vastai-exporter/gpu-stats');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Successfully fetched data`);
    console.log(`📊 Metadata:`, {
      timestamp: data.timestamp,
      url: data.url,
      totalModels: data.models?.length || 0,
      note: data.note
    });

    if (!data.models || !Array.isArray(data.models)) {
      throw new Error('Invalid data structure: missing models array');
    }

    console.log('\n🔍 Analyzing data structure...');
    
    // Analyze first few models
    const sampleModels = data.models.slice(0, 5);
    console.log('\n📋 Sample GPU models:');
    
    for (const [index, modelData] of sampleModels.entries()) {
      console.log(`\n${index + 1}. ${modelData.name}`);
      
      // Check data completeness
      const hasStats = !!(modelData.stats);
      const hasInfo = !!(modelData.info);
      const hasRentedData = !!(modelData.stats?.rented);
      const hasAvailableData = !!(modelData.stats?.available);
      const hasTotalData = !!(modelData.stats?.all);
      
      console.log(`   Stats: ${hasStats ? '✅' : '❌'}`);
      console.log(`   Info: ${hasInfo ? '✅' : '❌'}`);
      console.log(`   Rented data: ${hasRentedData ? '✅' : '❌'}`);
      console.log(`   Available data: ${hasAvailableData ? '✅' : '❌'}`);
      console.log(`   Total data: ${hasTotalData ? '✅' : '❌'}`);
      
      if (hasInfo) {
        console.log(`   VRAM: ${modelData.info.vram || 'N/A'}GB`);
        console.log(`   DL Perf: ${modelData.info.dlperf?.toFixed(2) || 'N/A'}`);
        console.log(`   TFLOPS: ${modelData.info.tflops?.toFixed(2) || 'N/A'}`);
      }
      
      if (hasRentedData && modelData.stats.rented.all?.[0]) {
        const rentedStats = modelData.stats.rented.all[0];
        console.log(`   Rented: ${rentedStats.count} units at $${rentedStats.price_median}/hr median`);
      }
      
      if (hasAvailableData && modelData.stats.available.all?.[0]) {
        const availableStats = modelData.stats.available.all[0];
        console.log(`   Available: ${availableStats.count} units at $${availableStats.price_median}/hr median`);
      }
    }

    // Test the data parsing logic
    console.log('\n🧪 Testing data parsing logic...');
    
    let processedCount = 0;
    const errors = [];
    
    for (const modelData of data.models) {
      try {
        if (!modelData.name || !modelData.stats) {
          errors.push(`Skipping model with missing name or stats: ${JSON.stringify(modelData).substring(0, 100)}...`);
          continue;
        }

        const model = modelData.name;
        const stats = modelData.stats;
        const info = modelData.info || {};

        // Helper function to extract stats from nested structure
        const getStats = (category, type) => {
          if (!category || !category[type] || !Array.isArray(category[type]) || category[type].length === 0) {
            return { count: 0, price_median: 0, price_10th_percentile: 0, price_90th_percentile: 0 };
          }
          return category[type][0];
        };

        // Extract all statistics (same logic as in the router)
        const rentedVerified = getStats(stats.rented, 'verified');
        const rentedUnverified = getStats(stats.rented, 'unverified');
        const rentedAll = getStats(stats.rented, 'all');
        
        const availableVerified = getStats(stats.available, 'verified');
        const availableUnverified = getStats(stats.available, 'unverified');
        const availableAll = getStats(stats.available, 'all');
        
        const totalVerified = getStats(stats.all, 'verified');
        const totalUnverified = getStats(stats.all, 'unverified');
        const totalAll = getStats(stats.all, 'all');

        // Simulate database record preparation
        const dbRecord = {
          model,
          rented_verified_count: rentedVerified.count || 0,
          rented_verified_median: rentedVerified.price_median || 0,
          rented_all_count: rentedAll.count || 0,
          rented_all_median: rentedAll.price_median || 0,
          available_all_count: availableAll.count || 0,
          available_all_median: availableAll.price_median || 0,
          total_all_count: totalAll.count || 0,
          total_all_median: totalAll.price_median || 0,
          vram_gb: info.vram || 0,
          dlperf: info.dlperf || 0,
          tflops: info.tflops || 0
        };

        // Validate that we have meaningful data
        if (dbRecord.total_all_count > 0 || dbRecord.rented_all_count > 0 || dbRecord.available_all_count > 0) {
          processedCount++;
        } else {
          errors.push(`Model ${model} has no meaningful data (all counts are 0)`);
        }

      } catch (error) {
        errors.push(`Error processing model: ${error.message}`);
      }
    }

    console.log(`✅ Successfully processed ${processedCount} models`);
    console.log(`⚠️  ${errors.length} errors/warnings`);
    
    if (errors.length > 0 && errors.length <= 5) {
      console.log('\n📝 Sample errors:');
      errors.slice(0, 5).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    // Summary statistics
    console.log('\n📈 Import Summary:');
    console.log(`   Total models in response: ${data.models.length}`);
    console.log(`   Successfully processable: ${processedCount} (${((processedCount / data.models.length) * 100).toFixed(1)}%)`);
    console.log(`   Data source timestamp: ${data.timestamp}`);
    console.log(`   API endpoint: ${data.url}`);

    // Check for most popular models
    const topModels = data.models
      .filter(m => m.stats?.all?.all?.[0]?.count > 0)
      .sort((a, b) => (b.stats.all.all[0].count || 0) - (a.stats.all.all[0].count || 0))
      .slice(0, 10)
      .map(m => ({
        name: m.name,
        totalCount: m.stats.all.all[0].count,
        medianPrice: m.stats.all.all[0].price_median,
        vram: m.info?.vram
      }));

    console.log('\n🏆 Top 10 most popular models:');
    topModels.forEach((model, index) => {
      console.log(`   ${index + 1}. ${model.name}: ${model.totalCount} units, $${model.medianPrice}/hr, ${model.vram || '?'}GB`);
    });

    console.log('\n✅ Data import test completed successfully!');
    return { success: true, processedCount, totalCount: data.models.length, errors: errors.length };

  } catch (error) {
    console.error('❌ Data import test failed:', error);
    return { success: false, error: error.message };
  }
}

// Run the test
testDataImport().then(result => {
  if (result.success) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});