# Test Specification: Market Intelligence & Pricing

## Test Configuration
```yaml
framework: jest
environment: jsdom
coverage: 90%
testcontainers:
  - cloudflare-d1-local
  - redis:7-alpine
mcp_tools:
  - playwright: e2e testing
  - grafana: performance metrics
  - datadog: APM traces
  - sentry: error tracking
  - firecrawl: external API testing
timeout: 30000
external_services:
  - 500_farm_api: mock_service
```

## Unit Tests

### TEST-001: Market Data Collection and Validation
```javascript
describe('Market Data Collection and Validation', () => {
  let marketDataCollector;
  let mock500FarmAPI;
  
  beforeEach(() => {
    mock500FarmAPI = {
      fetchMachineData: jest.fn(),
      checkApiHealth: jest.fn().mockResolvedValue(true)
    };
    
    marketDataCollector = new MarketDataCollector(mock500FarmAPI);
  });
  
  test('fetches and validates 500.farm market data', async () => {
    const mockApiResponse = {
      machines: [
        {
          id: "vastai-1",
          gpu_name: "RTX 4090",
          num_gpus: 1,
          cpu_cores: 16,
          cpu_ram: 64000,
          price_per_hour: 0.45,
          status: "available",
          location: "US-East",
          utilization: 85.7,
          last_seen: "2024-01-15T10:30:00Z"
        },
        {
          id: "vastai-2",
          gpu_name: "RTX 3080",
          num_gpus: 2,
          cpu_cores: 12,
          cpu_ram: 32000,
          price_per_hour: 0.28,
          status: "rented",
          location: "US-West",
          utilization: 92.3,
          last_seen: "2024-01-15T10:25:00Z"
        }
      ],
      timestamp: "2024-01-15T10:30:00Z",
      total_machines: 2
    };
    
    mock500FarmAPI.fetchMachineData.mockResolvedValue(mockApiResponse);
    
    const result = await marketDataCollector.collectMarketData();
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toMatchObject({
      sourceId: "vastai-1",
      gpuModel: "RTX 4090",
      pricePerHour: 0.45,
      isAvailable: true,
      location: "US-East",
      utilization: 85.7,
      collectedAt: expect.any(String)
    });
    
    expect(result.metadata).toMatchObject({
      source: "500.farm",
      totalMachines: 2,
      availableMachines: 1,
      averagePrice: expect.any(Number)
    });
  });
  
  test('handles API failures with retries and fallbacks', async () => {
    // First two calls fail, third succeeds
    mock500FarmAPI.fetchMachineData
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockRejectedValueOnce(new Error('API rate limit'))
      .mockResolvedValueOnce({
        machines: [{ id: "test", gpu_name: "RTX 4090", price_per_hour: 0.50 }],
        timestamp: new Date().toISOString()
      });
    
    const result = await marketDataCollector.collectMarketData({ 
      maxRetries: 3,
      retryDelay: 100 
    });
    
    expect(result.success).toBe(true);
    expect(result.retryCount).toBe(2);
    expect(mock500FarmAPI.fetchMachineData).toHaveBeenCalledTimes(3);
  });
  
  test('validates data quality and filters invalid entries', async () => {
    const invalidApiResponse = {
      machines: [
        {
          id: "valid-1",
          gpu_name: "RTX 4090",
          price_per_hour: 0.45,
          status: "available"
        },
        {
          id: "invalid-1",
          gpu_name: "", // Invalid: empty GPU name
          price_per_hour: 0.30,
          status: "available"
        },
        {
          id: "invalid-2",
          gpu_name: "RTX 3080",
          price_per_hour: -0.10, // Invalid: negative price
          status: "available"
        },
        {
          id: "invalid-3",
          gpu_name: "RTX 4090",
          price_per_hour: 100.00, // Invalid: unrealistic price
          status: "available"
        }
      ],
      timestamp: new Date().toISOString()
    };
    
    mock500FarmAPI.fetchMachineData.mockResolvedValue(invalidApiResponse);
    
    const result = await marketDataCollector.collectMarketData();
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1); // Only valid entry
    expect(result.validationErrors).toHaveLength(3);
    expect(result.validationErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "invalid-1",
          error: "Empty GPU name"
        }),
        expect.objectContaining({
          id: "invalid-2", 
          error: "Invalid price: -0.10"
        }),
        expect.objectContaining({
          id: "invalid-3",
          error: "Price too high: 100.00"
        })
      ])
    );
  });
  
  test('normalizes GPU model names for consistency', () => {
    const rawGpuNames = [
      'NVIDIA GeForce RTX 4090',
      'RTX4090',
      'GeForce RTX 4090',
      'RTX 4090 24GB',
      'nvidia rtx 4090'
    ];
    
    rawGpuNames.forEach(name => {
      const normalized = marketDataCollector.normalizeGpuName(name);
      expect(normalized).toBe('RTX 4090');
    });
    
    const edgeCases = [
      { input: 'RTX 3080 Ti', expected: 'RTX 3080 Ti' },
      { input: 'A100 80GB PCIe', expected: 'A100' },
      { input: 'Tesla V100', expected: 'V100' }
    ];
    
    edgeCases.forEach(({ input, expected }) => {
      expect(marketDataCollector.normalizeGpuName(input)).toBe(expected);
    });
  });
  
  test('calculates market statistics and trends', async () => {
    const historicalData = [
      { gpuModel: 'RTX 4090', pricePerHour: 0.42, timestamp: new Date(Date.now() - 86400000) }, // 1 day ago
      { gpuModel: 'RTX 4090', pricePerHour: 0.44, timestamp: new Date(Date.now() - 43200000) }, // 12 hours ago
      { gpuModel: 'RTX 4090', pricePerHour: 0.46, timestamp: new Date() }
    ];
    
    const stats = marketDataCollector.calculateMarketStatistics(historicalData);
    
    expect(stats).toMatchObject({
      gpuModel: 'RTX 4090',
      currentPrice: 0.46,
      averagePrice: 0.44, // (0.42 + 0.44 + 0.46) / 3
      minPrice: 0.42,
      maxPrice: 0.46,
      priceChange24h: 0.04, // 0.46 - 0.42
      priceChangePercent24h: expect.closeTo(9.52, 1), // (0.04 / 0.42) * 100
      trend: 'increasing',
      volatility: expect.any(Number),
      dataPoints: 3
    });
    
    expect(stats.volatility).toBeGreaterThan(0);
    expect(stats.volatility).toBeLessThan(1);
  });
});
```

