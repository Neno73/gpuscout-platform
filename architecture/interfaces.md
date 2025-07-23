# Interface Contracts

## Purpose

Interface contracts are critical for AI-assisted development where multiple features may be developed in parallel. These contracts define the exact API specifications BEFORE implementation begins, preventing integration issues and enabling independent development of interconnected features.

## Core Interface Design Principles

### 1. Contract-First Development
- APIs designed and documented before implementation
- Breaking changes require version increments
- Backward compatibility maintained through versioning
- Mock implementations provided for testing

### 2. Service Independence
- Each service can be developed and deployed independently
- Clear separation of concerns between services
- Standardized error handling and response formats
- Consistent authentication and authorization patterns

### 3. AI Development Optimization
- Clear, unambiguous specifications for AI code generation
- Comprehensive examples and edge cases documented
- Input validation and error scenarios explicitly defined
- Performance requirements specified for each endpoint

## API Contract Standards

### Standard Response Format
```yaml
# All API responses follow this structure
StandardResponse:
  type: object
  properties:
    success:
      type: boolean
      description: Whether the request succeeded
    data:
      type: object
      description: Response payload (varies by endpoint)
    error:
      type: object
      description: Error details if success is false
      properties:
        code:
          type: string
          description: Machine-readable error code
        message:
          type: string
          description: Human-readable error message
        details:
          type: object
          description: Additional error context
    meta:
      type: object
      description: Response metadata
      properties:
        timestamp:
          type: string
          format: date-time
        version:
          type: string
          description: API version used
        request_id:
          type: string
          description: Unique request identifier for debugging
```

### Authentication Headers
```yaml
# Standard authentication for all protected endpoints
SecuritySchemes:
  BearerAuth:
    type: http
    scheme: bearer
    bearerFormat: JWT
    description: JWT token in Authorization header
  
  ApiKeyAuth:
    type: apiKey
    in: header
    name: X-API-Key
    description: API key for service-to-service authentication
```

## User Service Interface

```yaml
openapi: 3.0.0
info:
  title: User Service API
  version: 1.0.0
  description: User authentication, profile management, and subscription handling

paths:
  /api/v1/users/profile:
    get:
      summary: Get current user profile
      security:
        - BearerAuth: []
      responses:
        200:
          description: User profile data
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/StandardResponse'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/UserProfile'
        401:
          $ref: '#/components/responses/Unauthorized'
    
    put:
      summary: Update user profile
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserProfileUpdate'
      responses:
        200:
          description: Profile updated successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/StandardResponse'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/UserProfile'

  /api/v1/users/subscription:
    get:
      summary: Get user subscription status
      security:
        - BearerAuth: []
      responses:
        200:
          description: Subscription details
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/StandardResponse'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/Subscription'

  /api/v1/auth/login:
    post:
      summary: Authenticate user and return JWT tokens
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 8
      responses:
        200:
          description: Authentication successful
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/StandardResponse'
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          access_token:
                            type: string
                          refresh_token:
                            type: string
                          expires_in:
                            type: integer
                          user:
                            $ref: '#/components/schemas/UserProfile'

components:
  schemas:
    UserProfile:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
        timezone:
          type: string
          description: IANA timezone identifier
        language:
          type: string
          enum: [en, es, fr, de]
        subscription_tier:
          type: string
          enum: [free, individual, professional, enterprise]
        preferences:
          type: object
          description: User customization preferences
        created_at:
          type: string
          format: date-time
        last_login:
          type: string
          format: date-time
    
    UserProfileUpdate:
      type: object
      properties:
        name:
          type: string
          maxLength: 100
        timezone:
          type: string
        language:
          type: string
          enum: [en, es, fr, de]
        preferences:
          type: object
    
    Subscription:
      type: object
      properties:
        tier:
          type: string
          enum: [free, individual, professional, enterprise]
        status:
          type: string
          enum: [active, cancelled, past_due, trialing]
        current_period_start:
          type: string
          format: date-time
        current_period_end:
          type: string
          format: date-time
        monthly_price:
          type: number
          format: decimal
        features:
          type: array
          items:
            type: string
```

## Portfolio Service Interface

