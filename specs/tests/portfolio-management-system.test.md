# Test Specification: Portfolio Management System

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
timeout: 30000
```

## Unit Tests

### TEST-001: Portfolio Creation Validation
```javascript
describe('Portfolio Creation Validation', () => {
  test('accepts valid portfolio data', () => {
    const validPortfolios = [
      {
        name: 'My Mining Rig',
        description: 'Main cryptocurrency mining setup',
        tier: 'free'
      },
      {
        name: 'AI Training Farm',
        description: 'Dedicated setup for AI model training workloads',
        tier: 'professional'
      },
      {
        name: 'GPU-Cluster-001',
        description: '',
        tier: 'enterprise'
      }
    ];
    
    validPortfolios.forEach(portfolio => {
      const result = validatePortfolioData(portfolio);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
  
  test('rejects invalid portfolio data', () => {
    const invalidPortfolios = [
      {
        name: '',
        description: 'Missing name',
        tier: 'free'
      },
      {
        name: 'A'.repeat(256), // Too long
        description: 'Name too long',
        tier: 'free'
      },
      {
        name: 'Valid Name',
        description: 'B'.repeat(1001), // Description too long
        tier: 'free'
      },
      {
        name: 'Valid Name',
        description: 'Valid description',
        tier: 'invalid_tier'
      }
    ];
    
    invalidPortfolios.forEach(portfolio => {
      const result = validatePortfolioData(portfolio);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
  
  test('enforces tier-based limits', () => {
    const freeUserPortfolios = Array(2).fill({
      name: 'Portfolio',
      description: 'Test',
      tier: 'free'
    });
    
    const result = validatePortfolioLimits('free', freeUserPortfolios);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/portfolio limit.*free tier/i);
    
    const proUserPortfolios = Array(10).fill({
      name: 'Portfolio',
      description: 'Test',
      tier: 'professional'
    });
    
    const proResult = validatePortfolioLimits('professional', proUserPortfolios);
    expect(proResult.isValid).toBe(true);
  });
});
```

### TEST-002: GPU Configuration Management
```javascript
describe('GPU Configuration Management', () => {
  test('validates GPU specifications', () => {
    const validGpuConfigs = [
      {
        model: 'RTX 4090',
        memory: 24576, // MB
        powerConsumption: 450, // Watts
        clockSpeed: 2520, // MHz
        quantity: 1,
        customName: 'Primary Mining GPU'
      },
      {
        model: 'RTX 3080',
        memory: 10240,
        powerConsumption: 320,
        clockSpeed: 1710,
        quantity: 4,
        customName: ''
      }
    ];
    
    validGpuConfigs.forEach(config => {
      const result = validateGpuConfiguration(config);
      expect(result.isValid).toBe(true);
      expect(result.computeCapability).toBeGreaterThan(0);
      expect(result.hashRate).toBeGreaterThan(0);
    });
  });
  
  test('calculates accurate performance metrics', () => {
    const rtx4090Config = {
      model: 'RTX 4090',
      memory: 24576,
      powerConsumption: 450,
      clockSpeed: 2520,
      quantity: 2
    };
    
    const metrics = calculateGpuPerformanceMetrics(rtx4090Config);
    
    expect(metrics).toMatchObject({
      totalMemory: 49152, // 24576 * 2
      totalPowerConsumption: 900, // 450 * 2
      estimatedHashRate: expect.any(Number),
      computeCapability: expect.any(Number),
      efficiencyRating: expect.any(Number)
    });
    
    expect(metrics.estimatedHashRate).toBeGreaterThan(0);
    expect(metrics.efficiencyRating).toBeGreaterThan(0);
    expect(metrics.efficiencyRating).toBeLessThanOrEqual(10);
  });
  
  test('handles unknown GPU models', () => {
    const unknownGpuConfig = {
      model: 'Unknown RTX 5090',
      memory: 32768,
      powerConsumption: 500,
      clockSpeed: 2800,
      quantity: 1
    };
    
    const result = validateGpuConfiguration(unknownGpuConfig);
    
    expect(result.isValid).toBe(true);
    expect(result.isCustomModel).toBe(true);
    expect(result.requiresManualVerification).toBe(true);
    expect(result.warnings).toContain('Unknown GPU model - using manual specifications');
  });
  
  test('detects overclocking configurations', () => {
    const overclockedConfig = {
      model: 'RTX 4090',
      memory: 24576,
      powerConsumption: 450,
      clockSpeed: 3000, // Above stock clock
      memoryClockSpeed: 21000, // Above stock memory clock
      quantity: 1,
      isOverclocked: true
    };
    
    const result = validateGpuConfiguration(overclockedConfig);
    
    expect(result.isValid).toBe(true);
    expect(result.isOverclocked).toBe(true);
    expect(result.overclockingRisk).toMatch(/medium|high/);
    expect(result.warnings).toContain('Overclocked configuration detected');
  });
});
```

### TEST-003: Revenue Calculation Engine
```javascript
describe('Revenue Calculation Engine', () => {
  const mockMarketData = {
    'RTX 4090': {
      averageRate: 0.45, // $/hour
      demandMultiplier: 1.2,
      utilizationRate: 0.85
    },
    'RTX 3080': {
      averageRate: 0.28,
      demandMultiplier: 1.1,
      utilizationRate: 0.82
    }
  };
  
  test('calculates daily revenue estimates accurately', () => {
    const portfolioConfig = {
      gpus: [
        {
          model: 'RTX 4090',
          quantity: 2,
          utilizationRate: 0.9
        },
        {
          model: 'RTX 3080',
          quantity: 4,
          utilizationRate: 0.85
        }
      ],
      powerCost: 0.12, // $/kWh
      platformFee: 0.05 // 5%
    };
    
    const revenue = calculateDailyRevenue(portfolioConfig, mockMarketData);
    
    expect(revenue).toMatchObject({
      grossRevenue: expect.any(Number),
      powerCosts: expect.any(Number),
      platformFees: expect.any(Number),
      netRevenue: expect.any(Number),
      profitMargin: expect.any(Number),
      breakdown: expect.any(Array)
    });
    
    expect(revenue.netRevenue).toBeLessThan(revenue.grossRevenue);
    expect(revenue.profitMargin).toBeGreaterThan(0);
    expect(revenue.profitMargin).toBeLessThan(1);
    expect(revenue.breakdown).toHaveLength(2); // One per GPU model
  });
  
  test('accounts for power consumption and costs', () => {
    const highPowerConfig = {
      gpus: [{
        model: 'RTX 4090',
        quantity: 1,
        powerConsumption: 450,
        utilizationRate: 1.0
      }],
      powerCost: 0.20, // High power cost
      platformFee: 0.05
    };
    
    const lowPowerConfig = {
      ...highPowerConfig,
      powerCost: 0.08 // Low power cost
    };
    
    const highPowerRevenue = calculateDailyRevenue(highPowerConfig, mockMarketData);
    const lowPowerRevenue = calculateDailyRevenue(lowPowerConfig, mockMarketData);
    
    expect(lowPowerRevenue.netRevenue).toBeGreaterThan(highPowerRevenue.netRevenue);
    expect(lowPowerRevenue.profitMargin).toBeGreaterThan(highPowerRevenue.profitMargin);
  });
  
  test('handles market volatility scenarios', () => {
    const baseConfig = {
      gpus: [{
        model: 'RTX 4090',
        quantity: 1,
        utilizationRate: 0.9
      }],
      powerCost: 0.12,
      platformFee: 0.05
    };
    
    const volatileMarketData = {
      'RTX 4090': {
        averageRate: 0.45,
        demandMultiplier: 0.6, // Low demand
        utilizationRate: 0.5,   // Low utilization
        volatilityRisk: 'high'
      }
    };
    
    const revenue = calculateDailyRevenue(baseConfig, volatileMarketData);
    
    expect(revenue.riskLevel).toBe('high');
    expect(revenue.confidenceInterval).toBeDefined();
    expect(revenue.confidenceInterval.lower).toBeLessThan(revenue.netRevenue);
    expect(revenue.confidenceInterval.upper).toBeGreaterThan(revenue.netRevenue);
  });
});
```

### TEST-004: Platform Integration Management
```javascript
describe('Platform Integration Management', () => {
  test('validates platform connection configurations', () => {
    const validConfigurations = [
      {
        platform: 'runpod',
        instanceId: 'rnpd-12345',
        apiKey: 'rp-api-key-123',
        region: 'us-west-1'
      },
      {
        platform: 'lambda-labs',
        instanceId: 'll-instance-456',
        apiKey: 'll-api-key-456',
        region: 'us-east-1'
      },
      {
        platform: 'custom',
        name: 'My Custom Platform',
        endpoint: 'https://my-gpu-platform.com/api',
        authToken: 'custom-auth-token'
      }
    ];
    
    validConfigurations.forEach(config => {
      const result = validatePlatformConfiguration(config);
      expect(result.isValid).toBe(true);
      expect(result.supportedFeatures).toBeDefined();
      expect(result.supportedFeatures.length).toBeGreaterThan(0);
    });
  });
  
  test('detects connection issues and provides diagnostics', async () => {
    const invalidConfig = {
      platform: 'runpod',
      instanceId: 'invalid-instance',
      apiKey: 'invalid-key',
      region: 'invalid-region'
    };
    
    const connectionTest = await testPlatformConnection(invalidConfig);
    
    expect(connectionTest.isConnected).toBe(false);
    expect(connectionTest.error).toBeDefined();
    expect(connectionTest.diagnostics).toMatchObject({
      dnsResolution: expect.any(Boolean),
      tcpConnection: expect.any(Boolean),
      httpResponse: expect.any(Boolean),
      authentication: expect.any(Boolean),
      apiAccess: expect.any(Boolean)
    });
    
    expect(connectionTest.suggestions).toBeInstanceOf(Array);
    expect(connectionTest.suggestions.length).toBeGreaterThan(0);
  });
  
  test('handles platform API rate limiting gracefully', async () => {
    const config = {
      platform: 'runpod',
      instanceId: 'rnpd-rate-limited',
      apiKey: 'rp-api-key-rate',
      region: 'us-west-1'
    };
    
    // Mock rate-limited responses
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({ status: 429, headers: { 'retry-after': '60' } })
      .mockResolvedValueOnce({ status: 200, json: () => ({ status: 'active' }) });
    
    global.fetch = mockFetch;
    
    const result = await fetchPlatformData(config);
    
    expect(result.success).toBe(true);
    expect(result.retryCount).toBe(1);
    expect(result.totalTime).toBeGreaterThan(1000); // Should have waited
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
  
  test('synchronizes GPU status across platforms', async () => {
    const multiPlatformConfig = {
      platforms: [
        {
          platform: 'runpod',
          instanceId: 'rnpd-multi-1',
          gpus: ['gpu-1', 'gpu-2']
        },
        {
          platform: 'lambda-labs',
          instanceId: 'll-multi-2',
          gpus: ['gpu-3', 'gpu-4']
        }
      ]
    };
    
    const mockPlatformResponses = {
      'runpod': {
        'gpu-1': { status: 'active', utilization: 85 },
        'gpu-2': { status: 'maintenance', utilization: 0 }
      },
      'lambda-labs': {
        'gpu-3': { status: 'active', utilization: 92 },
        'gpu-4': { status: 'active', utilization: 78 }
      }
    };
    
    const syncResult = await synchronizePlatformData(multiPlatformConfig, mockPlatformResponses);
    
    expect(syncResult.totalGpus).toBe(4);
    expect(syncResult.activeGpus).toBe(3);
    expect(syncResult.averageUtilization).toBeCloseTo(85); // (85+0+92+78)/4
    expect(syncResult.platformHealth).toMatchObject({
      runpod: 'warning', // Has maintenance GPU
      'lambda-labs': 'healthy'
    });
  });
});
```

## Integration Tests

### TEST-101: Portfolio CRUD Operations
```javascript
describe('Portfolio CRUD API', () => {
  let testDb;
  let testUser;
  
  beforeEach(async () => {
    testDb = await setupTestDatabase();
    testUser = await createTestUser({
      email: 'portfolio-test@example.com',
      subscriptionTier: 'professional'
    });
  });
  
  afterEach(async () => {
    await cleanupTestDatabase(testDb);
  });
  
  test('creates portfolio with GPUs successfully', async () => {
    const portfolioData = {
      name: 'Test Mining Rig',
      description: 'My first GPU portfolio',
      gpus: [
        {
          model: 'RTX 4090',
          quantity: 2,
          customName: 'Primary Mining GPUs',
          powerConsumption: 450,
          clockSpeed: 2520
        },
        {
          model: 'RTX 3080',
          quantity: 1,
          customName: 'Secondary GPU',
          powerConsumption: 320,
          clockSpeed: 1710
        }
      ],
      powerSettings: {
        costPerKwh: 0.12,
        monthlyAllowance: 1000
      }
    };
    
    const response = await request(app)
      .post('/api/v1/portfolios')
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .send(portfolioData)
      .expect(201);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      id: expect.any(String),
      name: 'Test Mining Rig',
      description: 'My first GPU portfolio',
      userId: testUser.id,
      totalGpus: 3,
      totalMemory: 59392, // (24576 * 2) + 10240
      totalPowerConsumption: 1220, // (450 * 2) + 320
      estimatedDailyRevenue: expect.any(Number),
      createdAt: expect.any(String)
    });
    
    // Verify GPUs were created
    const gpus = await testDb.prepare(
      'SELECT * FROM gpus WHERE portfolio_id = ?'
    ).bind(response.body.data.id).all();
    
    expect(gpus).toHaveLength(3); // 2 RTX 4090s + 1 RTX 3080
    
    // Verify performance metrics were calculated
    const metrics = await testDb.prepare(
      'SELECT * FROM portfolio_metrics WHERE portfolio_id = ?'
    ).bind(response.body.data.id).first();
    
    expect(metrics).toBeTruthy();
    expect(metrics.hash_rate).toBeGreaterThan(0);
    expect(metrics.efficiency_rating).toBeGreaterThan(0);
  });
  
  test('enforces tier-based portfolio limits', async () => {
    // Create free tier user
    const freeUser = await createTestUser({
      email: 'free-user@example.com',
      subscriptionTier: 'free'
    });
    
    // Create first portfolio (should succeed)
    const firstPortfolio = {
      name: 'First Portfolio',
      description: 'Should succeed',
      gpus: [{ model: 'RTX 3080', quantity: 1 }]
    };
    
    await request(app)
      .post('/api/v1/portfolios')
      .set('Authorization', `Bearer ${freeUser.accessToken}`)
      .send(firstPortfolio)
      .expect(201);
    
    // Try to create second portfolio (should fail)
    const secondPortfolio = {
      name: 'Second Portfolio',
      description: 'Should fail for free tier',
      gpus: [{ model: 'RTX 3080', quantity: 1 }]
    };
    
    const response = await request(app)
      .post('/api/v1/portfolios')
      .set('Authorization', `Bearer ${freeUser.accessToken}`)
      .send(secondPortfolio)
      .expect(403);
    
    expect(response.body.error).toMatch(/portfolio limit.*free tier/i);
    expect(response.body.data.currentLimit).toBe(1);
    expect(response.body.data.upgradeUrl).toBeDefined();
  });
  
  test('updates portfolio configuration', async () => {
    // Create initial portfolio
    const portfolio = await createTestPortfolio(testUser.id, {
      name: 'Original Name',
      description: 'Original description'
    });
    
    const updateData = {
      name: 'Updated Portfolio Name',
      description: 'Updated description with more details',
      powerSettings: {
        costPerKwh: 0.15,
        monthlyAllowance: 1500
      }
    };
    
    const response = await request(app)
      .put(`/api/v1/portfolios/${portfolio.id}`)
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .send(updateData)
      .expect(200);
    
    expect(response.body.data).toMatchObject({
      id: portfolio.id,
      name: 'Updated Portfolio Name',
      description: 'Updated description with more details',
      powerSettings: {
        costPerKwh: 0.15,
        monthlyAllowance: 1500
      },
      updatedAt: expect.any(String)
    });
    
    // Verify database was updated
    const updatedPortfolio = await testDb.prepare(
      'SELECT * FROM portfolios WHERE id = ?'
    ).bind(portfolio.id).first();
    
    expect(updatedPortfolio.name).toBe('Updated Portfolio Name');
    expect(updatedPortfolio.description).toBe('Updated description with more details');
  });
  
  test('deletes portfolio and associated data', async () => {
    // Create portfolio with GPUs and metrics
    const portfolio = await createTestPortfolio(testUser.id, {
      name: 'Portfolio to Delete',
      gpus: [{ model: 'RTX 4090', quantity: 1 }]
    });
    
    // Add some performance data
    await testDb.prepare(`
      INSERT INTO performance_metrics (portfolio_id, gpu_id, utilization, temperature, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(portfolio.id, 'test-gpu-id', 85.5, 72.0, new Date().toISOString()).run();
    
    const response = await request(app)
      .delete(`/api/v1/portfolios/${portfolio.id}`)
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.deleted).toBe(true);
    
    // Verify portfolio was deleted
    const deletedPortfolio = await testDb.prepare(
      'SELECT * FROM portfolios WHERE id = ?'
    ).bind(portfolio.id).first();
    
    expect(deletedPortfolio).toBeNull();
    
    // Verify associated GPUs were deleted (CASCADE)
    const gpus = await testDb.prepare(
      'SELECT * FROM gpus WHERE portfolio_id = ?'
    ).bind(portfolio.id).all();
    
    expect(gpus).toHaveLength(0);
    
    // Verify performance metrics were deleted
    const metrics = await testDb.prepare(
      'SELECT * FROM performance_metrics WHERE portfolio_id = ?'
    ).bind(portfolio.id).all();
    
    expect(metrics).toHaveLength(0);
  });
});
```

### TEST-102: Performance Metrics Collection
```javascript
describe('Performance Metrics Collection', () => {
  let testDb;
  let testPortfolio;
  let mockPlatformAdapters;
  
  beforeEach(async () => {
    testDb = await setupTestDatabase();
    testPortfolio = await createTestPortfolio('test-user-1', {
      name: 'Metrics Test Portfolio',
      gpus: [
        { model: 'RTX 4090', quantity: 1, instanceId: 'rnpd-gpu-1' },
        { model: 'RTX 3080', quantity: 1, instanceId: 'll-gpu-2' }
      ]
    });
    
    mockPlatformAdapters = {
      runpod: {
        getMetrics: jest.fn().mockResolvedValue({
          'rnpd-gpu-1': {
            utilization: 87.5,
            temperature: 68.2,
            powerUsage: 425,
            memoryUsage: 20480,
            uptime: 86400,
            errors: []
          }
        })
      },
      'lambda-labs': {
        getMetrics: jest.fn().mockResolvedValue({
          'll-gpu-2': {
            utilization: 92.1,
            temperature: 74.8,
            powerUsage: 315,
            memoryUsage: 8920,
            uptime: 82800,
            errors: []
          }
        })
      }
    };
  });
  
  test('collects metrics from multiple platforms', async () => {
    const metricsCollector = new MetricsCollector(mockPlatformAdapters);
    const result = await metricsCollector.collectPortfolioMetrics(testPortfolio.id);
    
    expect(result.success).toBe(true);
    expect(result.collectedAt).toBeDefined();
    expect(result.metrics).toHaveLength(2);
    
    const rtx4090Metrics = result.metrics.find(m => m.instanceId === 'rnpd-gpu-1');
    const rtx3080Metrics = result.metrics.find(m => m.instanceId === 'll-gpu-2');
    
    expect(rtx4090Metrics).toMatchObject({
      utilization: 87.5,
      temperature: 68.2,
      powerUsage: 425,
      status: 'active'
    });
    
    expect(rtx3080Metrics).toMatchObject({
      utilization: 92.1,
      temperature: 74.8,
      powerUsage: 315,
      status: 'active'
    });
    
    // Verify data was stored in database
    const storedMetrics = await testDb.prepare(
      'SELECT * FROM performance_metrics WHERE portfolio_id = ? ORDER BY created_at DESC LIMIT 2'
    ).bind(testPortfolio.id).all();
    
    expect(storedMetrics).toHaveLength(2);
    expect(storedMetrics[0].utilization).toBeOneOf([87.5, 92.1]);
  });
  
  test('handles platform connection failures gracefully', async () => {
    // Mock platform failure
    mockPlatformAdapters.runpod.getMetrics.mockRejectedValue(
      new Error('Connection timeout')
    );
    
    const metricsCollector = new MetricsCollector(mockPlatformAdapters);
    const result = await metricsCollector.collectPortfolioMetrics(testPortfolio.id);
    
    expect(result.success).toBe(true); // Partial success
    expect(result.metrics).toHaveLength(1); // Only Lambda Labs data
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      platform: 'runpod',
      error: 'Connection timeout',
      instanceId: 'rnpd-gpu-1'
    });
    
    // Verify error was logged for monitoring
    expect(mockPlatformAdapters.runpod.getMetrics).toHaveBeenCalledTimes(1);
  });
  
  test('calculates portfolio-level aggregated metrics', async () => {
    const metricsCollector = new MetricsCollector(mockPlatformAdapters);
    await metricsCollector.collectPortfolioMetrics(testPortfolio.id);
    
    const aggregated = await calculateAggregatedMetrics(testPortfolio.id);
    
    expect(aggregated).toMatchObject({
      portfolioId: testPortfolio.id,
      totalUtilization: expect.any(Number),
      averageTemperature: expect.any(Number),
      totalPowerUsage: expect.any(Number),
      activeGpus: 2,
      totalGpus: 2,
      healthScore: expect.any(Number),
      estimatedDailyRevenue: expect.any(Number),
      calculatedAt: expect.any(String)
    });
    
    // Utilization should be weighted average
    const expectedUtilization = (87.5 + 92.1) / 2;
    expect(aggregated.totalUtilization).toBeCloseTo(expectedUtilization, 1);
    
    // Power usage should be sum
    expect(aggregated.totalPowerUsage).toBe(425 + 315);
    
    // Health score should be between 0-100
    expect(aggregated.healthScore).toBeGreaterThanOrEqual(0);
    expect(aggregated.healthScore).toBeLessThanOrEqual(100);
  });
  
  test('detects and alerts on performance anomalies', async () => {
    // Mock anomalous data
    mockPlatformAdapters.runpod.getMetrics.mockResolvedValue({
      'rnpd-gpu-1': {
        utilization: 15.2, // Unusually low
        temperature: 92.5, // Unusually high
        powerUsage: 450,
        memoryUsage: 20480,
        uptime: 86400,
        errors: ['Thermal throttling detected']
      }
    });
    
    const metricsCollector = new MetricsCollector(mockPlatformAdapters);
    const result = await metricsCollector.collectPortfolioMetrics(testPortfolio.id);
    
    expect(result.anomalies).toBeDefined();
    expect(result.anomalies).toHaveLength(2);
    
    const lowUtilizationAnomaly = result.anomalies.find(a => a.type === 'low_utilization');
    const highTemperatureAnomaly = result.anomalies.find(a => a.type === 'high_temperature');
    
    expect(lowUtilizationAnomaly).toMatchObject({
      type: 'low_utilization',
      severity: 'warning',
      instanceId: 'rnpd-gpu-1',
      value: 15.2,
      threshold: expect.any(Number),
      recommendation: expect.stringContaining('check for')
    });
    
    expect(highTemperatureAnomaly).toMatchObject({
      type: 'high_temperature',
      severity: 'critical',
      instanceId: 'rnpd-gpu-1',
      value: 92.5,
      threshold: expect.any(Number),
      recommendation: expect.stringContaining('cooling')
    });
  });
});
```

### TEST-103: Real-time Performance Updates
```javascript
describe('Real-time Performance Updates', () => {
  let testDb;
  let wsServer;
  let wsClient;
  let testPortfolio;
  
  beforeEach(async () => {
    testDb = await setupTestDatabase();
    wsServer = await setupTestWebSocketServer();
    testPortfolio = await createTestPortfolio('test-user-ws', {
      name: 'WebSocket Test Portfolio'
    });
  });
  
  afterEach(async () => {
    if (wsClient) await wsClient.close();
    await wsServer.close();
    await cleanupTestDatabase(testDb);
  });
  
  test('broadcasts performance updates via WebSocket', async () => {
    // Connect WebSocket client
    wsClient = new WebSocket(`ws://localhost:${wsServer.port}/ws/portfolio/${testPortfolio.id}`);
    
    const messagePromise = new Promise((resolve) => {
      wsClient.on('message', (data) => {
        resolve(JSON.parse(data));
      });
    });
    
    // Simulate performance metrics update
    const newMetrics = {
      portfolioId: testPortfolio.id,
      gpuId: 'test-gpu-1',
      utilization: 88.7,
      temperature: 69.3,
      powerUsage: 430,
      timestamp: new Date().toISOString()
    };
    
    await broadcastPerformanceUpdate(newMetrics);
    
    const receivedMessage = await messagePromise;
    
    expect(receivedMessage).toMatchObject({
      type: 'performance_update',
      data: {
        portfolioId: testPortfolio.id,
        gpuId: 'test-gpu-1',
        metrics: {
          utilization: 88.7,
          temperature: 69.3,
          powerUsage: 430
        },
        timestamp: expect.any(String)
      }
    });
  });
  
  test('handles WebSocket connection authentication', async () => {
    // Try connecting without proper authentication
    const unauthorizedWs = new WebSocket(
      `ws://localhost:${wsServer.port}/ws/portfolio/${testPortfolio.id}`
    );
    
    const closePromise = new Promise((resolve) => {
      unauthorizedWs.on('close', (code, reason) => {
        resolve({ code, reason: reason.toString() });
      });
    });
    
    const { code, reason } = await closePromise;
    
    expect(code).toBe(1008); // Policy Violation
    expect(reason).toContain('Authentication required');
  });
  
  test('manages WebSocket connection lifecycle', async () => {
    const connectionManager = new WebSocketConnectionManager();
    
    // Simulate user connecting
    const mockWs = {
      id: 'test-connection-1',
      userId: 'test-user-ws',
      portfolioId: testPortfolio.id,
      send: jest.fn(),
      close: jest.fn(),
      readyState: 1 // OPEN
    };
    
    connectionManager.addConnection(mockWs);
    
    expect(connectionManager.getConnectionCount()).toBe(1);
    expect(connectionManager.getConnectionsForUser('test-user-ws')).toHaveLength(1);
    
    // Simulate sending update to user's connections
    const updateData = {
      type: 'performance_update',
      data: { portfolioId: testPortfolio.id, utilization: 85 }
    };
    
    await connectionManager.sendToUser('test-user-ws', updateData);
    
    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify(updateData));
    
    // Simulate connection cleanup
    connectionManager.removeConnection(mockWs.id);
    expect(connectionManager.getConnectionCount()).toBe(0);
  });
  
  test('batches multiple metrics updates efficiently', async () => {
    const batchProcessor = new MetricsBatchProcessor({
      batchSize: 10,
      flushInterval: 1000 // 1 second
    });
    
    const mockUpdates = Array.from({ length: 15 }, (_, i) => ({
      portfolioId: testPortfolio.id,
      gpuId: `gpu-${i}`,
      utilization: 80 + i,
      temperature: 65 + i,
      timestamp: new Date().toISOString()
    }));
    
    // Add updates to batch
    mockUpdates.forEach(update => {
      batchProcessor.addUpdate(update);
    });
    
    // Flush and verify batching
    const batches = await batchProcessor.flush();
    
    expect(batches).toHaveLength(2); // 10 + 5 updates
    expect(batches[0]).toHaveLength(10);
    expect(batches[1]).toHaveLength(5);
    
    // Verify all updates were processed
    const totalProcessed = batches.reduce((sum, batch) => sum + batch.length, 0);
    expect(totalProcessed).toBe(15);
  });
});
```

## E2E Tests

### TEST-201: Portfolio Creation Journey
```javascript
describe('Portfolio Creation E2E Journey', () => {
  test('user can create complete portfolio from wizard', async () => {
    const page = await browser.newPage();
    const testUser = await createTestUser({
      email: 'portfolio-e2e@example.com',
      subscriptionTier: 'professional'
    });
    
    try {
      // Login
      await loginUser(page, testUser);
      
      // Navigate to portfolio creation
      await page.goto('/portfolio/create');
      await expect(page.locator('h1')).toContainText('Create Portfolio');
      
      // Step 1: Basic Information
      await page.fill('[name="name"]', 'E2E Test Portfolio');
      await page.fill('[name="description"]', 'Created via automated E2E test');
      await page.click('[data-testid="next-step"]');
      
      // Step 2: GPU Selection
      await expect(page.locator('.step-indicator.active')).toContainText('GPU Selection');
      
      // Add RTX 4090
      await page.click('[data-testid="add-gpu-button"]');
      await page.selectOption('[name="gpuModel"]', 'RTX 4090');
      await page.fill('[name="quantity"]', '2');
      await page.fill('[name="customName"]', 'Primary Mining GPUs');
      await page.click('[data-testid="confirm-gpu"]');
      
      // Add RTX 3080
      await page.click('[data-testid="add-gpu-button"]');
      await page.selectOption('[name="gpuModel"]', 'RTX 3080');
      await page.fill('[name="quantity"]', '1');
      await page.fill('[name="customName"]', 'Secondary GPU');
      await page.click('[data-testid="confirm-gpu"]');
      
      // Verify GPU summary
      await expect(page.locator('[data-testid="gpu-summary"]')).toContainText('3 GPUs total');
      await expect(page.locator('[data-testid="total-memory"]')).toContainText('59,392 MB');
      
      await page.click('[data-testid="next-step"]');
      
      // Step 3: Platform Configuration
      await expect(page.locator('.step-indicator.active')).toContainText('Platform Setup');
      
      // Configure RunPod for RTX 4090s
      await page.click('[data-testid="configure-platform-RTX 4090"]');
      await page.selectOption('[name="platform"]', 'runpod');
      await page.fill('[name="instanceId"]', 'rnpd-test-instance');
      await page.fill('[name="apiKey"]', 'test-api-key');
      await page.click('[data-testid="test-connection"]');
      
      // Wait for connection test
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
      await page.click('[data-testid="save-platform-config"]');
      
      await page.click('[data-testid="next-step"]');
      
      // Step 4: Power & Revenue Settings
      await expect(page.locator('.step-indicator.active')).toContainText('Settings');
      
      await page.fill('[name="powerCostPerKwh"]', '0.12');
      await page.fill('[name="monthlyPowerAllowance"]', '1000');
      await page.selectOption('[name="currency"]', 'USD');
      await page.selectOption('[name="timezone"]', 'America/New_York');
      
      await page.click('[data-testid="next-step"]');
      
      // Step 5: Review & Create
      await expect(page.locator('.step-indicator.active')).toContainText('Review');
      
      // Verify all configuration details
      await expect(page.locator('[data-testid="review-name"]')).toContainText('E2E Test Portfolio');
      await expect(page.locator('[data-testid="review-gpu-count"]')).toContainText('3');
      await expect(page.locator('[data-testid="review-power-cost"]')).toContainText('$0.12');
      await expect(page.locator('[data-testid="estimated-revenue"]')).toBeVisible();
      
      // Create portfolio
      await page.click('[data-testid="create-portfolio"]');
      
      // Wait for creation success
      await expect(page.locator('.success-message')).toContainText('Portfolio created successfully');
      
      // Should redirect to portfolio dashboard
      await expect(page).toHaveURL(/\/portfolio\/[a-f0-9-]+$/);
      await expect(page.locator('[data-testid="portfolio-name"]')).toContainText('E2E Test Portfolio');
      
      // Verify GPU cards are displayed
      const gpuCards = page.locator('[data-testid="gpu-card"]');
      await expect(gpuCards).toHaveCount(3);
      
    } finally {
      await page.close();
    }
  });
  
  test('validates wizard steps and prevents invalid progression', async () => {
    const page = await browser.newPage();
    const testUser = await createTestUser({
      email: 'validation-test@example.com',
      subscriptionTier: 'free'
    });
    
    try {
      await loginUser(page, testUser);
      await page.goto('/portfolio/create');
      
      // Try to proceed without required fields
      const nextButton = page.locator('[data-testid="next-step"]');
      await expect(nextButton).toBeDisabled();
      
      // Fill only name (missing description)
      await page.fill('[name="name"]', 'Test Portfolio');
      await expect(nextButton).toBeDisabled();
      
      // Fill description
      await page.fill('[name="description"]', 'Test description');
      await expect(nextButton).toBeEnabled();
      
      await page.click('[data-testid="next-step"]');
      
      // GPU selection step - try to proceed without adding GPUs
      await expect(page.locator('[data-testid="next-step"]')).toBeDisabled();
      
      // Add a GPU
      await page.click('[data-testid="add-gpu-button"]');
      await page.selectOption('[name="gpuModel"]', 'RTX 4090');
      await page.fill('[name="quantity"]', '1');
      await page.click('[data-testid="confirm-gpu"]');
      
      await expect(page.locator('[data-testid="next-step"]')).toBeEnabled();
      
      // Test free tier GPU limit enforcement
      await page.click('[data-testid="add-gpu-button"]');
      await page.selectOption('[name="gpuModel"]', 'RTX 3080');
      await page.fill('[name="quantity"]', '2'); // Would exceed free tier limit
      
      const confirmButton = page.locator('[data-testid="confirm-gpu"]');
      await expect(confirmButton).toBeDisabled();
      
      // Should show upgrade message
      await expect(page.locator('[data-testid="upgrade-message"]')).toContainText('upgrade');
      
    } finally {
      await page.close();
    }
  });
});
```

### TEST-202: Portfolio Management Interface
```javascript
describe('Portfolio Management Interface E2E', () => {
  test('displays real-time performance metrics', async () => {
    const page = await browser.newPage();
    const testUser = await createTestUser({
      email: 'metrics-e2e@example.com'
    });
    
    // Create test portfolio with mock data
    const portfolio = await createTestPortfolio(testUser.id, {
      name: 'Performance Test Portfolio',
      gpus: [
        { model: 'RTX 4090', quantity: 1, instanceId: 'test-gpu-1' }
      ]
    });
    
    try {
      await loginUser(page, testUser);
      await page.goto(`/portfolio/${portfolio.id}`);
      
      // Verify initial load
      await expect(page.locator('[data-testid="portfolio-name"]')).toContainText('Performance Test Portfolio');
      
      // Check for metrics widgets
      await expect(page.locator('[data-testid="utilization-widget"]')).toBeVisible();
      await expect(page.locator('[data-testid="temperature-widget"]')).toBeVisible();
      await expect(page.locator('[data-testid="revenue-widget"]')).toBeVisible();
      
      // Simulate real-time update
      await simulateMetricsUpdate(portfolio.id, {
        utilization: 87.5,
        temperature: 68.2,
        revenue: 24.50
      });
      
      // Verify metrics updated
      await expect(page.locator('[data-testid="utilization-value"]')).toContainText('87.5%');
      await expect(page.locator('[data-testid="temperature-value"]')).toContainText('68.2°C');
      await expect(page.locator('[data-testid="revenue-value"]')).toContainText('$24.50');
      
      // Test time range selector
      await page.click('[data-testid="time-range-selector"]');
      await page.click('[data-testid="range-7d"]');
      
      // Charts should update for 7-day view
      await expect(page.locator('[data-testid="utilization-chart"]')).toBeVisible();
      await page.waitForTimeout(1000); // Allow chart to re-render
      
      // Test GPU detail view
      await page.click('[data-testid="gpu-card-test-gpu-1"]');
      await expect(page.locator('[data-testid="gpu-detail-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="gpu-model"]')).toContainText('RTX 4090');
      
    } finally {
      await page.close();
    }
  });
  
  test('handles configuration changes and updates', async () => {
    const page = await browser.newPage();
    const testUser = await createTestUser({
      email: 'config-e2e@example.com',
      subscriptionTier: 'professional'
    });
    
    const portfolio = await createTestPortfolio(testUser.id, {
      name: 'Configuration Test Portfolio'
    });
    
    try {
      await loginUser(page, testUser);
      await page.goto(`/portfolio/${portfolio.id}/settings`);
      
      // Update portfolio settings
      await page.fill('[name="name"]', 'Updated Portfolio Name');
      await page.fill('[name="powerCostPerKwh"]', '0.15');
      await page.click('[data-testid="save-settings"]');
      
      // Should show success message
      await expect(page.locator('.success-notification')).toContainText('Settings updated');
      
      // Navigate back to dashboard and verify changes
      await page.goto(`/portfolio/${portfolio.id}`);
      await expect(page.locator('[data-testid="portfolio-name"]')).toContainText('Updated Portfolio Name');
      
      // Add new GPU
      await page.click('[data-testid="add-gpu-button"]');
      await page.selectOption('[name="gpuModel"]', 'RTX 3080');
      await page.fill('[name="quantity"]', '1');
      await page.fill('[name="customName"]', 'New GPU');
      await page.click('[data-testid="confirm-add-gpu"]');
      
      // Should see new GPU in list
      await expect(page.locator('[data-testid="gpu-list"]')).toContainText('New GPU');
      await expect(page.locator('[data-testid="total-gpu-count"]')).toContainText('2');
      
      // Test GPU removal
      await page.click('[data-testid="gpu-options-New GPU"]');
      await page.click('[data-testid="remove-gpu"]');
      await page.click('[data-testid="confirm-removal"]');
      
      // GPU should be removed
      await expect(page.locator('[data-testid="gpu-list"]')).not.toContainText('New GPU');
      await expect(page.locator('[data-testid="total-gpu-count"]')).toContainText('1');
      
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
  - metric: portfolio_creation_time_p95
    threshold: 5000ms
    query: "histogram_quantile(0.95, portfolio_creation_duration_seconds)"
  - metric: metrics_collection_time_p95
    threshold: 2000ms
    query: "histogram_quantile(0.95, metrics_collection_duration_seconds)"
  - metric: dashboard_load_time_p95
    threshold: 3000ms
    query: "histogram_quantile(0.95, dashboard_load_duration_seconds)"
  - metric: websocket_message_latency_p95
    threshold: 100ms
    query: "histogram_quantile(0.95, websocket_message_latency_seconds)"
  - metric: portfolio_api_error_rate
    threshold: 0.1%
    query: "rate(portfolio_api_errors_total[5m])"
```

### Error Monitoring with Sentry MCP
```javascript
describe('Portfolio Error Tracking', () => {
  test('captures platform integration failures', async () => {
    // Simulate RunPod API failure
    const mockRunPodError = new Error('RunPod API rate limit exceeded');
    mockRunPodError.response = { status: 429, statusText: 'Too Many Requests' };
    
    jest.spyOn(runpodAdapter, 'getMetrics').mockRejectedValue(mockRunPodError);
    
    const result = await collectPortfolioMetrics('test-portfolio-id');
    
    // Verify Sentry captured the integration error
    const events = await sentry.getEvents({
      tag: 'platform.integration_error'
    });
    
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      level: 'error',
      message: 'RunPod API rate limit exceeded',
      context: {
        platform: 'runpod',
        portfolioId: 'test-portfolio-id',
        httpStatus: 429
      },
      tags: {
        platform: 'runpod',
        error_type: 'rate_limit'
      }
    });
  });
});
```

## Test Data and Fixtures

### Portfolio Test Data
```json
{
  "validPortfolios": [
    {
      "name": "Mining Rig Alpha",
      "description": "Primary cryptocurrency mining setup",
      "gpus": [
        {
          "model": "RTX 4090",
          "quantity": 2,
          "customName": "Alpha Primary",
          "powerConsumption": 450,
          "clockSpeed": 2520
        }
      ],
      "powerSettings": {
        "costPerKwh": 0.12,
        "monthlyAllowance": 1000
      }
    }
  ],
  "gpuModels": [
    {
      "model": "RTX 4090",
      "memory": 24576,
      "basePower": 450,
      "baseClock": 2520,
      "computeCapability": 8.9
    },
    {
      "model": "RTX 3080",
      "memory": 10240,
      "basePower": 320,
      "baseClock": 1710,
      "computeCapability": 8.6
    }
  ]
}
```

## IMPORTANT: Test Immutability
These tests are IMMUTABLE CONTRACTS. Once approved by human reviewer:
- **Hash**: SHA-256 will be calculated and stored
- **Claude Code CANNOT modify these tests**
- **Only humans can update tests with new hash approval**
- **Failed tests = failed implementation - no exceptions**
- **Missing MCP tools = blocked implementation - must alert user**

All tests must pass 100% before feature is considered complete. Test coverage must exceed 90% for all portfolio management code.