### TEST-002: Pricing Intelligence and Recommendations
```javascript
describe('Pricing Intelligence and Recommendations', () => {
  let pricingEngine;
  let mockMarketData;
  
  beforeEach(() => {
    mockMarketData = {
      'RTX 4090': {
        currentPrice: 0.46,
        averagePrice: 0.44,
        minPrice: 0.38,
        maxPrice: 0.52,
        trend: 'increasing',
        volatility: 0.12,
        demandScore: 0.85,
        competitionLevel: 'high'
      },
      'RTX 3080': {
        currentPrice: 0.28,
        averagePrice: 0.26,
        minPrice: 0.22,
        maxPrice: 0.32,
        trend: 'stable',
        volatility: 0.08,
        demandScore: 0.72,
        competitionLevel: 'medium'
      }
    };
    
    pricingEngine = new PricingIntelligenceEngine(mockMarketData);
  });
  
  test('generates optimal pricing recommendations', async () => {
    const userPortfolio = {
      gpus: [
        {
          model: 'RTX 4090',
          quantity: 2,
          currentPricing: 0.42, // Below market
          utilization: 0.88,
          powerConsumption: 450
        }
      ],
      powerCost: 0.12, // per kWh
      targetProfitMargin: 0.15
    };
    
    const recommendations = await pricingEngine.generateRecommendations(userPortfolio);
    
    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]).toMatchObject({
      gpuModel: 'RTX 4090',
      currentPrice: 0.42,
      recommendedPrice: expect.any(Number),
      priceChange: expect.any(Number),
      reasoning: expect.any(String),
      confidence: expect.any(Number),
      expectedImpact: {
        revenueChange: expect.any(Number),
        utilizationRisk: expect.any(Number),
        competitivePosition: expect.any(String)
      }
    });
    
    const rec = recommendations[0];
    expect(rec.recommendedPrice).toBeGreaterThan(0.42); // Should suggest increase
    expect(rec.recommendedPrice).toBeLessThanOrEqual(0.52); // Not above max market
    expect(rec.confidence).toBeGreaterThan(0.7); // High confidence
    expect(rec.reasoning).toContain('below market average');
  });
  
  test('considers competition and demand factors', async () => {
    const highCompetitionData = {
      ...mockMarketData,
      'RTX 4090': {
        ...mockMarketData['RTX 4090'],
        competitionLevel: 'very_high',
        availableSupply: 150,
        demandScore: 0.65 // Lower demand
      }
    };
    
    const lowCompetitionData = {
      ...mockMarketData,
      'RTX 4090': {
        ...mockMarketData['RTX 4090'],
        competitionLevel: 'low',
        availableSupply: 25,
        demandScore: 0.95 // High demand
      }
    };
    
    const userPortfolio = {
      gpus: [{ model: 'RTX 4090', currentPricing: 0.44 }]
    };
    
    const highCompEngine = new PricingIntelligenceEngine(highCompetitionData);
    const lowCompEngine = new PricingIntelligenceEngine(lowCompetitionData);
    
    const highCompRec = await highCompEngine.generateRecommendations(userPortfolio);
    const lowCompRec = await lowCompEngine.generateRecommendations(userPortfolio);
    
    // High competition should suggest lower/competitive pricing
    expect(highCompRec[0].recommendedPrice).toBeLessThanOrEqual(0.44);
    expect(highCompRec[0].reasoning).toContain('high competition');
    
    // Low competition should suggest higher pricing
    expect(lowCompRec[0].recommendedPrice).toBeGreaterThan(0.44);
    expect(lowCompRec[0].reasoning).toContain('low competition');
  });
  
  test('accounts for seasonal and temporal patterns', async () => {
    const seasonalEngine = new PricingIntelligenceEngine(mockMarketData);
    
    // Mock historical seasonal data
    const seasonalPatterns = {
      'RTX 4090': {
        hourly: { peak: [9, 10, 11, 14, 15, 16], off: [2, 3, 4, 5, 6] },
        daily: { weekdays: 1.1, weekends: 0.9 },
        monthly: { 
          Q1: 1.15, // High demand in Q1
          Q2: 0.95,
          Q3: 0.85, // Summer lull
          Q4: 1.25  // Holiday rush
        }
      }
    };
    
    seasonalEngine.loadSeasonalPatterns(seasonalPatterns);
    
    // Test different times
    const peakTimeRec = await seasonalEngine.generateRecommendations(
      { gpus: [{ model: 'RTX 4090', currentPricing: 0.44 }] },
      { currentTime: new Date('2024-01-15T10:00:00Z') } // Peak hour, Q1
    );
    
    const offTimeRec = await seasonalEngine.generateRecommendations(
      { gpus: [{ model: 'RTX 4090', currentPricing: 0.44 }] },
      { currentTime: new Date('2024-07-15T03:00:00Z') } // Off hour, Q3
    );
    
    expect(peakTimeRec[0].recommendedPrice).toBeGreaterThan(offTimeRec[0].recommendedPrice);
    expect(peakTimeRec[0].reasoning).toContain('peak demand');
    expect(offTimeRec[0].reasoning).toContain('off-peak');
  });
  
  test('validates pricing recommendations against business rules', () => {
    const businessRules = {
      minProfitMargin: 0.10,
      maxPriceIncrease: 0.15, // 15% max increase per adjustment
      minPriceDecrease: 0.05, // 5% min decrease to make it worthwhile
      competitorPriceBuffer: 0.02 // Stay within $0.02 of competitors
    };
    
    const invalidRecommendations = [
      {
        gpuModel: 'RTX 4090',
        currentPrice: 0.40,
        recommendedPrice: 0.50, // 25% increase - too high
        profitMargin: 0.08 // Below minimum
      },
      {
        gpuModel: 'RTX 3080',
        currentPrice: 0.30,
        recommendedPrice: 0.29, // Only 3.3% decrease - too small
        profitMargin: 0.12
      }
    ];
    
    const validatedRecs = pricingEngine.validateRecommendations(
      invalidRecommendations,
      businessRules
    );
    
    expect(validatedRecs).toHaveLength(0); // Both should be filtered out
    
    const validRecommendation = [{
      gpuModel: 'RTX 4090',
      currentPrice: 0.40,
      recommendedPrice: 0.45, // 12.5% increase - acceptable
      profitMargin: 0.13
    }];
    
    const validatedValid = pricingEngine.validateRecommendations(
      validRecommendation,
      businessRules
    );
    
    expect(validatedValid).toHaveLength(1);
  });
  
  test('calculates revenue impact projections', () => {
    const priceChange = {
      gpuModel: 'RTX 4090',
      currentPrice: 0.42,
      recommendedPrice: 0.46,
      quantity: 2,
      averageUtilization: 0.85,
      demandElasticity: -0.3 // 30% demand reduction per 100% price increase
    };
    
    const impact = pricingEngine.calculateRevenueImpact(
      priceChange,
      { timeHorizon: 30 } // 30 days
    );
    
    expect(impact).toMatchObject({
      currentDailyRevenue: expect.any(Number),
      projectedDailyRevenue: expect.any(Number),
      dailyRevenueChange: expect.any(Number),
      monthlyRevenueChange: expect.any(Number),
      utilizationChange: expect.any(Number),
      riskFactors: expect.any(Array),
      confidence: expect.any(Number)
    });
    
    // With 9.5% price increase and -0.3 elasticity, expect ~2.85% utilization drop
    expect(impact.utilizationChange).toBeCloseTo(-0.0285, 3);
    expect(impact.projectedDailyRevenue).toBeGreaterThan(impact.currentDailyRevenue);
    expect(impact.riskFactors).toContain('demand_reduction');
  });
});
```