```yaml
openapi: 3.0.0
info:
  title: Portfolio Service API
  version: 1.0.0
  description: GPU portfolio management and performance tracking

paths:
  /api/v1/portfolios:
    get:
      summary: List user portfolios
      security:
        - BearerAuth: []
      parameters:
        - name: include_inactive
          in: query
          schema:
            type: boolean
            default: false
      responses:
        200:
          description: List of portfolios
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/StandardResponse'
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          $ref: '#/components/schemas/Portfolio'
    
    post:
      summary: Create new portfolio
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PortfolioCreate'
      responses:
        201:
          description: Portfolio created successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/StandardResponse'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/Portfolio'

  /api/v1/portfolios/{portfolio_id}/performance:
    get:
      summary: Get portfolio performance metrics
      security:
        - BearerAuth: []
      parameters:
        - name: portfolio_id
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: time_range
          in: query
          schema:
            type: string
            enum: [24h, 7d, 30d, 90d]
            default: 7d
      responses:
        200:
          description: Performance metrics
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/StandardResponse'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/PerformanceMetrics'

  /api/v1/portfolios/{portfolio_id}/optimization:
    get:
      summary: Get AI-powered optimization recommendations
      security:
        - BearerAuth: []
      parameters:
        - name: portfolio_id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        200:
          description: Optimization recommendations
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/StandardResponse'
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          $ref: '#/components/schemas/OptimizationRecommendation'

components:
  schemas:
    Portfolio:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        description:
          type: string
        total_power_consumption:
          type: number
          format: decimal
          description: Total power consumption in watts
        estimated_monthly_revenue:
          type: number
          format: decimal
          description: AI-calculated revenue estimate
        gpu_count:
          type: integer
          description: Total number of GPUs in portfolio
        is_active:
          type: boolean
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time
    
    PortfolioCreate:
      type: object
      required:
        - name
      properties:
        name:
          type: string
          maxLength: 100
        description:
          type: string
          maxLength: 500
    
    PerformanceMetrics:
      type: object
      properties:
        time_range:
          type: string
        average_utilization:
          type: number
          format: decimal
        total_revenue:
          type: number
          format: decimal
        revenue_trend:
          type: string
          enum: [increasing, decreasing, stable]
        gpu_performance:
          type: array
          items:
            type: object
            properties:
              gpu_id:
                type: string
                format: uuid
              model:
                type: string
              utilization:
                type: number
                format: decimal
              revenue:
                type: number
                format: decimal
              uptime:
                type: number
                format: decimal
    
    OptimizationRecommendation:
      type: object
      properties:
        id:
          type: string
          format: uuid
        type:
          type: string
          enum: [pricing, hardware, platform, configuration]
        title:
          type: string
        description:
          type: string
        estimated_impact:
          type: number
          format: decimal
          description: Estimated revenue impact percentage
        confidence_level:
          type: string
          enum: [low, medium, high]
        implementation_steps:
          type: array
          items:
            type: string
        created_at:
          type: string
          format: date-time
```

## Market Data Service Interface

```yaml
openapi: 3.0.0
info:
  title: Market Data Service API
  version: 1.0.0
  description: GPU market intelligence and pricing data

paths:
  /api/v1/market/pricing:
    get:
      summary: Get current market pricing data
      security:
        - BearerAuth: []
      parameters:
        - name: gpu_model
          in: query
          schema:
            type: string
          description: Filter by specific GPU model
        - name: platform
          in: query
          schema:
            type: string
            enum: [runpod, lambda, vast, paperspace, all]
            default: all
        - name: region
          in: query
          schema:
            type: string
      responses:
        200:
          description: Current pricing data
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/StandardResponse'
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          $ref: '#/components/schemas/MarketPricing'

  /api/v1/market/comparison:
    post:
      summary: Compare user pricing against market
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - gpu_model
                - current_price
              properties:
                gpu_model:
                  type: string
                current_price:
                  type: number
                  format: decimal
                platform:
                  type: string
                region:
                  type: string
      responses:
        200:
          description: Pricing comparison analysis
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/StandardResponse'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/PricingComparison'

  /api/v1/market/trends:
    get:
      summary: Get market trend analysis
      security:
        - BearerAuth: []
      parameters:
        - name: gpu_model
          in: query
          schema:
            type: string
        - name: timeframe
          in: query
          schema:
            type: string
            enum: [7d, 30d, 90d]
            default: 30d
      responses:
        200:
          description: Market trend data
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/StandardResponse'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/MarketTrends'

components:
  schemas:
    MarketPricing:
      type: object
      properties:
        gpu_model:
          type: string
        platform:
          type: string
        region:
          type: string
        average_price:
          type: number
          format: decimal
        min_price:
          type: number
          format: decimal
        max_price:
          type: number
          format: decimal
        average_utilization:
          type: number
          format: decimal
        active_instances:
          type: integer
        last_updated:
          type: string
          format: date-time
    
    PricingComparison:
      type: object
      properties:
        user_price:
          type: number
          format: decimal
        market_average:
          type: number
          format: decimal
        market_percentile:
          type: number
          format: decimal
          description: User's price percentile (0-100)
        recommendation:
          type: string
          enum: [increase, decrease, maintain]
        suggested_price:
          type: number
          format: decimal
        potential_impact:
          type: number
          format: decimal
          description: Estimated revenue change percentage
    
    MarketTrends:
      type: object
      properties:
        gpu_model:
          type: string
        timeframe:
          type: string
        price_trend:
          type: string
          enum: [increasing, decreasing, stable, volatile]
        utilization_trend:
          type: string
          enum: [increasing, decreasing, stable]
        demand_forecast:
          type: string
          enum: [high, medium, low]
        seasonal_factors:
          type: array
          items:
            type: object
            properties:
              factor:
                type: string
              impact:
                type: string
                enum: [positive, negative, neutral]
              confidence:
                type: number
                format: decimal
```

