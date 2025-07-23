# User Flow Diagrams

## Registration & Onboarding Flow

```mermaid
flowchart TD
    A[Landing Page] --> B{Returning User?}
    B -->|Yes| C[Login Form]
    B -->|No| D[Registration Form]
    
    C --> E{Valid Credentials?}
    E -->|No| F[Show Error Message]
    F --> C
    E -->|Yes| G[Dashboard]
    
    D --> H{Valid Registration?}
    H -->|No| I[Show Validation Errors]
    I --> D
    H -->|Yes| J[Email Verification Sent]
    J --> K[Check Email Page]
    K --> L{Email Verified?}
    L -->|No| M[Resend Verification]
    M --> K
    L -->|Yes| N[Welcome Onboarding]
    
    N --> O[Portfolio Setup Wizard]
    O --> P[GPU Configuration]
    P --> Q[Platform Connection]
    Q --> R[First Dashboard View]
    R --> G
    
    G --> S[Explore Features]
    S --> T{Ready for AI Chat?}
    T -->|Yes| U[AI Agent Tutorial]
    T -->|No| V[Pricing Intelligence]
    U --> W[First AI Conversation]
    V --> X[Market Dashboard]
    W --> G
    X --> G
    
    style A fill:#e1f5fe
    style G fill:#c8e6c9
    style J fill:#fff3e0
    style W fill:#f3e5f5
```

## Core User Journeys

### Journey 1: First-time User (David - Aspiring Host)

**Objective**: Learn GPU hosting basics and set up first monitoring setup

**Flow Stages**:
1. **Discovery**: Finds GPUScout through Discord recommendation
2. **Registration**: Creates free account to explore features
3. **Education**: Uses AI agent to learn GPU hosting fundamentals
4. **Setup**: Configures single RTX 3090 for monitoring
5. **Learning**: Explores pricing intelligence and market trends
6. **Decision**: Decides whether to proceed with GPU hosting

**Key Decision Points**:
- Trust: Does the platform feel credible and operator-built?
- Education: Can I learn what I need to get started safely?
- Value: Will this help me avoid costly beginner mistakes?

**Success Metrics**:
- Completes onboarding within 15 minutes
- Asks at least 5 questions to AI agent in first session
- Returns within 48 hours to check market data
- Conversion to paid tier within 60 days as income grows

### Journey 2: Daily Dashboard Usage (Alex - Individual Host)

**Objective**: Monitor 2x RTX 4090 performance and optimize pricing

**Flow Stages**:
1. **Morning Check**: Reviews overnight performance and any alerts
2. **Market Analysis**: Compares current pricing against market rates
3. **AI Consultation**: Asks specific questions about optimization
4. **Action Items**: Implements recommended pricing or configuration changes
5. **Alert Configuration**: Adjusts thresholds based on seasonal patterns

**Key Decision Points**:
- Performance: Are my GPUs performing as expected?
- Pricing: Am I leaving money on the table with current rates?
- Optimization: What actions will have the biggest impact?

**Success Metrics**:
- Daily active usage for 5+ days per week
- Revenue increase of 5-10% within 30 days
- Alert response time under 15 minutes
- Upgrade to Individual tier within 60 days

### Journey 3: Portfolio Optimization (Maria - Small Farm Operator)

**Objective**: Optimize 12 GPU fleet across multiple platforms

**Flow Stages**:
1. **Fleet Overview**: Analyze performance across all GPUs and platforms
2. **Comparative Analysis**: Benchmark against similar operations
3. **Opportunity Identification**: Find underperforming assets or market gaps
4. **Strategic Planning**: Plan hardware upgrades or platform changes
5. **Implementation**: Execute optimization recommendations
6. **Monitoring**: Track results and adjust strategy

**Key Decision Points**:
- ROI: Which optimizations will deliver the best return?
- Scale: Should I expand capacity or optimize existing assets?
- Platform: Am I using the best platforms for my hardware?

**Success Metrics**:
- Portfolio revenue increase of 10-15% within 90 days
- Reduced manual monitoring time by 50%
- Successful hardware expansion decisions
- Upgrade to Professional tier for advanced features

## Detailed Flow Diagrams

### AI Agent Interaction Flow

```mermaid
flowchart TD
    A[User Opens Chat] --> B[Load Conversation Context]
    B --> C[Display Chat Interface]
    C --> D[User Types Question]
    D --> E{Question Type?}
    
    E -->|General GPU Hosting| F[Route to Basic AI]
    E -->|Portfolio Specific| G[Route to Personalized AI]
    E -->|Market Analysis| H[Route to Data AI]
    
    F --> I[Claude Processing]
    G --> J[Claude + User Context]
    H --> K[Gemini + Market Data]
    
    I --> L[Generate Response]
    J --> M[Generate Personalized Response]
    K --> N[Generate Data-Driven Response]
    
    L --> O[Display Response]
    M --> O
    N --> O
    
    O --> P[User Reads Response]
    P --> Q{Follow-up Question?}
    Q -->|Yes| D
    Q -->|No| R[Save Conversation]
    R --> S[Update User Context]
    S --> T[End Session]
    
    style I fill:#f3e5f5
    style J fill:#e8f5e8
    style K fill:#e3f2fd
    style O fill:#fff3e0
```