### TEST-003: Competitive Analysis Engine
```javascript
describe('Competitive Analysis Engine', () => {
  let competitiveAnalyzer;
  let mockCompetitorData;
  
  beforeEach(() => {
    mockCompetitorData = [
      {
        platform: 'vastai',
        gpuModel: 'RTX 4090',
        pricing: [0.44, 0.46, 0.42, 0.48, 0.45], // Multiple listings
        features: ['instant_start', 'jupyter_notebook', 'ssh_access'],
        locations: ['US-East', 'US-West', 'EU'],
        reliability: 0.92,
        userRating: 4.2
      },
      {
        platform: 'runpod',
        gpuModel: 'RTX 4090',
        pricing: [0.40, 0.43, 0.47],
        features: ['instant_start', 'custom_containers', 'ssh_access', 'persistent_storage'],
        locations: ['US-East', 'US-West'],
        reliability: 0.95,
        userRating: 4.5
      },
      {
        platform: 'lambdalabs',
        gpuModel: 'RTX 4090',
        pricing: [0.48, 0.50],
        features: ['jupyter_notebook', 'ssh_access', 'preinstalled_ml_libs'],
        locations: ['US-West'],
        reliability: 0.98,
        userRating: 4.7
      }
    ];
    
    competitiveAnalyzer = new CompetitiveAnalysisEngine(mockCompetitorData);
  });
  
  test('analyzes competitive positioning', async () => {
    const userOffering = {
      gpuModel: 'RTX 4090',
      price: 0.45,
      features: ['instant_start', 'ssh_access', 'custom_environments'],
      location: 'US-East',
      reliability: 0.90,
      userRating: 4.0
    };
    
    const analysis = await competitiveAnalyzer.analyzePosition(userOffering);
    
    expect(analysis).toMatchObject({
      gpuModel: 'RTX 4090',
      yourPrice: 0.45,
      marketPosition: expect.any(String),
      priceRank: expect.any(Number),
      competitorComparison: expect.any(Array),
      strengths: expect.any(Array),
      weaknesses: expect.any(Array),
      recommendations: expect.any(Array),
      marketShare: expect.any(Number)
    });
    
    // Should be positioned in middle of market
    expect(analysis.marketPosition).toMatch(/middle|competitive/i);
    expect(analysis.priceRank).toBeGreaterThan(0);
    expect(analysis.priceRank).toBeLessThanOrEqual(mockCompetitorData.length + 1);
    
    // Should identify competitive advantages and disadvantages
    expect(analysis.strengths.length + analysis.weaknesses.length).toBeGreaterThan(0);
  });
  
  test('identifies pricing opportunities and threats', async () => {
    const opportunities = await competitiveAnalyzer.identifyOpportunities('RTX 4090');
    
    expect(opportunities).toMatchObject({
      priceGaps: expect.any(Array),
      featureGaps: expect.any(Array),
      locationGaps: expect.any(Array),
      qualityOpportunities: expect.any(Array)
    });
    
    // Should find price gaps where user could compete
    expect(opportunities.priceGaps.length).toBeGreaterThan(0);
    opportunities.priceGaps.forEach(gap => {
      expect(gap).toMatchObject({
        priceRange: {
          min: expect.any(Number),
          max: expect.any(Number)
        },
        opportunity: expect.any(String),
        potentialRevenue: expect.any(Number)
      });
    });
  });
  
  test('tracks competitor price movements and alerts', async () => {
    const priceTracker = new CompetitorPriceTracker();
    
    // Initial price data
    const initialData = mockCompetitorData;
    priceTracker.recordPrices(initialData, new Date('2024-01-15T08:00:00Z'));
    
    // Updated price data (some competitors lowered prices)
    const updatedData = mockCompetitorData.map(competitor => ({
      ...competitor,
      pricing: competitor.pricing.map(price => 
        competitor.platform === 'runpod' ? price - 0.03 : price
      )
    }));
    
    priceTracker.recordPrices(updatedData, new Date('2024-01-15T10:00:00Z'));
    
    const alerts = await priceTracker.generateAlerts();
    
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      type: 'competitor_price_drop',
      competitor: 'runpod',
      gpuModel: 'RTX 4090',
      priceChange: -0.03,
      impact: 'high',
      recommendation: expect.stringContaining('consider')
    });
  });
  
  test('benchmarks feature competitiveness', () => {
    const userFeatures = ['instant_start', 'ssh_access'];
    const benchmark = competitiveAnalyzer.benchmarkFeatures('RTX 4090', userFeatures);
    
    expect(benchmark).toMatchObject({
      featureScore: expect.any(Number),
      missingFeatures: expect.any(Array),
      uniqueFeatures: expect.any(Array),
      commonFeatures: expect.any(Array),
      competitivenessRating: expect.any(String)
    });
    
    // Should identify missing valuable features
    expect(benchmark.missingFeatures).toContain('custom_containers');
    expect(benchmark.missingFeatures).toContain('jupyter_notebook');
    
    // Should calculate feature score (0-1)
    expect(benchmark.featureScore).toBeGreaterThanOrEqual(0);
    expect(benchmark.featureScore).toBeLessThanOrEqual(1);
  });
  
  test('generates market positioning reports', async () => {
    const report = await competitiveAnalyzer.generatePositioningReport('RTX 4090');
    
    expect(report).toMatchObject({
      gpuModel: 'RTX 4090',
      marketOverview: {
        averagePrice: expect.any(Number),
        priceRange: {
          min: expect.any(Number),
          max: expect.any(Number)
        },
        totalCompetitors: expect.any(Number),
        marketTrend: expect.any(String)
      },
      competitorAnalysis: expect.any(Array),
      pricingStrategy: {
        recommended: expect.any(String),
        pricePoint: expect.any(Number),
        reasoning: expect.any(String)
      },
      actionItems: expect.any(Array),
      updatedAt: expect.any(String)
    });
    
    expect(report.competitorAnalysis).toHaveLength(mockCompetitorData.length);
    expect(report.actionItems.length).toBeGreaterThan(0);
    
    // Each competitor should have key metrics
    report.competitorAnalysis.forEach(competitor => {
      expect(competitor).toMatchObject({
        platform: expect.any(String),
        averagePrice: expect.any(Number),
        marketShare: expect.any(Number),
        strengths: expect.any(Array),
        threats: expect.any(Array)
      });
    });
  });
});
```