## AI Agent Service Interface

```yaml
openapi: 3.0.0
info:
  title: AI Agent Service API
  version: 1.0.0
  description: Conversational AI for GPU hosting optimization

paths:
  /api/v1/ai/conversations:
    get:
      summary: List user conversations
      security:
        - BearerAuth: []
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: offset
          in: query
          schema:
            type: integer
            minimum: 0
            default: 0
      responses:
        200:
          description: List of conversations
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/StandardResponse'
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          $ref: '#/components/schemas/Conversation'
    
    post:
      summary: Start new conversation
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - message
              properties:
                message:
                  type: string
                  maxLength: 2000
                context:
                  type: object
                  description: Additional context for AI processing
      responses:
        201:
          description: Conversation started
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/StandardResponse'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/ConversationResponse'

  /api/v1/ai/conversations/{conversation_id}/messages:
    post:
      summary: Send message to existing conversation
      security:
        - BearerAuth: []
      parameters:
        - name: conversation_id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - message
              properties:
                message:
                  type: string
                  maxLength: 2000
      responses:
        200:
          description: AI response generated
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/StandardResponse'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/ConversationResponse'

  /api/v1/ai/usage:
    get:
      summary: Get user AI usage statistics
      security:
        - BearerAuth: []
      responses:
        200:
          description: Usage statistics
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/StandardResponse'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/AIUsage'

components:
  schemas:
    Conversation:
      type: object
      properties:
        id:
          type: string
          format: uuid
        title:
          type: string
        message_count:
          type: integer
        started_at:
          type: string
          format: date-time
        last_message_at:
          type: string
          format: date-time
        is_archived:
          type: boolean
    
    ConversationResponse:
      type: object
      properties:
        conversation_id:
          type: string
          format: uuid
        message_id:
          type: string
          format: uuid
        response:
          type: string
        processing_time:
          type: number
          format: decimal
          description: Response generation time in seconds
        context_used:
          type: boolean
          description: Whether conversation context was used
        suggestions:
          type: array
          items:
            type: string
          description: Suggested follow-up questions
    
    AIUsage:
      type: object
      properties:
        current_period:
          type: object
          properties:
            start_date:
              type: string
              format: date
            end_date:
              type: string
              format: date
            conversations:
              type: integer
            messages:
              type: integer
            tokens_used:
              type: integer
        limits:
          type: object
          properties:
            conversations:
              type: integer
            messages:
              type: integer
            tokens:
              type: integer
        percentage_used:
          type: object
          properties:
            conversations:
              type: number
              format: decimal
            messages:
              type: number
              format: decimal
            tokens:
              type: number
              format: decimal
```

## Alert Service Interface