### Portfolio Setup & Configuration Flow

```mermaid
flowchart TD
    A[Start Portfolio Creation] --> B[Portfolio Name & Description]
    B --> C[GPU Selection Interface]
    C --> D{GPU Model Known?}
    
    D -->|Yes| E[Select from Database]
    D -->|No| F[Custom GPU Entry]
    
    E --> G[Configure Quantity]
    F --> H[Enter Specifications]
    H --> G
    
    G --> I[Platform Mapping]
    I --> J{Using RunPod?}
    J -->|Yes| K[Enter RunPod Instance ID]
    J -->|No| L{Using Lambda Labs?}
    L -->|Yes| M[Enter Lambda Instance ID]
    L -->|No| N[Manual Entry]
    
    K --> O[Test Connection]
    M --> O
    N --> P[Skip Platform Integration]
    
    O --> Q{Connection Successful?}
    Q -->|No| R[Show Connection Error]
    R --> I
    Q -->|Yes| S[Calculate Power & Revenue]
    P --> S
    
    S --> T[Review Configuration]
    T --> U{Add More GPUs?}
    U -->|Yes| C
    U -->|No| V[Save Portfolio]
    V --> W[Show Success Message]
    W --> X[Redirect to Dashboard]
    
    style A fill:#e1f5fe
    style W fill:#c8e6c9
    style R fill:#ffebee
    style O fill:#fff3e0
```

### Alert Configuration & Delivery Flow

```mermaid
flowchart TD
    A[Open Alert Center] --> B[Display Current Alerts]
    B --> C{Create New Alert?}
    C -->|Yes| D[Alert Type Selection]
    C -->|No| E[Modify Existing Alert]
    
    D --> F{Alert Type?}
    F -->|Utilization Drop| G[Set Utilization Threshold]
    F -->|Revenue Change| H[Set Revenue Threshold]
    F -->|Market Opportunity| I[Set Market Conditions]
    
    G --> J[Configure Notifications]
    H --> J
    I --> J
    
    J --> K{Notification Channel?}
    K -->|Email| L[Configure Email Settings]
    K -->|Discord| M[Configure Discord Webhook]
    K -->|Both| N[Configure Both Channels]
    
    L --> O[Test Notification]
    M --> O
    N --> O
    
    O --> P{Test Successful?}
    P -->|No| Q[Show Configuration Error]
    Q --> J
    P -->|Yes| R[Save Alert Configuration]
    R --> S[Activate Alert Monitoring]
    
    E --> T[Modify Alert Settings]
    T --> O
    
    S --> U[Background Monitoring]
    U --> V{Threshold Triggered?}
    V -->|No| U
    V -->|Yes| W[Generate Alert]
    W --> X[Check Rate Limiting]
    X --> Y{Can Send Alert?}
    Y -->|No| Z[Log Suppressed Alert]
    Y -->|Yes| AA[Send Notification]
    AA --> BB[Log Alert Delivery]
    BB --> CC[Update Alert Statistics]
    
    style S fill:#c8e6c9
    style W fill:#fff3e0
    style AA fill:#e8f5e8
    style Z fill:#ffebee
```

## Screen Flow Map

```mermaid
graph LR
    Landing[Landing Page] --> Register[Registration]
    Landing --> Login[Login]
    
    Register --> Verify[Email Verification]
    Verify --> Onboarding[Welcome Onboarding]
    Login --> Dashboard[Main Dashboard]
    
    Onboarding --> PortfolioSetup[Portfolio Setup]
    PortfolioSetup --> Dashboard
    
    Dashboard --> AIChat[AI Chat Interface]
    Dashboard --> Pricing[Pricing Intelligence]
    Dashboard --> Alerts[Alert Center]
    Dashboard --> Analytics[Advanced Analytics]
    Dashboard --> Portfolio[Portfolio Management]
    
    AIChat --> Conversations[Conversation History]
    Pricing --> Markets[Market Analysis]
    Alerts --> AlertConfig[Alert Configuration]
    Analytics --> Reports[Custom Reports]
    Portfolio --> GPUConfig[GPU Configuration]
    
    Markets --> Opportunities[Market Opportunities]
    AlertConfig --> Notifications[Notification Settings]
    Reports --> Insights[AI Insights]
    GPUConfig --> Platforms[Platform Integration]
    
    Conversations --> Dashboard
    Opportunities --> Dashboard
    Notifications --> Dashboard
    Insights --> Dashboard
    Platforms --> Dashboard
    
    style Landing fill:#e1f5fe
    style Dashboard fill:#c8e6c9
    style AIChat fill:#f3e5f5
    style Pricing fill:#e3f2fd
    style Alerts fill:#fff3e0
```

## Error State Flows

### Connection Failure Recovery