### TEST-004: Market Trend Prediction and Forecasting
```javascript
describe('Market Trend Prediction and Forecasting', () => {
  let trendPredictor;
  let historicalMarketData;
  
  beforeEach(() => {
    // Generate 90 days of synthetic historical data
    historicalMarketData = generateHistoricalData(90, {
      'RTX 4090': {
        basePrice: 0.44,
        trend: 'increasing',
        seasonality: { amplitude: 0.08, period: 7 }, // Weekly pattern
        volatility: 0.12,
        events: [
          { date: '2024-01-01', impact: 0.15, duration: 14 }, // New Year demand spike
          { date: '2024-01-10', impact: -0.08, duration: 7 }   // Supply increase
        ]
      }
    });
    
    trendPredictor = new MarketTrendPredictor(historicalMarketData);
  });
  
  test('predicts short-term price movements', async () => {
    const prediction = await trendPredictor.predictPrices('RTX 4090', {
      horizon: 7, // 7 days
      confidence: 0.95
    });
    
    expect(prediction).toMatchObject({
      gpuModel: 'RTX 4090',
      horizon: 7,
      predictions: expect.any(Array),
      trend: expect.any(String),
      confidence: expect.any(Number),
      factors: expect.any(Array)
    });
    
    expect(prediction.predictions).toHaveLength(7);
    prediction.predictions.forEach(pred => {
      expect(pred).toMatchObject({
        date: expect.any(String),
        price: expect.any(Number),
        confidenceInterval: {
          lower: expect.any(Number),
          upper: expect.any(Number)
        }
      });
      
      // Confidence interval should be reasonable
      expect(pred.confidenceInterval.upper).toBeGreaterThan(pred.price);
      expect(pred.confidenceInterval.lower).toBeLessThan(pred.price);
    });
  });
  
  test('identifies cyclical patterns and seasonality', () => {
    const patterns = trendPredictor.analyzePatterns('RTX 4090');
    
    expect(patterns).toMatchObject({
      seasonality: {
        detected: expect.any(Boolean),
        period: expect.any(Number),
        amplitude: expect.any(Number),
        phase: expect.any(Number)
      },
      trend: {
        direction: expect.any(String),
        strength: expect.any(Number),
        changeRate: expect.any(Number)
      },
      cycles: expect.any(Array),
      anomalies: expect.any(Array)
    });
    
    // Should detect weekly pattern
    expect(patterns.seasonality.detected).toBe(true);
    expect(patterns.seasonality.period).toBeCloseTo(7, 1);
    
    // Should identify trend direction
    expect(patterns.trend.direction).toMatch(/increasing|decreasing|stable/);
  });
  
  test('detects market regime changes', async () => {
    // Create data with regime change (stable -> volatile)
    const regimeChangeData = [
      ...generateStablePeriod(30, 0.44, 0.02), // 30 days stable
      ...generateVolatilePeriod(30, 0.44, 0.15) // 30 days volatile
    ];
    
    const regimePredictor = new MarketTrendPredictor(regimeChangeData);
    const regimes = await regimePredictor.detectRegimeChanges('RTX 4090');
    
    expect(regimes).toMatchObject({
      currentRegime: expect.any(String),
      regimeHistory: expect.any(Array),
      lastChange: expect.any(String),
      stability: expect.any(Number)
    });
    
    expect(regimes.regimeHistory).toHaveLength(2);
    expect(regimes.regimeHistory[0].regime).toBe('stable');
    expect(regimes.regimeHistory[1].regime).toBe('volatile');
    expect(regimes.currentRegime).toBe('volatile');
  });
  
  test('incorporates external factors in predictions', async () => {
    const externalFactors = [
      {
        factor: 'crypto_prices',
        data: [45000, 46000, 44500, 47000], // Bitcoin prices
        correlation: 0.65,
        lag: 1 // 1 day lag
      },
      {
        factor: 'supply_announcements',
        events: [
          { date: '2024-01-20', impact: -0.08, description: 'New GPU release announced' }
        ]
      },
      {
        factor: 'demand_indicators',
        data: { aiTrainingJobs: 1250, cryptoHashrate: 350000000 }
      }
    ];
    
    const enhancedPredictor = new MarketTrendPredictor(historicalMarketData, externalFactors);
    const prediction = await enhancedPredictor.predictPrices('RTX 4090', {
      horizon: 14,
      includeExternalFactors: true
    });
    
    expect(prediction.factors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'crypto_prices',
          impact: expect.any(Number),
          confidence: expect.any(Number)
        }),
        expect.objectContaining({
          name: 'supply_announcements',
          impact: expect.any(Number)
        })
      ])
    );
    
    // Predictions should account for external factors
    expect(prediction.confidence).toBeGreaterThan(0.7); // Higher confidence with external data
  });
  
  test('validates prediction accuracy against historical data', async () => {
    // Use first 60 days to predict next 30 days
    const trainingData = historicalMarketData.slice(0, 60);
    const testData = historicalMarketData.slice(60, 90);
    
    const validator = new PredictionValidator(trainingData);
    const predictions = await validator.makePredictions('RTX 4090', 30);
    
    const accuracy = validator.validatePredictions(predictions, testData);
    
    expect(accuracy).toMatchObject({
      mape: expect.any(Number), // Mean Absolute Percentage Error
      rmse: expect.any(Number), // Root Mean Square Error
      directionalAccuracy: expect.any(Number), // % of correct trend predictions
      coverage: expect.any(Number), // % of actual values within confidence intervals
      grade: expect.any(String)
    });
    
    // Should achieve reasonable accuracy
    expect(accuracy.mape).toBeLessThan(0.15); // Less than 15% error
    expect(accuracy.directionalAccuracy).toBeGreaterThan(0.6); // 60%+ trend accuracy
    expect(accuracy.coverage).toBeGreaterThan(0.8); // 80%+ confidence interval coverage
  });
  
  test('generates market outlook reports', async () => {
    const outlook = await trendPredictor.generateOutlook('RTX 4090', {
      shortTerm: 7,
      mediumTerm: 30,
      longTerm: 90
    });
    
    expect(outlook).toMatchObject({
      gpuModel: 'RTX 4090',
      currentPrice: expect.any(Number),
      marketState: expect.any(String),
      outlook: {
        shortTerm: {
          trend: expect.any(String),
          priceTarget: expect.any(Number),
          probability: expect.any(Number),
          keyFactors: expect.any(Array)
        },
        mediumTerm: {
          trend: expect.any(String),
          priceTarget: expect.any(Number),
          probability: expect.any(Number),
          scenarios: expect.any(Array)
        },
        longTerm: {
          trend: expect.any(String),
          priceRange: {
            min: expect.any(Number),
            max: expect.any(Number)
          },
          uncertainty: expect.any(Number),
          riskFactors: expect.any(Array)
        }
      },
      recommendations: expect.any(Array),
      lastUpdated: expect.any(String)
    });
    
    // Validate logical consistency
    expect(outlook.outlook.longTerm.uncertainty).toBeGreaterThan(
      outlook.outlook.shortTerm.probability
    ); // Longer term should be less certain
  });
});
```

## Integration Tests