```yaml
openapi: 3.0.0
info:
  title: Alert Service API
  version: 1.0.0
  description: Alert configuration and notification management

paths:
  /api/v1/alerts:
    get:
      summary: List user alerts
      security:
        - BearerAuth: []
      parameters:
        - name: active_only
          in: query
          schema:
            type: boolean
            default: true
      responses:
        200:
          description: List of alerts
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/StandardResponse'
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          $ref: '#/components/schemas/Alert'
    
    post:
      summary: Create new alert
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AlertCreate'
      responses:
        201:
          description: Alert created successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/StandardResponse'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/Alert'

  /api/v1/alerts/{alert_id}:
    put:
      summary: Update alert configuration
      security:
        - BearerAuth: []
      parameters:
        - name: alert_id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AlertUpdate'
      responses:
        200:
          description: Alert updated successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/StandardResponse'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/Alert'
    
    delete:
      summary: Delete alert
      security:
        - BearerAuth: []
      parameters:
        - name: alert_id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        204:
          description: Alert deleted successfully

  /api/v1/alerts/{alert_id}/test:
    post:
      summary: Test alert notification delivery
      security:
        - BearerAuth: []
      parameters:
        - name: alert_id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        200:
          description: Test notification sent
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/StandardResponse'
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          delivery_status:
                            type: string
                            enum: [success, failed]
                          delivery_time:
                            type: number
                            format: decimal
                          error_message:
                            type: string

components:
  schemas:
    Alert:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        alert_type:
          type: string
          enum: [utilization_drop, revenue_change, market_opportunity, system_health]
        conditions:
          type: object
          description: Alert trigger conditions (varies by type)
        notification_settings:
          type: object
          properties:
            email:
              type: boolean
            discord:
              type: boolean
            webhook_url:
              type: string
              format: uri
        is_active:
          type: boolean
        trigger_count:
          type: integer
        last_triggered:
          type: string
          format: date-time
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time
    
    AlertCreate:
      type: object
      required:
        - name
        - alert_type
        - conditions
        - notification_settings
      properties:
        name:
          type: string
          maxLength: 100
        alert_type:
          type: string
          enum: [utilization_drop, revenue_change, market_opportunity, system_health]
        conditions:
          type: object
        notification_settings:
          type: object
          properties:
            email:
              type: boolean
              default: true
            discord:
              type: boolean
              default: false
            webhook_url:
              type: string
              format: uri
    
    AlertUpdate:
      type: object
      properties:
        name:
          type: string
          maxLength: 100
        conditions:
          type: object
        notification_settings:
          type: object
        is_active:
          type: boolean
```

## Interface Compliance Rules

### 1. Version Management
- **Semantic Versioning**: Major.Minor.Patch (e.g., 1.2.3)
- **Breaking Changes**: Require major version increment
- **Backward Compatibility**: Maintained for one major version
- **Deprecation Policy**: 6-month notice before removal

### 2. Implementation Requirements
- **Interface Implementation**: All services MUST implement their declared interfaces exactly
- **Mock Implementations**: Required for all interfaces during development
- **Integration Testing**: Automated tests verify interface compliance
- **Documentation**: OpenAPI specs must be kept up-to-date with implementation

### 3. Error Handling Standards
```yaml
# Standard error response format
ErrorResponse:
  type: object
  properties:
    success:
      type: boolean
      enum: [false]
    error:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: string
          description: Machine-readable error code
          examples: [VALIDATION_ERROR, RESOURCE_NOT_FOUND, PERMISSION_DENIED]
        message:
          type: string
          description: Human-readable error message
        details:
          type: object
          description: Additional error context
        field_errors:
          type: array
          items:
            type: object
            properties:
              field:
                type: string
              code:
                type: string
              message:
                type: string
```

### 4. Performance Requirements
- **Response Times**: 
  - Simple queries: <200ms
  - Complex analytics: <500ms
  - AI responses: <5s
- **Rate Limiting**: Defined per endpoint and user tier
- **Caching**: Cache headers specified for all GET endpoints
- **Pagination**: Standardized across all list endpoints

### 5. Security Standards
- **Authentication**: JWT tokens required for all protected endpoints
- **Authorization**: Role-based access control implementation
- **Input Validation**: JSON Schema validation on all inputs
- **Output Sanitization**: XSS prevention on all outputs

## Integration Testing Framework

### Contract Testing Implementation
```javascript
// Example contract test for Portfolio Service
describe('Portfolio Service Contract', () => {
  const portfolioService = new PortfolioServiceClient();
  
  it('should return portfolios matching the interface schema', async () => {
    const response = await portfolioService.getPortfolios();
    
    expect(response).toMatchSchema(StandardResponse);
    expect(response.data).toBeInstanceOf(Array);
    response.data.forEach(portfolio => {
      expect(portfolio).toMatchSchema(PortfolioSchema);
    });
  });
  
  it('should handle errors according to standard format', async () => {
    const invalidRequest = portfolioService.createPortfolio({});
    
    await expect(invalidRequest).rejects.toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        field_errors: expect.any(Array)
      }
    });
  });
});
```

### Mock Service Generation
```javascript
// Auto-generated mock service from OpenAPI spec
class MockPortfolioService {
  constructor(spec) {
    this.spec = spec;
    this.mockData = generateMockData(spec);
  }
  
  async getPortfolios(params) {
    // Validate request parameters against schema
    validateRequest(this.spec.paths['/portfolios'].get, params);
    
    // Return mock data matching response schema
    return {
      success: true,
      data: this.mockData.portfolios,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        request_id: generateRequestId()
      }
    };
  }
}
```

This comprehensive interface design enables true parallel development with AI assistance while ensuring system integration remains seamless and maintainable. The contracts serve as the foundation for both human developers and AI code generation tools to build compatible, interoperable services.