```mermaid
flowchart TD
    A[API Call Made] --> B{Response Received?}
    B -->|No| C[Show Loading State]
    C --> D[Timeout After 30s]
    D --> E[Show Connection Error]
    E --> F{Retry Available?}
    F -->|Yes| G[Show Retry Button]
    F -->|No| H[Show Fallback Content]
    
    G --> I[User Clicks Retry]
    I --> A
    
    B -->|Yes| J{Response Valid?}
    J -->|No| K[Show Data Error]
    J -->|Yes| L[Display Content]
    
    K --> M[Log Error Details]
    M --> N[Show User-Friendly Message]
    N --> O[Suggest Alternative Action]
    
    H --> P[Display Cached Data]
    P --> Q[Show "Data May Be Outdated" Warning]
    
    style E fill:#ffebee
    style K fill:#ffebee
    style H fill:#fff3e0
    style L fill:#c8e6c9
```

### Form Validation & Error Handling

```mermaid
flowchart TD
    A[User Submits Form] --> B[Client-Side Validation]
    B --> C{Valid Input?}
    C -->|No| D[Show Field Errors]
    D --> E[Highlight Invalid Fields]
    E --> F[Focus First Error Field]
    F --> G[User Corrects Input]
    G --> A
    
    C -->|Yes| H[Submit to Server]
    H --> I{Server Validation?}
    I -->|Failed| J[Show Server Errors]
    I -->|Passed| K[Process Request]
    
    J --> L{Specific Field Errors?}
    L -->|Yes| M[Map to Form Fields]
    L -->|No| N[Show General Error]
    M --> E
    N --> O[Show Error Banner]
    
    K --> P{Processing Successful?}
    P -->|No| Q[Show Processing Error]
    P -->|Yes| R[Show Success Message]
    R --> S[Redirect or Update UI]
    
    Q --> T[Log Error for Investigation]
    T --> U[Show User-Friendly Error]
    U --> V[Suggest Next Steps]
    
    style D fill:#ffebee
    style J fill:#ffebee
    style Q fill:#ffebee
    style R fill:#c8e6c9
    style S fill:#e8f5e8
```

## Mobile-Responsive Flow Considerations

### Mobile Dashboard Navigation

```mermaid
flowchart TD
    A[Mobile Dashboard Load] --> B[Responsive Layout Check]
    B --> C{Screen Size?}
    C -->|Phone| D[Collapsed Navigation]
    C -->|Tablet| E[Condensed Navigation]
    C -->|Desktop| F[Full Navigation]
    
    D --> G[Hamburger Menu]
    G --> H[Slide-out Navigation]
    H --> I[Touch-Optimized Menu Items]
    
    E --> J[Tab-Based Navigation]
    J --> K[Swipe Gestures Enabled]
    
    F --> L[Standard Desktop Layout]
    
    I --> M[Feature Selection]
    K --> M
    L --> M
    
    M --> N{Feature Selected?}
    N -->|AI Chat| O[Mobile Chat Interface]
    N -->|Portfolio| P[Mobile Portfolio View]
    N -->|Pricing| Q[Mobile Pricing View]
    
    O --> R[Optimized Message Layout]
    P --> S[Card-Based GPU Display]
    Q --> T[Simplified Price Tables]
    
    style G fill:#e3f2fd
    style H fill:#e8f5e8
    style R fill:#f3e5f5
    style S fill:#fff3e0
    style T fill:#e1f5fe
```

## Performance Optimization Flow

### Progressive Loading Strategy

```mermaid
flowchart TD
    A[Page Load Request] --> B[Load Critical CSS]
    B --> C[Render Above-Fold Content]
    C --> D[Load JavaScript Bundle]
    D --> E[Initialize React App]
    E --> F[Fetch User Data]
    F --> G[Show Loading Skeleton]
    G --> H[Fetch Dashboard Data]
    H --> I{Data Cached?}
    I -->|Yes| J[Load from Cache]
    I -->|No| K[Fetch from API]
    J --> L[Display Dashboard]
    K --> M[Cache Response]
    M --> L
    
    L --> N[Background: Fetch Updates]
    N --> O[Update UI When Available]
    
    style C fill:#c8e6c9
    style G fill:#fff3e0
    style L fill:#e8f5e8
    style O fill:#e1f5fe
```

## Analytics & Conversion Tracking

### User Engagement Flow Tracking

**Key Metrics to Track**:
- Registration completion rate
- Onboarding step completion
- Time to first AI question
- Portfolio setup completion
- Daily active usage patterns
- Feature adoption rates
- Conversion to paid tiers

**Conversion Funnel Stages**:
1. Landing page view → Registration start (20-30% expected)
2. Registration start → Email verification (70-80% expected)
3. Email verification → Portfolio setup (80-90% expected)
4. Portfolio setup → First AI interaction (60-70% expected)
5. Active usage → Paid conversion (15-20% expected after 30 days)

**A/B Testing Opportunities**:
- Registration form length and fields
- Onboarding flow complexity and guidance
- AI chat introduction and tutorial
- Pricing page design and messaging
- Dashboard layout and feature prominence

This comprehensive user flow design ensures optimal user experience across all devices and user types, with clear paths to value realization and conversion. The flows are designed to support AI-assisted development by providing detailed specifications for each interaction and decision point.