### TEST-101: Market Data Pipeline Integration
```javascript
describe('Market Data Pipeline Integration', () => {
  let testDb;
  let marketPipeline;
  let mock500FarmAPI;
  
  beforeEach(async () => {
    testDb = await setupTestDatabase();
    mock500FarmAPI = setupMock500FarmAPI();
    marketPipeline = new MarketDataPipeline({
      database: testDb,
      apiClient: mock500FarmAPI,
      redis: mockRedisClient
    });
  });
  
  afterEach(async () => {
    await cleanupTestDatabase(testDb);
  });
  
  test('complete data collection and processing pipeline', async () => {
    // Mock API response
    mock500FarmAPI.fetchMachineData.mockResolvedValue({
      machines: [
        {
          id: "test-machine-1",
          gpu_name: "RTX 4090",
          num_gpus: 1,
          price_per_hour: 0.46,
          status: "available",
          location: "US-East",
          utilization: 87.5,
          last_seen: new Date().toISOString()
        },
        {
          id: "test-machine-2", 
          gpu_name: "RTX 3080",
          num_gpus: 2,
          price_per_hour: 0.28,
          status: "rented",
          location: "US-West",
          utilization: 92.1,
          last_seen: new Date().toISOString()
        }
      ],
      timestamp: new Date().toISOString(),
      total_machines: 2
    });
    
    // Run pipeline
    const result = await marketPipeline.runCollection();
    
    expect(result.success).toBe(true);
    expect(result.processed).toBe(2);
    expect(result.errors).toBe(0);
    
    // Verify data was stored in database
    const storedData = await testDb.prepare(
      'SELECT * FROM market_data ORDER BY created_at DESC LIMIT 2'
    ).all();
    
    expect(storedData).toHaveLength(2);
    expect(storedData[0]).toMatchObject({
      source_id: expect.any(String),
      gpu_model: expect.oneOf(['RTX 4090', 'RTX 3080']),
      price_per_hour: expect.any(Number),
      is_available: expect.any(Number),
      location: expect.any(String),
      utilization: expect.any(Number)
    });
    
    // Verify market statistics were calculated
    const stats = await testDb.prepare(
      'SELECT * FROM market_statistics WHERE gpu_model = ? ORDER BY created_at DESC LIMIT 1'
    ).bind('RTX 4090').first();
    
    expect(stats).toBeTruthy();
    expect(stats).toMatchObject({
      gpu_model: 'RTX 4090',
      current_price: 0.46,
      average_price: expect.any(Number),
      min_price: expect.any(Number),
      max_price: expect.any(Number),
      data_points: expect.any(Number)
    });
  });
  
  test('handles partial API failures gracefully', async () => {
    // Mock API with some invalid data
    mock500FarmAPI.fetchMachineData.mockResolvedValue({
      machines: [
        {
          id: "valid-machine",
          gpu_name: "RTX 4090",
          price_per_hour: 0.45,
          status: "available"
        },
        {
          id: "invalid-machine",
          gpu_name: "", // Invalid
          price_per_hour: -0.10, // Invalid
          status: "available"
        }
      ],
      timestamp: new Date().toISOString()
    });
    
    const result = await marketPipeline.runCollection();
    
    expect(result.success).toBe(true);
    expect(result.processed).toBe(1);
    expect(result.errors).toBe(1);
    expect(result.errorDetails).toHaveLength(1);
    
    // Valid data should still be stored
    const storedData = await testDb.prepare(
      'SELECT COUNT(*) as count FROM market_data WHERE source_id = ?'
    ).bind('valid-machine').first();
    
    expect(storedData.count).toBe(1);
  });
  
  test('updates cache and triggers notifications', async () => {
    mock500FarmAPI.fetchMachineData.mockResolvedValue({
      machines: [{
        id: "price-change-machine",
        gpu_name: "RTX 4090",
        price_per_hour: 0.52, // Significant price increase
        status: "available"
      }],
      timestamp: new Date().toISOString()
    });
    
    // Mock existing lower price in cache
    mockRedisClient.get.mockResolvedValue('0.44');
    
    const result = await marketPipeline.runCollection();
    
    expect(result.success).toBe(true);
    
    // Should update cache
    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'market:price:RTX 4090',
      '0.52',
      'EX',
      900 // 15 minutes
    );
    
    // Should trigger price change notification
    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0]).toMatchObject({
      type: 'significant_price_change',
      gpuModel: 'RTX 4090',
      oldPrice: 0.44,
      newPrice: 0.52,
      changePercent: expect.closeTo(18.18, 1)
    });
  });
  
  test('rate limits API calls properly', async () => {
    const rateLimitedPipeline = new MarketDataPipeline({
      database: testDb,
      apiClient: mock500FarmAPI,
      rateLimit: { calls: 2, period: 1000 } // 2 calls per second
    });
    
    // Mock successful responses
    mock500FarmAPI.fetchMachineData.mockResolvedValue({
      machines: [{ id: "test", gpu_name: "RTX 4090", price_per_hour: 0.45 }],
      timestamp: new Date().toISOString()
    });
    
    // Make 3 rapid calls
    const startTime = Date.now();
    const promises = [
      rateLimitedPipeline.runCollection(),
      rateLimitedPipeline.runCollection(),
      rateLimitedPipeline.runCollection()
    ];
    
    await Promise.all(promises);
    const elapsed = Date.now() - startTime;
    
    // Should take at least 1 second due to rate limiting
    expect(elapsed).toBeGreaterThan(1000);
    expect(mock500FarmAPI.fetchMachineData).toHaveBeenCalledTimes(3);
  });
});
```

### TEST-102: Pricing Intelligence API
```javascript
describe('Pricing Intelligence API', () => {
  let testDb;
  let testUser;
  let testPortfolio;
  
  beforeEach(async () => {
    testDb = await setupTestDatabase();
    testUser = await createTestUser({
      email: 'pricing-api@example.com',
      subscriptionTier: 'professional'
    });
    
    testPortfolio = await createTestPortfolio(testUser.id, {
      name: 'Pricing Test Portfolio',
      gpus: [
        { model: 'RTX 4090', quantity: 2, currentPricing: 0.42 },
        { model: 'RTX 3080', quantity: 1, currentPricing: 0.26 }
      ]
    });
    
    // Seed market data
    await seedMarketData(testDb);
  });
  
  afterEach(async () => {
    await cleanupTestDatabase(testDb);
  });
  
  test('returns personalized pricing recommendations', async () => {
    const response = await request(app)
      .get(`/api/v1/market/pricing-recommendations`)
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .query({ portfolioId: testPortfolio.id })
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      portfolioId: testPortfolio.id,
      recommendations: expect.any(Array),
      marketOverview: expect.any(Object),
      lastUpdated: expect.any(String)
    });
    
    const recommendations = response.body.data.recommendations;
    expect(recommendations).toHaveLength(2); // One per GPU model
    
    recommendations.forEach(rec => {
      expect(rec).toMatchObject({
        gpuModel: expect.any(String),
        currentPrice: expect.any(Number),
        recommendedPrice: expect.any(Number),
        confidence: expect.any(Number),
        reasoning: expect.any(String),
        expectedImpact: {
          revenueChange: expect.any(Number),
          utilizationRisk: expect.any(Number)
        }
      });
    });
  });
  
  test('provides market intelligence dashboard data', async () => {
    const response = await request(app)
      .get('/api/v1/market/intelligence')
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .query({ 
        gpuModels: 'RTX 4090,RTX 3080',
        timeframe: '7d'
      })
      .expect(200);
    
    expect(response.body.data).toMatchObject({
      timeframe: '7d',
      gpuModels: ['RTX 4090', 'RTX 3080'],
      marketData: expect.any(Object),
      trends: expect.any(Object),
      competitorAnalysis: expect.any(Object),
      opportunities: expect.any(Array)
    });
    
    // Check RTX 4090 data
    const rtx4090Data = response.body.data.marketData['RTX 4090'];
    expect(rtx4090Data).toMatchObject({
      currentPrice: expect.any(Number),
      priceChange: expect.any(Number),
      trend: expect.any(String),
      volatility: expect.any(Number),
      demandScore: expect.any(Number)
    });
  });
  
  test('enforces subscription tier limits', async () => {
    const freeUser = await createTestUser({
      email: 'free-pricing@example.com',
      subscriptionTier: 'free'
    });
    
    // Free tier should get limited data
    const freeResponse = await request(app)
      .get('/api/v1/market/intelligence')
      .set('Authorization', `Bearer ${freeUser.accessToken}`)
      .expect(200);
    
    expect(freeResponse.body.data.marketData).toBeDefined();
    expect(freeResponse.body.data.competitorAnalysis).toBeUndefined();
    expect(freeResponse.body.data.upgradePrompt).toBeDefined();
    
    // Professional tier should get full data
    const proResponse = await request(app)
      .get('/api/v1/market/intelligence')
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .expect(200);
    
    expect(proResponse.body.data.competitorAnalysis).toBeDefined();
    expect(proResponse.body.data.upgradePrompt).toBeUndefined();
  });
  
  test('handles market data API failures gracefully', async () => {
    // Mock API failure
    jest.spyOn(marketDataCollector, 'getLatestData')
      .mockRejectedValue(new Error('Market data service unavailable'));
    
    const response = await request(app)
      .get('/api/v1/market/intelligence')
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.marketData).toBeDefined(); // Should use cached data
    expect(response.body.warnings).toContain('Using cached market data');
    expect(response.body.data.lastUpdated).toBeTruthy();
  });
  
  test('provides market alerts and notifications', async () => {
    // Create user with alert preferences
    await testDb.prepare(`
      INSERT INTO user_alert_preferences (user_id, price_change_threshold, notification_channels)
      VALUES (?, ?, ?)
    `).bind(testUser.id, 0.10, JSON.stringify(['email', 'webhook'])).run();
    
    const response = await request(app)
      .get('/api/v1/market/alerts')
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .expect(200);
    
    expect(response.body.data).toMatchObject({
      activeAlerts: expect.any(Array),
      alertHistory: expect.any(Array),
      preferences: expect.any(Object)
    });
    
    // Test creating new alert
    const createResponse = await request(app)
      .post('/api/v1/market/alerts')
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .send({
        gpuModel: 'RTX 4090',
        alertType: 'price_threshold',
        threshold: 0.50,
        direction: 'above'
      })
      .expect(201);
    
    expect(createResponse.body.data).toMatchObject({
      id: expect.any(String),
      gpuModel: 'RTX 4090',
      alertType: 'price_threshold',
      isActive: true
    });
  });
});
```

