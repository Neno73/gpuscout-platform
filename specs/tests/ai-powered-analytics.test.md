# Test Specification: AI-Powered Analytics

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
timeout: 45000
external_services:
  - claude_ai: mock_service
  - gemini_ai: mock_service
```

## Unit Tests

### TEST-001: Conversation Context Management
```javascript
describe('Conversation Context Management', () => {
  test('maintains conversation context across messages', () => {
    const contextManager = new ConversationContextManager();
    
    const conversation = [
      { role: 'user', content: 'What is the optimal temperature for RTX 4090?' },
      { role: 'assistant', content: 'RTX 4090 should operate between 65-75°C for optimal performance.' },
      { role: 'user', content: 'What about power consumption at that temperature?' }
    ];
    
    const context = contextManager.buildContext('user-123', conversation);
    
    expect(context.conversationHistory).toHaveLength(3);
    expect(context.currentTopic).toBe('gpu_temperature_optimization');
    expect(context.mentionedGpus).toContain('RTX 4090');
    expect(context.contextWindow).toBeLessThanOrEqual(4096); // Token limit
  });
  
  test('summarizes long conversations to fit context window', () => {
    const contextManager = new ConversationContextManager();
    
    // Create a very long conversation
    const longConversation = Array.from({ length: 50 }, (_, i) => [
      { role: 'user', content: `Question ${i + 1} about GPU mining performance` },
      { role: 'assistant', content: `Answer ${i + 1} about optimizing mining setup` }
    ]).flat();
    
    const context = contextManager.buildContext('user-123', longConversation);
    
    expect(context.conversationHistory.length).toBeLessThan(longConversation.length);
    expect(context.summary).toBeDefined();
    expect(context.summary).toContain('mining performance');
    expect(context.contextWindow).toBeLessThanOrEqual(4096);
  });
  
  test('extracts user portfolio context for personalization', async () => {
    const mockUserPortfolio = {
      userId: 'user-123',
      portfolios: [
        {
          id: 'portfolio-1',
          gpus: [
            { model: 'RTX 4090', quantity: 2, utilization: 85 },
            { model: 'RTX 3080', quantity: 1, utilization: 92 }
          ],
          totalRevenue: 45.20,
          efficiencyScore: 8.7
        }
      ],
      subscriptionTier: 'professional',
      experienceLevel: 'intermediate'
    };
    
    const contextManager = new ConversationContextManager();
    const enrichedContext = await contextManager.enrichWithUserContext('user-123', mockUserPortfolio);
    
    expect(enrichedContext.userProfile).toMatchObject({
      subscriptionTier: 'professional',
      experienceLevel: 'intermediate',
      totalGpus: 3,
      primaryGpuModels: ['RTX 4090', 'RTX 3080'],
      avgUtilization: expect.any(Number),
      revenueRange: 'medium'
    });
    
    expect(enrichedContext.personalizedPrompts).toBeDefined();
    expect(enrichedContext.personalizedPrompts).toContain('RTX 4090');
  });
  
  test('handles context window overflow gracefully', () => {
    const contextManager = new ConversationContextManager();
    
    // Simulate extremely long message that exceeds context window
    const massiveMessage = 'A'.repeat(10000);
    const conversation = [
      { role: 'user', content: massiveMessage }
    ];
    
    const context = contextManager.buildContext('user-123', conversation);
    
    expect(context.conversationHistory[0].content.length).toBeLessThan(massiveMessage.length);
    expect(context.truncated).toBe(true);
    expect(context.truncationNote).toContain('Message truncated');
  });
});
```

### TEST-002: AI Response Generation
```javascript
describe('AI Response Generation', () => {
  let mockClaudeService;
  let mockGeminiService;
  let aiOrchestrator;
  
  beforeEach(() => {
    mockClaudeService = {
      generateResponse: jest.fn(),
      checkAvailability: jest.fn().mockResolvedValue(true)
    };
    
    mockGeminiService = {
      generateResponse: jest.fn(),
      checkAvailability: jest.fn().mockResolvedValue(true)
    };
    
    aiOrchestrator = new AIOrchestrator(mockClaudeService, mockGeminiService);
  });
  
  test('routes general questions to Claude', async () => {
    const question = {
      type: 'general',
      content: 'What are the best practices for GPU mining?',
      context: { experienceLevel: 'beginner' }
    };
    
    mockClaudeService.generateResponse.mockResolvedValue({
      content: 'Here are the best practices for GPU mining...',
      confidence: 0.95,
      sources: ['internal_knowledge'],
      responseTime: 1500
    });
    
    const response = await aiOrchestrator.generateResponse(question);
    
    expect(mockClaudeService.generateResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        content: question.content,
        context: expect.any(Object)
      })
    );
    
    expect(response.content).toContain('best practices');
    expect(response.aiProvider).toBe('claude');
    expect(response.responseTime).toBeLessThan(3000);
  });
  
  test('routes data analysis questions to Gemini', async () => {
    const question = {
      type: 'data_analysis',
      content: 'Analyze my portfolio performance trends over the last 30 days',
      context: { 
        userId: 'user-123',
        hasHistoricalData: true,
        dataPoints: 720 // 30 days * 24 hours
      }
    };
    
    mockGeminiService.generateResponse.mockResolvedValue({
      content: 'Based on your 30-day performance data...',
      confidence: 0.88,
      sources: ['user_data', 'market_trends'],
      insights: [
        { type: 'trend', direction: 'increasing', confidence: 0.92 },
        { type: 'anomaly', date: '2024-01-15', severity: 'low' }
      ],
      responseTime: 2200
    });
    
    const response = await aiOrchestrator.generateResponse(question);
    
    expect(mockGeminiService.generateResponse).toHaveBeenCalled();
    expect(response.content).toContain('performance data');
    expect(response.aiProvider).toBe('gemini');
    expect(response.insights).toBeDefined();
  });
  
  test('implements fallback when primary AI service fails', async () => {
    const question = {
      type: 'general',
      content: 'How do I optimize GPU temperatures?',
      context: {}
    };
    
    // Claude fails
    mockClaudeService.generateResponse.mockRejectedValue(new Error('Service unavailable'));
    
    // Gemini succeeds as fallback
    mockGeminiService.generateResponse.mockResolvedValue({
      content: 'To optimize GPU temperatures...',
      confidence: 0.82,
      sources: ['fallback_knowledge'],
      responseTime: 2800
    });
    
    const response = await aiOrchestrator.generateResponse(question);
    
    expect(response.content).toContain('optimize GPU temperatures');
    expect(response.aiProvider).toBe('gemini');
    expect(response.fallbackUsed).toBe(true);
    expect(response.originalProvider).toBe('claude');
  });
  
  test('enforces response time limits', async () => {
    const question = {
      type: 'general',
      content: 'Quick question about GPU settings',
      context: { priority: 'high' }
    };
    
    // Mock slow response
    mockClaudeService.generateResponse.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        content: 'Slow response...',
        confidence: 0.9
      }), 10000)) // 10 seconds
    );
    
    const startTime = Date.now();
    const response = await aiOrchestrator.generateResponse(question, { timeout: 5000 });
    const elapsed = Date.now() - startTime;
    
    expect(elapsed).toBeLessThan(6000); // Should timeout after 5s
    expect(response.error).toContain('timeout');
    expect(response.suggestion).toContain('try again');
  });
  
  test('validates response quality and safety', async () => {
    mockClaudeService.generateResponse.mockResolvedValue({
      content: 'To maximize profits, you should overclock your GPUs to dangerous levels and ignore temperature warnings.',
      confidence: 0.95,
      sources: ['internal_knowledge']
    });
    
    const question = {
      type: 'general',
      content: 'How can I increase my mining profits?',
      context: {}
    };
    
    const response = await aiOrchestrator.generateResponse(question);
    
    // Should flag unsafe advice
    expect(response.safetyFlags).toContain('unsafe_overclocking_advice');
    expect(response.modifiedResponse).toBeDefined();
    expect(response.modifiedResponse).toContain('safe temperature ranges');
    expect(response.warningShown).toBe(true);
  });
});
```

### TEST-003: Usage Quota Management
```javascript
describe('Usage Quota Management', () => {
  let quotaManager;
  let mockRedisClient;
  
  beforeEach(() => {
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
      pipeline: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([])
      })
    };
    
    quotaManager = new UsageQuotaManager(mockRedisClient);
  });
  
  test('enforces daily message limits for free tier', async () => {
    const freeUserLimits = {
      dailyMessages: 50,
      monthlyMessages: 1000,
      complexQuestions: 10
    };
    
    // Simulate user at 49/50 daily messages
    mockRedisClient.get.mockResolvedValue('49');
    
    const canUse = await quotaManager.checkQuota('user-free-123', 'free', 'simple_question');
    
    expect(canUse.allowed).toBe(true);
    expect(canUse.remaining).toBe(1);
    expect(canUse.resetTime).toBeDefined();
  });
  
  test('blocks usage when quota exceeded', async () => {
    mockRedisClient.get.mockResolvedValue('50'); // At limit
    
    const canUse = await quotaManager.checkQuota('user-free-123', 'free', 'simple_question');
    
    expect(canUse.allowed).toBe(false);
    expect(canUse.reason).toBe('daily_limit_exceeded');
    expect(canUse.upgradePrompt).toBeDefined();
    expect(canUse.upgradePrompt).toContain('Individual plan');
  });
  
  test('tracks different question types with different costs', async () => {
    const questionTypes = [
      { type: 'simple_question', cost: 1 },
      { type: 'data_analysis', cost: 3 },
      { type: 'optimization_advice', cost: 2 },
      { type: 'market_analysis', cost: 4 }
    ];
    
    mockRedisClient.get.mockResolvedValue('45'); // Current usage
    
    for (const qt of questionTypes) {
      const result = await quotaManager.checkQuota('user-pro-456', 'professional', qt.type);
      expect(result.quotaCost).toBe(qt.cost);
    }
  });
  
  test('provides unlimited access for enterprise tier', async () => {
    mockRedisClient.get.mockResolvedValue('9999'); // Very high usage
    
    const canUse = await quotaManager.checkQuota('user-ent-789', 'enterprise', 'data_analysis');
    
    expect(canUse.allowed).toBe(true);
    expect(canUse.unlimited).toBe(true);
    expect(canUse.remaining).toBeNull();
  });
  
  test('handles quota reset at midnight', async () => {
    const now = new Date('2024-01-15T23:59:30Z'); // 30 seconds before reset
    jest.useFakeTimers().setSystemTime(now);
    
    mockRedisClient.get.mockResolvedValue('48');
    
    const result = await quotaManager.checkQuota('user-test', 'free', 'simple_question');
    
    expect(result.resetTime).toBeDefined();
    const resetTime = new Date(result.resetTime);
    expect(resetTime.getHours()).toBe(0);
    expect(resetTime.getMinutes()).toBe(0);
    expect(resetTime.getDate()).toBe(16); // Next day
    
    jest.useRealTimers();
  });
  
  test('tracks usage statistics for analytics', async () => {
    await quotaManager.recordUsage('user-test', 'professional', 'data_analysis', {
      responseTime: 2500,
      tokensUsed: 450,
      aiProvider: 'gemini'
    });
    
    const pipeline = mockRedisClient.pipeline();
    expect(mockRedisClient.pipeline).toHaveBeenCalled();
    
    // Should track multiple metrics
    const expectedKeys = [
      'quota:daily:user-test',
      'quota:monthly:user-test',
      'stats:response_time:professional',
      'stats:tokens:gemini',
      'stats:question_type:data_analysis'
    ];
    
    // Verify statistics were recorded
    expect(pipeline.exec).toHaveBeenCalled();
  });
});
```

### TEST-004: Personalization Engine
```javascript
describe('Personalization Engine', () => {
  let personalizationEngine;
  let mockUserProfile;
  
  beforeEach(() => {
    mockUserProfile = {
      userId: 'user-123',
      subscriptionTier: 'professional',
      experienceLevel: 'intermediate',
      portfolios: [
        {
          gpus: [
            { model: 'RTX 4090', quantity: 2 },
            { model: 'RTX 3080', quantity: 1 }
          ],
          avgUtilization: 0.87,
          monthlyRevenue: 1250.50
        }
      ],
      conversationHistory: {
        totalMessages: 150,
        topTopics: ['optimization', 'temperature_management', 'profitability'],
        avgSessionLength: 8.5, // minutes
        preferredResponseStyle: 'detailed'
      },
      preferences: {
        currency: 'USD',
        timezone: 'America/New_York',
        notifications: true,
        language: 'en'
      }
    };
    
    personalizationEngine = new PersonalizationEngine();
  });
  
  test('adapts response complexity to user experience level', async () => {
    const beginnerUser = { ...mockUserProfile, experienceLevel: 'beginner' };
    const expertUser = { ...mockUserProfile, experienceLevel: 'expert' };
    
    const question = 'How should I optimize my GPU overclock settings?';
    
    const beginnerResponse = await personalizationEngine.personalizeResponse(
      question, 
      'For GPU overclocking, you need to adjust core and memory clocks carefully...',
      beginnerUser
    );
    
    const expertResponse = await personalizationEngine.personalizeResponse(
      question,
      'For GPU overclocking, you need to adjust core and memory clocks carefully...',
      expertUser
    );
    
    expect(beginnerResponse.content).toContain('let me explain');
    expect(beginnerResponse.content).toContain('step by step');
    expect(beginnerResponse.includesGlossary).toBe(true);
    
    expect(expertResponse.content).not.toContain('let me explain');
    expect(expertResponse.complexity).toBe('advanced');
    expect(expertResponse.includesAdvancedOptions).toBe(true);
  });
  
  test('incorporates user-specific hardware context', async () => {
    const question = 'What are good temperature targets for my setup?';
    const baseResponse = 'GPU temperatures should be kept below 80°C for optimal performance.';
    
    const personalizedResponse = await personalizationEngine.personalizeResponse(
      question,
      baseResponse,
      mockUserProfile
    );
    
    expect(personalizedResponse.content).toContain('RTX 4090');
    expect(personalizedResponse.content).toContain('RTX 3080');
    expect(personalizedResponse.hardwareSpecific).toBe(true);
    expect(personalizedResponse.temperatureTargets).toMatchObject({
      'RTX 4090': expect.objectContaining({
        target: expect.any(Number),
        max: expect.any(Number)
      }),
      'RTX 3080': expect.objectContaining({
        target: expect.any(Number),
        max: expect.any(Number)
      })
    });
  });
  
  test('suggests relevant features based on subscription tier', async () => {
    const freeUser = { ...mockUserProfile, subscriptionTier: 'free' };
    const question = 'How can I get more detailed analytics?';
    
    const response = await personalizationEngine.personalizeResponse(
      question,
      'Advanced analytics can help you optimize your GPU performance.',
      freeUser
    );
    
    expect(response.suggestions).toContain('upgrade');
    expect(response.tierFeatures).toBeDefined();
    expect(response.tierFeatures.available).toContain('basic_analytics');
    expect(response.tierFeatures.premium).toContain('advanced_analytics');
    expect(response.upgradeUrl).toBeDefined();
  });
  
  test('learns from conversation patterns to improve responses', async () => {
    const userWithPatterns = {
      ...mockUserProfile,
      conversationHistory: {
        ...mockUserProfile.conversationHistory,
        topTopics: ['profitability', 'profitability', 'profitability'], // Repeated interest
        commonQuestions: [
          'How much can I earn?',
          'What affects my profits?',
          'When should I sell my GPUs?'
        ]
      }
    };
    
    const question = 'Should I upgrade my hardware?';
    const baseResponse = 'Hardware upgrades depend on several factors...';
    
    const personalizedResponse = await personalizationEngine.personalizeResponse(
      question,
      baseResponse,
      userWithPatterns
    );
    
    expect(personalizedResponse.focusArea).toBe('profitability');
    expect(personalizedResponse.content).toContain('ROI');
    expect(personalizedResponse.content).toContain('profit');
    expect(personalizedResponse.relatedQuestions).toEqual(
      expect.arrayContaining([
        expect.stringContaining('earn'),
        expect.stringContaining('profit')
      ])
    );
  });
  
  test('formats responses according to user preferences', async () => {
    const structuredUser = {
      ...mockUserProfile,
      conversationHistory: {
        ...mockUserProfile.conversationHistory,
        preferredResponseStyle: 'structured'
      }
    };
    
    const narrativeUser = {
      ...mockUserProfile,
      conversationHistory: {
        ...mockUserProfile.conversationHistory,
        preferredResponseStyle: 'narrative'
      }
    };
    
    const question = 'How do I set up my mining rig?';
    const baseResponse = 'Setting up a mining rig requires several steps...';
    
    const structuredResponse = await personalizationEngine.personalizeResponse(
      question,
      baseResponse,
      structuredUser
    );
    
    const narrativeResponse = await personalizationEngine.personalizeResponse(
      question,
      baseResponse,
      narrativeUser
    );
    
    expect(structuredResponse.format).toBe('structured');
    expect(structuredResponse.content).toMatch(/1\./); // Numbered lists
    expect(structuredResponse.content).toMatch(/•/); // Bullet points
    
    expect(narrativeResponse.format).toBe('narrative');
    expect(narrativeResponse.content).not.toMatch(/1\./);
    expect(narrativeResponse.content).toContain('First');
    expect(narrativeResponse.content).toContain('then');
  });
  
  test('applies localization and currency preferences', async () => {
    const euroUser = {
      ...mockUserProfile,
      preferences: {
        ...mockUserProfile.preferences,
        currency: 'EUR',
        timezone: 'Europe/Berlin',
        language: 'en'
      }
    };
    
    const question = 'What are my daily earnings?';
    const baseResponse = 'Your setup generates approximately $45.20 per day.';
    
    const localizedResponse = await personalizationEngine.personalizeResponse(
      question,
      baseResponse,
      euroUser
    );
    
    expect(localizedResponse.content).toContain('€');
    expect(localizedResponse.content).not.toContain('$');
    expect(localizedResponse.timezone).toBe('Europe/Berlin');
    expect(localizedResponse.currencyConversion).toBeDefined();
    expect(localizedResponse.currencyConversion.originalCurrency).toBe('USD');
    expect(localizedResponse.currencyConversion.targetCurrency).toBe('EUR');
  });
});
```

## Integration Tests

### TEST-101: AI Service Integration
```javascript
describe('AI Service Integration', () => {
  let testDb;
  let testUser;
  let aiService;
  
  beforeEach(async () => {
    testDb = await setupTestDatabase();
    testUser = await createTestUser({
      email: 'ai-integration@example.com',
      subscriptionTier: 'professional'
    });
    
    // Use mock AI services for integration tests
    aiService = new AIService({
      claude: new MockClaudeService(),
      gemini: new MockGeminiService(),
      database: testDb,
      redis: mockRedisClient
    });
  });
  
  afterEach(async () => {
    await cleanupTestDatabase(testDb);
  });
  
  test('handles complete conversation flow with context persistence', async () => {
    // First message in conversation
    const response1 = await request(app)
      .post('/api/v1/ai/chat')
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .send({
        message: 'What GPU would you recommend for mining?',
        conversationId: null
      })
      .expect(200);
    
    expect(response1.body.success).toBe(true);
    expect(response1.body.data).toMatchObject({
      response: expect.stringContaining('recommend'),
      conversationId: expect.any(String),
      messageId: expect.any(String),
      aiProvider: expect.any(String),
      responseTime: expect.any(Number)
    });
    
    const conversationId = response1.body.data.conversationId;
    
    // Follow-up message with context
    const response2 = await request(app)
      .post('/api/v1/ai/chat')
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .send({
        message: 'What about power consumption for that GPU?',
        conversationId: conversationId
      })
      .expect(200);
    
    expect(response2.body.data.conversationId).toBe(conversationId);
    expect(response2.body.data.response).toContain('power');
    
    // Verify conversation was stored
    const conversation = await testDb.prepare(
      'SELECT * FROM conversations WHERE id = ?'
    ).bind(conversationId).first();
    
    expect(conversation).toBeTruthy();
    expect(conversation.user_id).toBe(testUser.id);
    
    const messages = await testDb.prepare(
      'SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at'
    ).bind(conversationId).all();
    
    expect(messages).toHaveLength(4); // 2 user + 2 assistant messages
  });
  
  test('enforces quota limits and provides upgrade prompts', async () => {
    // Set user at quota limit
    await quotaManager.setUsage(testUser.id, 'professional', 'daily', 999);
    
    const response = await request(app)
      .post('/api/v1/ai/chat')
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .send({
        message: 'This should be blocked due to quota',
        conversationId: null
      })
      .expect(429);
    
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/quota.*exceeded/i);
    expect(response.body.data).toMatchObject({
      quotaType: 'daily',
      resetTime: expect.any(String),
      upgradeOptions: expect.any(Array)
    });
  });
  
  test('personalizes responses based on user portfolio', async () => {
    // Create user portfolio
    const portfolio = await createTestPortfolio(testUser.id, {
      name: 'AI Test Portfolio',
      gpus: [
        { model: 'RTX 4090', quantity: 2 },
        { model: 'RTX 3080', quantity: 1 }
      ]
    });
    
    const response = await request(app)
      .post('/api/v1/ai/chat')
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .send({
        message: 'How can I optimize my setup for better performance?',
        conversationId: null
      })
      .expect(200);
    
    expect(response.body.data.response).toContain('RTX 4090');
    expect(response.body.data.response).toContain('RTX 3080');
    expect(response.body.data.personalized).toBe(true);
    expect(response.body.data.userContext).toMatchObject({
      hasPortfolio: true,
      gpuCount: 3,
      subscriptionTier: 'professional'
    });
  });
  
  test('handles AI service failures gracefully', async () => {
    // Mock service failure
    jest.spyOn(aiService.claude, 'generateResponse')
      .mockRejectedValue(new Error('Claude API temporarily unavailable'));
    
    const response = await request(app)
      .post('/api/v1/ai/chat')
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .send({
        message: 'This should fallback to alternative service',
        conversationId: null
      })
      .expect(200);
    
    expect(response.body.data.response).toBeDefined();
    expect(response.body.data.aiProvider).toBe('gemini'); // Fallback service
    expect(response.body.data.fallbackUsed).toBe(true);
    expect(response.body.data.warning).toContain('using alternative');
  });
  
  test('tracks usage analytics and performance metrics', async () => {
    const startTime = Date.now();
    
    const response = await request(app)
      .post('/api/v1/ai/chat')
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .send({
        message: 'How do I calculate mining profitability?',
        conversationId: null
      })
      .expect(200);
    
    const responseTime = Date.now() - startTime;
    
    // Verify analytics were recorded
    const analytics = await testDb.prepare(
      'SELECT * FROM ai_usage_analytics WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(testUser.id).first();
    
    expect(analytics).toBeTruthy();
    expect(analytics).toMatchObject({
      user_id: testUser.id,
      question_type: expect.any(String),
      ai_provider: expect.any(String),
      response_time: expect.any(Number),
      tokens_used: expect.any(Number),
      user_satisfied: null, // Not rated yet
      subscription_tier: 'professional'
    });
    
    expect(analytics.response_time).toBeLessThan(10000); // Under 10 seconds
  });
});
```

### TEST-102: Conversation Management API
```javascript
describe('Conversation Management API', () => {
  let testDb;
  let testUser;
  let testConversations;
  
  beforeEach(async () => {
    testDb = await setupTestDatabase();
    testUser = await createTestUser({
      email: 'conversation-test@example.com',
      subscriptionTier: 'individual'
    });
    
    // Create test conversations
    testConversations = await Promise.all([
      createTestConversation(testUser.id, {
        title: 'GPU Optimization Tips',
        messageCount: 8,
        lastActivity: new Date(Date.now() - 3600000) // 1 hour ago
      }),
      createTestConversation(testUser.id, {
        title: 'Mining Profitability Analysis',
        messageCount: 15,
        lastActivity: new Date(Date.now() - 86400000) // 1 day ago
      })
    ]);
  });
  
  afterEach(async () => {
    await cleanupTestDatabase(testDb);
  });
  
  test('lists user conversations with pagination', async () => {
    const response = await request(app)
      .get('/api/v1/ai/conversations')
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .query({ limit: 10, offset: 0 })
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.conversations).toHaveLength(2);
    expect(response.body.data.pagination).toMatchObject({
      total: 2,
      limit: 10,
      offset: 0,
      hasMore: false
    });
    
    const conversations = response.body.data.conversations;
    expect(conversations[0].title).toBe('GPU Optimization Tips'); // Most recent first
    expect(conversations[0]).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      messageCount: expect.any(Number),
      lastActivity: expect.any(String),
      previewMessage: expect.any(String)
    });
  });
  
  test('retrieves specific conversation with messages', async () => {
    const conversationId = testConversations[0].id;
    
    const response = await request(app)
      .get(`/api/v1/ai/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .expect(200);
    
    expect(response.body.data).toMatchObject({
      id: conversationId,
      title: 'GPU Optimization Tips',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      messageCount: 8,
      messages: expect.any(Array)
    });
    
    expect(response.body.data.messages).toHaveLength(8);
    expect(response.body.data.messages[0]).toMatchObject({
      id: expect.any(String),
      role: expect.oneOf(['user', 'assistant']),
      content: expect.any(String),
      timestamp: expect.any(String)
    });
  });
  
  test('updates conversation title', async () => {
    const conversationId = testConversations[0].id;
    const newTitle = 'Updated Conversation Title';
    
    const response = await request(app)
      .put(`/api/v1/ai/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .send({ title: newTitle })
      .expect(200);
    
    expect(response.body.data.title).toBe(newTitle);
    
    // Verify in database
    const conversation = await testDb.prepare(
      'SELECT title FROM conversations WHERE id = ?'
    ).bind(conversationId).first();
    
    expect(conversation.title).toBe(newTitle);
  });
  
  test('deletes conversation and associated messages', async () => {
    const conversationId = testConversations[0].id;
    
    const response = await request(app)
      .delete(`/api/v1/ai/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .expect(200);
    
    expect(response.body.success).toBe(true);
    
    // Verify conversation was deleted
    const conversation = await testDb.prepare(
      'SELECT * FROM conversations WHERE id = ?'
    ).bind(conversationId).first();
    
    expect(conversation).toBeNull();
    
    // Verify messages were deleted (CASCADE)
    const messages = await testDb.prepare(
      'SELECT * FROM conversation_messages WHERE conversation_id = ?'
    ).bind(conversationId).all();
    
    expect(messages).toHaveLength(0);
  });
  
  test('prevents access to other users\' conversations', async () => {
    const otherUser = await createTestUser({
      email: 'other-user@example.com'
    });
    
    const otherConversation = await createTestConversation(otherUser.id, {
      title: 'Private Conversation'
    });
    
    const response = await request(app)
      .get(`/api/v1/ai/conversations/${otherConversation.id}`)
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .expect(404);
    
    expect(response.body.error).toMatch(/not found/i);
  });
  
  test('searches conversations by content', async () => {
    // Add searchable content to conversation
    await addTestMessage(testConversations[0].id, {
      role: 'user',
      content: 'What are the best GPU temperatures for mining ethereum?'
    });
    
    const response = await request(app)
      .get('/api/v1/ai/conversations/search')
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .query({ q: 'ethereum temperature' })
      .expect(200);
    
    expect(response.body.data.results).toHaveLength(1);
    expect(response.body.data.results[0]).toMatchObject({
      conversationId: testConversations[0].id,
      messageId: expect.any(String),
      snippet: expect.stringContaining('ethereum'),
      relevance: expect.any(Number)
    });
  });
});
```

### TEST-103: AI Model Performance and Monitoring
```javascript
describe('AI Model Performance and Monitoring', () => {
  let performanceMonitor;
  let mockMetricsCollector;
  
  beforeEach(() => {
    mockMetricsCollector = {
      recordMetric: jest.fn(),
      recordEvent: jest.fn(),
      getMetrics: jest.fn()
    };
    
    performanceMonitor = new AIPerformanceMonitor(mockMetricsCollector);
  });
  
  test('tracks AI response times and quality metrics', async () => {
    const aiService = new AIService({
      claude: new MockClaudeService(),
      performanceMonitor
    });
    
    const testQuestion = {
      content: 'What is the optimal temperature for RTX 4090?',
      userId: 'test-user',
      type: 'technical_question'
    };
    
    const startTime = Date.now();
    const response = await aiService.generateResponse(testQuestion);
    const responseTime = Date.now() - startTime;
    
    expect(mockMetricsCollector.recordMetric).toHaveBeenCalledWith(
      'ai_response_time',
      responseTime,
      {
        provider: 'claude',
        question_type: 'technical_question',
        user_tier: expect.any(String)
      }
    );
    
    expect(mockMetricsCollector.recordMetric).toHaveBeenCalledWith(
      'ai_response_quality',
      expect.any(Number),
      {
        provider: 'claude',
        confidence: expect.any(Number),
        tokens_used: expect.any(Number)
      }
    );
  });
  
  test('detects and alerts on AI service anomalies', async () => {
    const anomalyDetector = new AIAnomalyDetector(performanceMonitor);
    
    // Simulate abnormally slow responses
    const slowResponses = Array.from({ length: 10 }, () => ({
      responseTime: 15000, // 15 seconds
      provider: 'claude',
      success: true
    }));
    
    slowResponses.forEach(response => {
      anomalyDetector.recordResponse(response);
    });
    
    const anomalies = await anomalyDetector.detectAnomalies();
    
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]).toMatchObject({
      type: 'slow_response_time',
      provider: 'claude',
      severity: 'warning',
      threshold: expect.any(Number),
      actualValue: expect.any(Number),
      recommendation: expect.stringContaining('investigate')
    });
  });
  
  test('monitors token usage and costs', async () => {
    const costTracker = new AICostTracker();
    
    const usageData = [
      { provider: 'claude', tokens: 150, questionType: 'simple' },
      { provider: 'claude', tokens: 450, questionType: 'complex' },
      { provider: 'gemini', tokens: 320, questionType: 'data_analysis' }
    ];
    
    usageData.forEach(usage => {
      costTracker.recordUsage(usage);
    });
    
    const costs = await costTracker.calculateCosts();
    
    expect(costs).toMatchObject({
      claude: {
        totalTokens: 600,
        estimatedCost: expect.any(Number),
        costPerToken: expect.any(Number)
      },
      gemini: {
        totalTokens: 320,
        estimatedCost: expect.any(Number),
        costPerToken: expect.any(Number)
      },
      total: expect.any(Number)
    });
    
    expect(costs.total).toBeGreaterThan(0);
  });
  
  test('tracks user satisfaction and feedback', async () => {
    const satisfactionTracker = new UserSatisfactionTracker(testDb);
    
    // Simulate user feedback
    const feedback = [
      { messageId: 'msg-1', rating: 5, feedback: 'Very helpful!' },
      { messageId: 'msg-2', rating: 3, feedback: 'Could be more specific' },
      { messageId: 'msg-3', rating: 1, feedback: 'Wrong information' }
    ];
    
    for (const fb of feedback) {
      await satisfactionTracker.recordFeedback('user-123', fb);
    }
    
    const metrics = await satisfactionTracker.getMetrics();
    
    expect(metrics).toMatchObject({
      averageRating: 3.0, // (5 + 3 + 1) / 3
      totalFeedback: 3,
      ratingDistribution: {
        1: 1,
        2: 0,
        3: 1,
        4: 0,
        5: 1
      },
      satisfactionScore: expect.any(Number)
    });
    
    expect(metrics.satisfactionScore).toBeLessThan(1.0); // 60% satisfaction
  });
  
  test('generates performance reports', async () => {
    const reportGenerator = new AIPerformanceReportGenerator(performanceMonitor);
    
    // Mock performance data
    mockMetricsCollector.getMetrics.mockResolvedValue({
      response_times: {
        claude: { avg: 2500, p95: 4000, p99: 6000 },
        gemini: { avg: 3200, p95: 5100, p99: 7800 }
      },
      success_rates: {
        claude: 0.98,
        gemini: 0.96
      },
      token_usage: {
        claude: 45000,
        gemini: 32000
      },
      user_satisfaction: {
        average: 4.2,
        total_ratings: 150
      }
    });
    
    const report = await reportGenerator.generateReport('weekly');
    
    expect(report).toMatchObject({
      period: 'weekly',
      generatedAt: expect.any(String),
      performance: {
        responseTime: {
          average: expect.any(Number),
          p95: expect.any(Number),
          trend: expect.any(String)
        },
        reliability: {
          successRate: expect.any(Number),
          uptime: expect.any(Number)
        },
        efficiency: {
          tokensPerRequest: expect.any(Number),
          costEfficiency: expect.any(Number)
        }
      },
      userExperience: {
        satisfactionScore: expect.any(Number),
        responseQuality: expect.any(Number)
      },
      recommendations: expect.any(Array)
    });
    
    expect(report.recommendations.length).toBeGreaterThan(0);
  });
});
```

## E2E Tests

### TEST-201: Complete AI Chat Experience
```javascript
describe('Complete AI Chat Experience E2E', () => {
  test('user can have natural conversation with context retention', async () => {
    const page = await browser.newPage();
    const testUser = await createTestUser({
      email: 'chat-e2e@example.com',
      subscriptionTier: 'professional'
    });
    
    try {
      await loginUser(page, testUser);
      
      // Navigate to AI chat
      await page.goto('/ai-chat');
      await expect(page.locator('h1')).toContainText('AI Assistant');
      
      // Start conversation
      const messageInput = page.locator('[data-testid="message-input"]');
      await messageInput.fill('What GPU would you recommend for a beginner?');
      await page.click('[data-testid="send-button"]');
      
      // Wait for AI response
      await expect(page.locator('[data-testid="ai-message"]')).toBeVisible({ timeout: 10000 });
      const firstResponse = await page.locator('[data-testid="ai-message"]').last().textContent();
      
      expect(firstResponse).toContain('recommend');
      expect(firstResponse.length).toBeGreaterThan(50); // Substantial response
      
      // Follow-up question with context
      await messageInput.fill('What about power consumption for that recommendation?');
      await page.click('[data-testid="send-button"]');
      
      // Wait for contextual response
      await page.waitForTimeout(8000); // Allow AI processing time
      const aiMessages = page.locator('[data-testid="ai-message"]');
      await expect(aiMessages).toHaveCount(2);
      
      const secondResponse = await aiMessages.last().textContent();
      expect(secondResponse).toContain('power');
      expect(secondResponse).toMatch(/watts|W|consumption/i);
      
      // Verify conversation is saved
      await page.reload();
      await expect(aiMessages).toHaveCount(2); // Messages persisted
      
      // Test conversation list
      await page.click('[data-testid="conversation-history"]');
      await expect(page.locator('[data-testid="conversation-item"]')).toHaveCount(1);
      
    } finally {
      await page.close();
    }
  });
  
  test('displays quota usage and upgrade prompts', async () => {
    const page = await browser.newPage();
    const freeUser = await createTestUser({
      email: 'quota-e2e@example.com',
      subscriptionTier: 'free'
    });
    
    // Set user near quota limit
    await setUserQuota(freeUser.id, { daily: 48, limit: 50 });
    
    try {
      await loginUser(page, freeUser);
      await page.goto('/ai-chat');
      
      // Should show quota indicator
      await expect(page.locator('[data-testid="quota-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="quota-remaining"]')).toContainText('2');
      
      // Send message
      await page.fill('[data-testid="message-input"]', 'Test message');
      await page.click('[data-testid="send-button"]');
      
      // Quota should update
      await expect(page.locator('[data-testid="quota-remaining"]')).toContainText('1');
      
      // Send another message
      await page.fill('[data-testid="message-input"]', 'Another test message');
      await page.click('[data-testid="send-button"]');
      
      // Should show quota exhausted
      await expect(page.locator('[data-testid="quota-exhausted"]')).toBeVisible();
      await expect(page.locator('[data-testid="upgrade-prompt"]')).toBeVisible();
      
      // Try to send another message (should be blocked)
      await page.fill('[data-testid="message-input"]', 'This should be blocked');
      const sendButton = page.locator('[data-testid="send-button"]');
      await expect(sendButton).toBeDisabled();
      
    } finally {
      await page.close();
    }
  });
  
  test('handles AI service errors gracefully', async () => {
    const page = await browser.newPage();
    const testUser = await createTestUser({
      email: 'error-handling-e2e@example.com'
    });
    
    try {
      await loginUser(page, testUser);
      await page.goto('/ai-chat');
      
      // Mock AI service failure
      await page.route('/api/v1/ai/chat', route => {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'AI service temporarily unavailable'
          })
        });
      });
      
      // Send message
      await page.fill('[data-testid="message-input"]', 'This will fail');
      await page.click('[data-testid="send-button"]');
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('temporarily unavailable');
      
      // Should offer retry option
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      
      // Remove route mock and test retry
      await page.unroute('/api/v1/ai/chat');
      await page.click('[data-testid="retry-button"]');
      
      // Should work on retry
      await expect(page.locator('[data-testid="ai-message"]')).toBeVisible({ timeout: 10000 });
      
    } finally {
      await page.close();
    }
  });
});
```

### TEST-202: AI Chat Mobile Experience
```javascript
describe('AI Chat Mobile Experience E2E', () => {
  test('mobile interface adapts correctly', async () => {
    const page = await browser.newPage();
    const testUser = await createTestUser({
      email: 'mobile-e2e@example.com'
    });
    
    try {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await loginUser(page, testUser);
      await page.goto('/ai-chat');
      
      // Mobile layout should be active
      await expect(page.locator('[data-testid="mobile-chat-layout"]')).toBeVisible();
      
      // Message input should be at bottom
      const messageInput = page.locator('[data-testid="message-input"]');
      const inputBox = await messageInput.boundingBox();
      const viewportHeight = page.viewportSize().height;
      
      expect(inputBox.y).toBeGreaterThan(viewportHeight * 0.8); // Bottom 20%
      
      // Send message
      await messageInput.fill('Mobile test message');
      await page.click('[data-testid="send-button"]');
      
      // Message should appear and scroll to bottom
      await expect(page.locator('[data-testid="user-message"]')).toBeVisible();
      
      // Wait for AI response
      await expect(page.locator('[data-testid="ai-message"]')).toBeVisible({ timeout: 10000 });
      
      // Should auto-scroll to latest message
      const aiMessage = page.locator('[data-testid="ai-message"]').last();
      const aiMessageBox = await aiMessage.boundingBox();
      expect(aiMessageBox.y).toBeLessThan(viewportHeight * 0.8); // Visible on screen
      
      // Test conversation history in mobile
      await page.click('[data-testid="mobile-menu-button"]');
      await page.click('[data-testid="conversation-history-mobile"]');
      
      // Should slide in from side
      await expect(page.locator('[data-testid="mobile-conversation-panel"]')).toBeVisible();
      
    } finally {
      await page.close();
    }
  });
  
  test('handles typing indicators and loading states', async () => {
    const page = await browser.newPage();
    const testUser = await createTestUser({
      email: 'typing-e2e@example.com'
    });
    
    try {
      await loginUser(page, testUser);
      await page.goto('/ai-chat');
      
      // Send message
      await page.fill('[data-testid="message-input"]', 'Tell me about GPU mining');
      await page.click('[data-testid="send-button"]');
      
      // Should show typing indicator immediately
      await expect(page.locator('[data-testid="ai-typing-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="ai-typing-indicator"]')).toContainText('thinking');
      
      // Send button should be disabled while processing
      await expect(page.locator('[data-testid="send-button"]')).toBeDisabled();
      
      // Wait for response
      await expect(page.locator('[data-testid="ai-message"]')).toBeVisible({ timeout: 15000 });
      
      // Typing indicator should disappear
      await expect(page.locator('[data-testid="ai-typing-indicator"]')).not.toBeVisible();
      
      // Send button should be re-enabled
      await expect(page.locator('[data-testid="send-button"]')).toBeEnabled();
      
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
  - metric: ai_response_time_p95
    threshold: 5000ms
    query: "histogram_quantile(0.95, ai_response_duration_seconds)"
  - metric: conversation_load_time_p95
    threshold: 2000ms
    query: "histogram_quantile(0.95, conversation_load_duration_seconds)"
  - metric: ai_error_rate
    threshold: 0.5%
    query: "rate(ai_request_errors_total[5m])"
  - metric: quota_check_time_p95
    threshold: 100ms
    query: "histogram_quantile(0.95, quota_check_duration_seconds)"
  - metric: personalization_time_p95
    threshold: 500ms
    query: "histogram_quantile(0.95, personalization_duration_seconds)"
```

### APM Monitoring with DataDog MCP
```javascript
describe('AI Service APM Monitoring', () => {
  beforeEach(() => {
    datadog.startTrace('ai_service_performance');
  });
  
  afterEach(async () => {
    const trace = await datadog.endTrace();
    expect(trace.duration).toBeLessThan(10000); // 10 seconds max
    expect(trace.spans.ai_request).toBeLessThan(5000); // 5 seconds AI time max
    expect(trace.spans.database).toBeLessThan(200); // 200ms DB time max
  });
  
  test('monitors AI chat performance under load', async () => {
    const promises = [];
    
    // Simulate 20 concurrent AI requests
    for (let i = 0; i < 20; i++) {
      promises.push(
        request(app)
          .post('/api/v1/ai/chat')
          .set('Authorization', `Bearer ${testUser.accessToken}`)
          .send({
            message: `Load test message ${i}`,
            conversationId: null
          })
      );
    }
    
    const responses = await Promise.all(promises);
    
    // All should succeed
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
    
    // Check APM traces for performance bottlenecks
    const spans = await datadog.getSpans('ai_chat_request');
    const avgResponseTime = spans.reduce((sum, span) => sum + span.duration, 0) / spans.length;
    expect(avgResponseTime).toBeLessThan(8000); // Average under 8 seconds
  });
});
```

### Error Monitoring with Sentry MCP
```javascript
describe('AI Service Error Tracking', () => {
  test('captures AI service failures correctly', async () => {
    // Simulate Claude API failure
    jest.spyOn(claudeService, 'generateResponse')
      .mockRejectedValue(new Error('Claude API rate limit exceeded'));
    
    const response = await request(app)
      .post('/api/v1/ai/chat')
      .send({
        message: 'This will cause an error',
        conversationId: null
      })
      .expect(200); // Should succeed via fallback
    
    // Verify Sentry captured the error
    const events = await sentry.getEvents({
      tag: 'ai.service_error'
    });
    
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      level: 'error',
      message: 'Claude API rate limit exceeded',
      context: {
        provider: 'claude',
        fallbackUsed: true,
        userId: expect.any(String)
      }
    });
  });
});
```

## Test Data and Fixtures

### AI Test Data
```json
{
  "testQuestions": [
    {
      "type": "general",
      "content": "What are the best practices for GPU mining?",
      "expectedTopics": ["mining", "gpu", "best_practices"],
      "complexity": "beginner"
    },
    {
      "type": "technical",
      "content": "How do I optimize memory clock speeds for RTX 4090?",
      "expectedTopics": ["overclocking", "memory", "RTX_4090"],
      "complexity": "advanced"
    },
    {
      "type": "data_analysis",
      "content": "Analyze my portfolio performance trends",
      "expectedTopics": ["portfolio", "performance", "analysis"],
      "complexity": "intermediate",
      "requiresUserData": true
    }
  ],
  "mockAIResponses": [
    {
      "provider": "claude",
      "confidence": 0.95,
      "content": "For GPU mining best practices, I recommend...",
      "responseTime": 2500,
      "tokens": 150
    },
    {
      "provider": "gemini",
      "confidence": 0.88,
      "content": "Based on your data analysis request...",
      "responseTime": 3200,
      "tokens": 280
    }
  ]
}
```

### Conversation Test Fixtures
```javascript
async function createTestConversation(userId, options = {}) {
  const conversation = {
    id: crypto.randomUUID(),
    userId,
    title: options.title || 'Test Conversation',
    createdAt: new Date().toISOString(),
    updatedAt: options.lastActivity || new Date().toISOString()
  };
  
  await testDb.prepare(`
    INSERT INTO conversations (id, user_id, title, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    conversation.id,
    conversation.userId,
    conversation.title,
    conversation.createdAt,
    conversation.updatedAt
  ).run();
  
  // Add test messages
  const messageCount = options.messageCount || 4;
  for (let i = 0; i < messageCount; i++) {
    await addTestMessage(conversation.id, {
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Test message ${i + 1}`,
      order: i
    });
  }
  
  return conversation;
}
```

## IMPORTANT: Test Immutability
These tests are IMMUTABLE CONTRACTS. Once approved by human reviewer:
- **Hash**: SHA-256 will be calculated and stored
- **Claude Code CANNOT modify these tests**
- **Only humans can update tests with new hash approval**
- **Failed tests = failed implementation - no exceptions**
- **Missing MCP tools = blocked implementation - must alert user**

All tests must pass 100% before feature is considered complete. Test coverage must exceed 90% for all AI-powered analytics code.