### TEST-103: Real-time Market Updates
```javascript
describe('Real-time Market Updates', () => {
  let wsServer;
  let wsClient;
  let testUser;
  
  beforeEach(async () => {
    wsServer = await setupTestWebSocketServer();
    testUser = await createTestUser({
      email: 'realtime-test@example.com'
    });
  });
  
  afterEach(async () => {
    if (wsClient) await wsClient.close();
    await wsServer.close();
  });
  
  test('broadcasts market price updates via WebSocket', async () => {
    // Connect authenticated WebSocket
    wsClient = new WebSocket(
      `ws://localhost:${wsServer.port}/ws/market?token=${testUser.accessToken}`
    );
    
    await new Promise(resolve => wsClient.on('open', resolve));
    
    const messagePromise = new Promise(resolve => {
      wsClient.on('message', data => {
        resolve(JSON.parse(data));
      });
    });
    
    // Simulate market price update
    const priceUpdate = {
      gpuModel: 'RTX 4090',
      newPrice: 0.48,
      oldPrice: 0.45,
      changePercent: 6.67,
      timestamp: new Date().toISOString()
    };
    
    await broadcastMarketUpdate(priceUpdate);
    
    const receivedMessage = await messagePromise;
    
    expect(receivedMessage).toMatchObject({
      type: 'price_update',
      data: {
        gpuModel: 'RTX 4090',
        price: 0.48,
        change: 0.03,
        changePercent: 6.67,
        timestamp: expect.any(String)
      }
    });
  });
  
  test('sends targeted alerts to subscribed users', async () => {
    // Set user alert preferences
    await setUserAlertPreferences(testUser.id, {
      gpuModels: ['RTX 4090'],
      priceChangeThreshold: 0.05
    });
    
    wsClient = new WebSocket(
      `ws://localhost:${wsServer.port}/ws/market?token=${testUser.accessToken}`
    );
    
    await new Promise(resolve => wsClient.on('open', resolve));
    
    const alertPromise = new Promise(resolve => {
      wsClient.on('message', data => {
        const message = JSON.parse(data);
        if (message.type === 'alert') {
          resolve(message);
        }
      });
    });
    
    // Trigger significant price change
    const significantChange = {
      gpuModel: 'RTX 4090',
      newPrice: 0.50,
      oldPrice: 0.45,
      changePercent: 11.11 // Above 5% threshold
    };
    
    await processMarketAlert(significantChange);
    
    const alert = await alertPromise;
    
    expect(alert).toMatchObject({
      type: 'alert',
      data: {
        alertType: 'price_increase',
        gpuModel: 'RTX 4090',
        priceChange: 0.05,
        recommendation: expect.any(String),
        urgency: 'medium'
      }
    });
  });
  
  test('handles WebSocket connection limits and queuing', async () => {
    const connectionManager = new MarketWebSocketManager({ maxConnections: 2 });
    
    // Create 3 connections
    const connections = [];
    for (let i = 0; i < 3; i++) {
      const ws = new WebSocket(
        `ws://localhost:${wsServer.port}/ws/market?token=${testUser.accessToken}`
      );
      connections.push(ws);
    }
    
    // Wait for connections
    await Promise.all(connections.map(ws => 
      new Promise(resolve => ws.on('open', resolve))
    ));
    
    expect(connectionManager.getActiveConnections()).toBe(2);
    expect(connectionManager.getQueuedConnections()).toBe(1);
    
    // Close one connection
    connections[0].close();
    
    // Wait for queued connection to be promoted
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(connectionManager.getActiveConnections()).toBe(2);
    expect(connectionManager.getQueuedConnections()).toBe(0);
  });
  
  test('maintains connection health and recovers from failures', async () => {
    wsClient = new WebSocket(
      `ws://localhost:${wsServer.port}/ws/market?token=${testUser.accessToken}`
    );
    
    await new Promise(resolve => wsClient.on('open', resolve));
    
    // Should receive periodic heartbeat
    const heartbeatPromise = new Promise(resolve => {
      wsClient.on('message', data => {
        const message = JSON.parse(data);
        if (message.type === 'heartbeat') {
          resolve(message);
        }
      });
    });
    
    const heartbeat = await heartbeatPromise;
    expect(heartbeat.type).toBe('heartbeat');
    expect(heartbeat.timestamp).toBeTruthy();
    
    // Test connection recovery
    const connectionMonitor = new WebSocketConnectionMonitor(wsClient);
    
    // Simulate connection failure
    wsClient.terminate();
    
    // Should attempt reconnection
    const recovered = await connectionMonitor.waitForReconnection(5000);
    expect(recovered).toBe(true);
  });
});
```

## E2E Tests

### TEST-201: Market Intelligence Dashboard E2E
```javascript
describe('Market Intelligence Dashboard E2E', () => {
  test('displays comprehensive market overview', async () => {
    const page = await browser.newPage();
    const testUser = await createTestUser({
      email: 'market-dashboard-e2e@example.com',
      subscriptionTier: 'professional'
    });
    
    try {
      await loginUser(page, testUser);
      await page.goto('/market-intelligence');
      
      // Should load dashboard
      await expect(page.locator('h1')).toContainText('Market Intelligence');
      
      // Check key sections
      await expect(page.locator('[data-testid="price-overview"]')).toBeVisible();
      await expect(page.locator('[data-testid="trend-charts"]')).toBeVisible();
      await expect(page.locator('[data-testid="competitor-analysis"]')).toBeVisible();
      
      // Test GPU model selection
      await page.click('[data-testid="gpu-selector"]');
      await page.click('[data-testid="gpu-option-RTX 4090"]');
      
      // Price charts should update
      await expect(page.locator('[data-testid="rtx4090-price-chart"]')).toBeVisible();
      
      // Check current price display
      const currentPrice = await page.locator('[data-testid="current-price-RTX 4090"]').textContent();
      expect(currentPrice).toMatch(/\$0\.\d{2}/); // Format: $0.XX
      
      // Test time range selector
      await page.click('[data-testid="timerange-7d"]');
      await page.waitForTimeout(1000); // Allow chart update
      
      // Chart should show 7-day data
      const chartTitle = await page.locator('[data-testid="chart-title"]').textContent();
      expect(chartTitle).toContain('7 days');
      
      // Test competitive positioning
      await page.click('[data-testid="competitor-tab"]');
      await expect(page.locator('[data-testid="competitor-table"]')).toBeVisible();
      
      // Should show competitor pricing
      const competitorRows = page.locator('[data-testid="competitor-row"]');
      await expect(competitorRows).toHaveCount.greaterThan(0);
      
    } finally {
      await page.close();
    }
  });
  
  test('provides pricing recommendations and insights', async () => {
    const page = await browser.newPage();
    const testUser = await createTestUser({
      email: 'pricing-rec-e2e@example.com',
      subscriptionTier: 'individual'
    });
    
    // Create portfolio for recommendations
    const portfolio = await createTestPortfolio(testUser.id, {
      name: 'E2E Test Portfolio',
      gpus: [{ model: 'RTX 4090', quantity: 1, currentPricing: 0.42 }]
    });
    
    try {
      await loginUser(page, testUser);
      await page.goto('/market-intelligence/pricing');
      
      // Should show personalized recommendations
      await expect(page.locator('[data-testid="pricing-recommendations"]')).toBeVisible();
      
      // Check recommendation card
      const recCard = page.locator('[data-testid="recommendation-RTX 4090"]');
      await expect(recCard).toBeVisible();
      
      // Should show current vs recommended pricing
      await expect(recCard.locator('[data-testid="current-price"]')).toContainText('$0.42');
      
      const recommendedPrice = await recCard.locator('[data-testid="recommended-price"]').textContent();
      expect(recommendedPrice).toMatch(/\$0\.\d{2}/);
      
      // Check confidence indicator
      const confidence = await recCard.locator('[data-testid="confidence-score"]').textContent();
      expect(confidence).toMatch(/\d{1,3}%/);
      
      // Test applying recommendation
      await recCard.locator('[data-testid="apply-recommendation"]').click();
      
      // Should show confirmation dialog
      await expect(page.locator('[data-testid="apply-pricing-modal"]')).toBeVisible();
      
      // Confirm application
      await page.click('[data-testid="confirm-apply"]');
      
      // Should show success message
      await expect(page.locator('.success-notification')).toContainText('Pricing updated');
      
      // Verify pricing was updated in portfolio
      await page.goto(`/portfolio/${portfolio.id}`);
      const updatedPrice = await page.locator('[data-testid="gpu-price-RTX 4090"]').textContent();
      expect(updatedPrice).not.toBe('$0.42'); // Should be different
      
    } finally {
      await page.close();
    }
  });
  
  test('shows market alerts and opportunities', async () => {
    const page = await browser.newPage();
    const testUser = await createTestUser({
      email: 'market-alerts-e2e@example.com',
      subscriptionTier: 'professional'
    });
    
    try {
      await loginUser(page, testUser);
      await page.goto('/market-intelligence/alerts');
      
      // Should show alerts center
      await expect(page.locator('h1')).toContainText('Market Alerts');
      
      // Test creating new alert
      await page.click('[data-testid="create-alert-button"]');
      
      // Fill alert form
      await page.selectOption('[data-testid="gpu-model-select"]', 'RTX 4090');
      await page.selectOption('[data-testid="alert-type-select"]', 'price_threshold');
      await page.fill('[data-testid="threshold-input"]', '0.50');
      await page.selectOption('[data-testid="direction-select"]', 'above');
      
      // Enable notifications
      await page.check('[data-testid="email-notifications"]');
      await page.check('[data-testid="discord-notifications"]');
      
      await page.click('[data-testid="create-alert"]');
      
      // Should show success and new alert
      await expect(page.locator('.success-notification')).toContainText('Alert created');
      await expect(page.locator('[data-testid="alert-item"]')).toBeVisible();
      
      // Test alert details
      const alertItem = page.locator('[data-testid="alert-item"]').first();
      await expect(alertItem).toContainText('RTX 4090');
      await expect(alertItem).toContainText('$0.50');
      await expect(alertItem).toContainText('above');
      
      // Test alert actions
      await alertItem.locator('[data-testid="alert-menu"]').click();
      await expect(page.locator('[data-testid="edit-alert"]')).toBeVisible();
      await expect(page.locator('[data-testid="delete-alert"]')).toBeVisible();
      
      // Test market opportunities section
      await page.goto('/market-intelligence/opportunities');
      
      await expect(page.locator('[data-testid="opportunities-list"]')).toBeVisible();
      
      // Should show opportunity cards
      const opportunities = page.locator('[data-testid="opportunity-card"]');
      if (await opportunities.count() > 0) {
        const firstOpp = opportunities.first();
        await expect(firstOpp.locator('[data-testid="opportunity-type"]')).toBeVisible();
        await expect(firstOpp.locator('[data-testid="potential-revenue"]')).toBeVisible();
        await expect(firstOpp.locator('[data-testid="opportunity-description"]')).toBeVisible();
      }
      
    } finally {
      await page.close();
    }
  });
});
```

### TEST-202: Market Data Real-time Updates E2E
```javascript
describe('Market Data Real-time Updates E2E', () => {
  test('receives live price updates', async () => {
    const page = await browser.newPage();
    const testUser = await createTestUser({
      email: 'realtime-updates-e2e@example.com'
    });
    
    try {
      await loginUser(page, testUser);
      await page.goto('/market-intelligence');
      
      // Wait for initial load
      await expect(page.locator('[data-testid="price-RTX 4090"]')).toBeVisible();
      
      const initialPrice = await page.locator('[data-testid="price-RTX 4090"]').textContent();
      
      // Simulate real-time price update
      await simulateMarketPriceUpdate({
        gpuModel: 'RTX 4090',
        newPrice: 0.48,
        oldPrice: 0.45
      });
      
      // Price should update automatically
      await expect(page.locator('[data-testid="price-RTX 4090"]')).not.toContainText(initialPrice);
      await expect(page.locator('[data-testid="price-RTX 4090"]')).toContainText('$0.48');
      
      // Should show price change indicator
      await expect(page.locator('[data-testid="price-change-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="price-change-indicator"]')).toHaveClass(/positive/);
      
      // Test alert notification
      const alertPromise = page.waitForSelector('[data-testid="alert-notification"]', { timeout: 5000 });
      
      // Simulate significant price change that triggers alert
      await simulateMarketPriceUpdate({
        gpuModel: 'RTX 4090',
        newPrice: 0.54, // 12.5% increase
        oldPrice: 0.48
      });
      
      const alertNotification = await alertPromise;
      expect(alertNotification).toBeTruthy();
      
      // Alert should contain relevant information
      await expect(page.locator('[data-testid="alert-notification"]')).toContainText('RTX 4090');
      await expect(page.locator('[data-testid="alert-notification"]')).toContainText('price increase');
      
    } finally {
      await page.close();
    }
  });
  
  test('handles connection failures and reconnection', async () => {
    const page = await browser.newPage();
    const testUser = await createTestUser({
      email: 'connection-test-e2e@example.com'
    });
    
    try {
      await loginUser(page, testUser);
      await page.goto('/market-intelligence');
      
      // Should show connected status
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
      
      // Simulate connection failure
      await page.evaluate(() => {
        window.marketWebSocket.close();
      });
      
      // Should show disconnected status
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Disconnected');
      await expect(page.locator('[data-testid="reconnecting-indicator"]')).toBeVisible();
      
      // Should automatically reconnect
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected', {
        timeout: 10000
      });
      
      // Should receive updates after reconnection
      await simulateMarketPriceUpdate({
        gpuModel: 'RTX 3080',
        newPrice: 0.30,
        oldPrice: 0.28
      });
      
      await expect(page.locator('[data-testid="price-RTX 3080"]')).toContainText('$0.30');
      
    } finally {
      await page.close();
    }
  });
});
```

## MCP-Enhanced Testing

### Performance Testing with Grafana MCP
```yaml
performance_thresholds:
  - metric: market_data_collection_time_p95
    threshold: 10000ms
    query: "histogram_quantile(0.95, market_data_collection_duration_seconds)"
  - metric: pricing_recommendation_time_p95
    threshold: 3000ms
    query: "histogram_quantile(0.95, pricing_recommendation_duration_seconds)"
  - metric: market_intelligence_load_time_p95
    threshold: 4000ms
    query: "histogram_quantile(0.95, market_intelligence_load_duration_seconds)"
  - metric: websocket_message_latency_p95
    threshold: 200ms
    query: "histogram_quantile(0.95, websocket_market_latency_seconds)"
  - metric: external_api_error_rate
    threshold: 1.0%
    query: "rate(external_api_errors_total{service='500farm'}[5m])"
```

### API Testing with Firecrawl MCP
```javascript
describe('External API Integration Testing', () => {
  test('validates 500.farm API response structure', async () => {
    const firecrawl = new FirecrawlService();
    
    // Test actual API endpoint structure
    const response = await firecrawl.scrape('https://500.farm/vastai-exporter/', {
      formats: ['json'],
      timeout: 30000
    });
    
    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    
    // Validate expected data structure
    if (response.data.machines) {
      expect(response.data.machines).toBeInstanceOf(Array);
      
      if (response.data.machines.length > 0) {
        const machine = response.data.machines[0];
        expect(machine).toMatchObject({
          id: expect.any(String),
          gpu_name: expect.any(String),
          price_per_hour: expect.any(Number),
          status: expect.any(String)
        });
      }
    }
  });
  
  test('monitors API availability and performance', async () => {
    const apiMonitor = new ExternalAPIMonitor();
    
    const healthCheck = await apiMonitor.checkHealth('500.farm');
    
    expect(healthCheck).toMatchObject({
      status: expect.oneOf(['healthy', 'degraded', 'unhealthy']),
      responseTime: expect.any(Number),
      lastCheck: expect.any(String),
      endpoints: expect.any(Object)
    });
    
    if (healthCheck.status === 'healthy') {
      expect(healthCheck.responseTime).toBeLessThan(5000);
    }
  });
});
```

### Error Monitoring with Sentry MCP
```javascript
describe('Market Intelligence Error Tracking', () => {
  test('captures external API failures', async () => {
    // Simulate 500.farm API failure
    jest.spyOn(fetch, 'fetch').mockRejectedValue(new Error('500.farm API timeout'));
    
    await expect(marketDataCollector.collectMarketData()).resolves.toBeDefined();
    
    // Verify Sentry captured the error
    const events = await sentry.getEvents({
      tag: 'external_api.error'
    });
    
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      level: 'error',
      message: '500.farm API timeout',
      context: {
        service: '500.farm',
        endpoint: expect.any(String),
        retryCount: expect.any(Number)
      }
    });
  });
});
```

## Test Data and Fixtures

### Market Data Test Fixtures
```json
{
  "sampleMarketData": [
    {
      "sourceId": "vastai-test-1",
      "gpuModel": "RTX 4090",
      "pricePerHour": 0.46,
      "isAvailable": true,
      "location": "US-East",
      "utilization": 87.5,
      "reliability": 0.95,
      "collectedAt": "2024-01-15T10:30:00Z"
    },
    {
      "sourceId": "vastai-test-2", 
      "gpuModel": "RTX 3080",
      "pricePerHour": 0.28,
      "isAvailable": false,
      "location": "US-West",
      "utilization": 92.1,
      "reliability": 0.88,
      "collectedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "priceHistory": {
    "RTX 4090": [
      { "date": "2024-01-01", "price": 0.42 },
      { "date": "2024-01-02", "price": 0.44 },
      { "date": "2024-01-03", "price": 0.46 },
      { "date": "2024-01-04", "price": 0.45 },
      { "date": "2024-01-05", "price": 0.47 }
    ]
  },
  "competitorData": [
    {
      "platform": "vastai",
      "gpuModel": "RTX 4090",
      "averagePrice": 0.45,
      "features": ["instant_start", "ssh_access"],
      "marketShare": 0.35
    },
    {
      "platform": "runpod",
      "gpuModel": "RTX 4090", 
      "averagePrice": 0.43,
      "features": ["containers", "persistent_storage"],
      "marketShare": 0.28
    }
  ]
}
```

### Test Helper Functions
```javascript
async function seedMarketData(db) {
  const marketData = [
    {
      id: 'test-rtx4090-1',
      gpu_model: 'RTX 4090',
      price_per_hour: 0.46,
      is_available: 1,
      location: 'US-East',
      created_at: new Date().toISOString()
    },
    {
      id: 'test-rtx3080-1', 
      gpu_model: 'RTX 3080',
      price_per_hour: 0.28,
      is_available: 1,
      location: 'US-West',
      created_at: new Date().toISOString()
    }
  ];
  
  for (const data of marketData) {
    await db.prepare(`
      INSERT INTO market_data (source_id, gpu_model, price_per_hour, is_available, location, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      data.id,
      data.gpu_model,
      data.price_per_hour,
      data.is_available,
      data.location,
      data.created_at
    ).run();
  }
}

function generateHistoricalData(days, config) {
  const data = [];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    
    Object.entries(config).forEach(([gpuModel, settings]) => {
      const basePrice = settings.basePrice;
      const trendFactor = settings.trend === 'increasing' ? i * 0.001 : 
                         settings.trend === 'decreasing' ? -i * 0.001 : 0;
      const randomFactor = (Math.random() - 0.5) * settings.volatility;
      
      data.push({
        gpuModel,
        price: basePrice + trendFactor + randomFactor,
        date: date.toISOString()
      });
    });
  }
  
  return data;
}
```

## IMPORTANT: Test Immutability
These tests are IMMUTABLE CONTRACTS. Once approved by human reviewer:
- **Hash**: SHA-256 will be calculated and stored
- **Claude Code CANNOT modify these tests**
- **Only humans can update tests with new hash approval**
- **Failed tests = failed implementation - no exceptions**
- **Missing MCP tools = blocked implementation - must alert user**

All tests must pass 100% before feature is considered complete. Test coverage must exceed 90% for all market intelligence code.