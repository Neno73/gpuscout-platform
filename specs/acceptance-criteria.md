# Acceptance Criteria Master List

## EARS Format Requirements

### Feature: User Authentication & Registration

#### Triggers (Event-Driven Requirements)
- WHEN user visits registration page THE system SHALL display form with email, password, timezone, and GDPR consent fields
- WHEN user submits registration form THE system SHALL validate all inputs according to security requirements
- WHEN validation passes THE system SHALL create user account and send verification email within 5 minutes
- WHEN user clicks verification link THE system SHALL activate account and redirect to onboarding flow
- WHEN user attempts login THE system SHALL validate credentials and create JWT session
- WHEN user requests password reset THE system SHALL send secure reset link with 24-hour expiration
- WHEN JWT token expires THE system SHALL refresh automatically using refresh token
- WHEN user logs out THE system SHALL invalidate JWT token and clear session data

#### States (State-Driven Requirements)
- WHERE user is not authenticated THE system SHALL redirect to login page for protected routes
- WHERE user email is unverified THE system SHALL restrict access to verification-only pages
- WHERE user session has expired THE system SHALL prompt re-authentication with context preservation
- WHERE account is locked THE system SHALL display unlock instructions and cooldown timer
- WHERE user has TOTP enabled THE system SHALL require second factor for authentication
- WHERE user is first-time visitor THE system SHALL show welcome onboarding sequence

#### Conditions (Conditional Requirements)
- IF email already exists THEN THE system SHALL display "Email already registered" error
- IF password is weak THEN THE system SHALL show strength requirements with real-time feedback
- IF verification token is expired THEN THE system SHALL offer resend option with new token
- IF login attempts exceed 5 failures THEN THE system SHALL lock account for 15 minutes
- IF user is from EU THEN THE system SHALL display GDPR compliance checkbox
- IF password reset token is invalid THEN THE system SHALL show clear error with help options

#### Continuous States (Ongoing Requirements)
- WHILE user is typing password THE system SHALL show strength indicator without revealing content
- WHILE form is submitting THE system SHALL disable submit button and show loading state
- WHILE session is active THE system SHALL refresh tokens 5 minutes before expiry
- WHILE account is locked THE system SHALL display remaining cooldown time
- WHILE verification email is pending THE system SHALL show resend option after 2 minutes

#### Invariants (Always True)
- THE system SHALL encrypt all passwords with bcrypt using 12 salt rounds
- THE system SHALL use cryptographically secure tokens for verification and reset
- THE system SHALL log all authentication attempts for security monitoring
- THE system SHALL validate email format using RFC 5322 standard
- THE system SHALL enforce password complexity (8+ chars, mixed case, numbers, symbols)
- THE system SHALL rate limit authentication endpoints (3 attempts per minute per IP)

### Feature: Portfolio Management

#### Triggers
- WHEN user creates portfolio THE system SHALL launch guided wizard with GPU selection
- WHEN GPU is added to portfolio THE system SHALL calculate power consumption and revenue estimates
- WHEN portfolio configuration changes THE system SHALL recalculate all derived metrics
- WHEN user saves portfolio THE system SHALL validate configuration and store changes
- WHEN platform integration is configured THE system SHALL test API connection
- WHEN portfolio is deleted THE system SHALL soft delete and archive historical data

#### States
- WHERE user has free tier THE system SHALL limit to 1 portfolio maximum
- WHERE user has individual tier THE system SHALL allow up to 3 portfolios
- WHERE user has professional tier THE system SHALL enable unlimited portfolios
- WHERE portfolio is active THE system SHALL collect performance metrics every 60 seconds
- WHERE GPU model is not in database THE system SHALL allow custom model entry
- WHERE platform integration fails THE system SHALL show cached data with staleness indicator

#### Conditions
- IF GPU model specifications are invalid THEN THE system SHALL show validation errors
- IF power consumption exceeds safe limits THEN THE system SHALL display warning message
- IF platform API credentials are invalid THEN THE system SHALL prompt reconfiguration
- IF portfolio has no GPUs THEN THE system SHALL disable activation option
- IF custom GPU model lacks specifications THEN THE system SHALL require manual input
- IF user exceeds tier limits THEN THE system SHALL show upgrade prompts

#### Continuous States
- WHILE portfolio wizard is active THE system SHALL save progress automatically
- WHILE editing GPU configuration THE system SHALL update estimates in real-time
- WHILE platform sync is running THE system SHALL show progress indicator
- WHILE validation is in progress THE system SHALL disable form submission
- WHILE calculating estimates THE system SHALL use latest market data

#### Invariants
- THE system SHALL validate all GPU model references against specifications database
- THE system SHALL maintain audit trail of portfolio configuration changes
- THE system SHALL calculate power consumption from base specs plus overclocking factors
- THE system SHALL store platform credentials securely with encryption
- THE system SHALL backup portfolio data in real-time to prevent loss

### Feature: AI-Powered Analytics

#### Triggers
- WHEN user asks question THE AI agent SHALL respond within 5 seconds using conversation context
- WHEN conversation starts THE system SHALL load user profile and preferences for personalization
- WHEN user exceeds message quota THE system SHALL display upgrade prompt with benefits
- WHEN AI generates response THE system SHALL log token usage and processing time
- WHEN conversation becomes long THE system SHALL summarize context to maintain performance
- WHEN user provides feedback THE system SHALL update personalization algorithms

#### States
- WHERE user has conversation history THE system SHALL maintain context across sessions
- WHERE user has specific hardware setup THE system SHALL tailor responses to configuration
- WHERE user demonstrates technical proficiency THE system SHALL adapt communication style
- WHERE user is new to platform THE system SHALL provide educational guidance
- WHERE conversation exceeds token limits THE system SHALL gracefully summarize and continue
- WHERE AI confidence is low THE system SHALL indicate uncertainty and suggest alternatives

#### Conditions
- IF question is outside domain knowledge THEN THE system SHALL refer to community resources
- IF user quota is exceeded THEN THE system SHALL show clear upgrade path
- IF AI processing fails THEN THE system SHALL provide fallback response and retry option
- IF conversation context is lost THEN THE system SHALL acknowledge and start fresh
- IF user asks sensitive questions THEN THE system SHALL provide appropriate disclaimers
- IF optimization suggestion has low confidence THEN THE system SHALL clearly indicate uncertainty

#### Continuous States
- WHILE generating response THE system SHALL show typing indicator and processing status
- WHILE learning user preferences THE system SHALL adjust recommendations accordingly
- WHILE conversation is active THE system SHALL maintain context for follow-up questions
- WHILE processing complex queries THE system SHALL break down analysis steps
- WHILE user is idle THE system SHALL suggest relevant questions or topics

#### Invariants
- THE system SHALL store conversation history securely with encryption
- THE system SHALL respect user privacy and never share conversation data
- THE system SHALL use latest market data and portfolio info for recommendations
- THE system SHALL track usage accurately for billing and quota enforcement
- THE system SHALL provide citations and sources for factual claims

### Feature: Market Intelligence & Pricing

#### Triggers
- WHEN market data is updated THE system SHALL refresh pricing comparisons within 15 minutes
- WHEN user's pricing deviates significantly THE system SHALL generate optimization alert
- WHEN new market opportunities are detected THE system SHALL notify relevant users
- WHEN 500.farm API responds THE system SHALL validate and store data with timestamps
- WHEN data quality issues are found THE system SHALL flag for manual review
- WHEN competitor pricing changes THE system SHALL update competitive analysis

#### States
- WHERE real-time data is available THE system SHALL display current market conditions
- WHERE data is stale THE system SHALL show last-updated timestamp with refresh option
- WHERE user has specific GPU models THE system SHALL filter relevant market segments
- WHERE market volatility is high THE system SHALL indicate uncertainty in recommendations
- WHERE historical data exists THE system SHALL show trend analysis and patterns
- WHERE API is unavailable THE system SHALL use cached data with clear indicators

#### Conditions
- IF 500.farm API returns errors THEN THE system SHALL retry with exponential backoff
- IF data validation fails THEN THE system SHALL exclude invalid entries and log issues
- IF pricing recommendations could cause losses THEN THE system SHALL require confirmation
- IF market conditions are unusual THEN THE system SHALL highlight anomalies
- IF user portfolio differs from market norm THEN THE system SHALL explain implications
- IF competitive intelligence is outdated THEN THE system SHALL trigger data refresh

#### Continuous States
- WHILE collecting market data THE system SHALL validate accuracy and completeness
- WHILE analyzing trends THE system SHALL consider seasonal factors and external events
- WHILE generating recommendations THE system SHALL simulate revenue impact
- WHILE monitoring competition THE system SHALL track pricing and feature changes
- WHILE updating database THE system SHALL maintain data integrity and relationships

#### Invariants
- THE system SHALL maintain complete audit trail of market data sources and updates
- THE system SHALL validate all pricing data against statistical outlier detection
- THE system SHALL store historical data for minimum 2 years for trend analysis
- THE system SHALL encrypt market intelligence data to protect competitive advantages
- THE system SHALL rate limit external API calls to respect service provider terms

### Feature: Real-Time Dashboard

#### Triggers
- WHEN user accesses dashboard THE system SHALL load portfolio data within 2 seconds
- WHEN performance metrics are updated THE system SHALL broadcast changes via WebSocket
- WHEN user changes time range THE system SHALL query and display historical data
- WHEN GPU utilization drops THE system SHALL update dashboard immediately
- WHEN revenue targets are met THE system SHALL show congratulatory notification
- WHEN dashboard is refreshed THE system SHALL fetch latest data from all sources

#### States
- WHERE user has multiple portfolios THE system SHALL provide portfolio selector
- WHERE GPU is offline THE system SHALL display clear offline status indicator
- WHERE data is loading THE system SHALL show skeleton placeholders
- WHERE WebSocket disconnects THE system SHALL attempt reconnection with fallback to polling
- WHERE user is on mobile THE system SHALL adapt layout for smaller screens
- WHERE dashboard has errors THE system SHALL display user-friendly error messages

#### Conditions
- IF real-time data is unavailable THEN THE system SHALL show cached data with timestamps
- IF WebSocket connection fails THEN THE system SHALL fall back to periodic polling
- IF performance metrics are concerning THEN THE system SHALL highlight issues prominently
- IF user portfolio is underperforming THEN THE system SHALL suggest optimization actions
- IF data visualization fails THEN THE system SHALL provide tabular fallback view
- IF user preferences specify alerts THEN THE system SHALL show notification indicators

#### Continuous States
- WHILE dashboard is open THE system SHALL update metrics every 60 seconds
- WHILE user hovers over charts THE system SHALL show detailed tooltips with context
- WHILE data is being processed THE system SHALL maintain responsive interface
- WHILE calculations are running THE system SHALL show progress indicators
- WHILE user scrolls THE system SHALL lazy load additional historical data

#### Invariants
- THE system SHALL maintain sub-2-second load times for dashboard access
- THE system SHALL display accurate timestamp for all data points
- THE system SHALL use consistent color coding and visual language
- THE system SHALL work across all major browsers and mobile devices
- THE system SHALL cache dashboard data appropriately to minimize API calls

### Feature: Alerts & Notifications

#### Triggers
- WHEN alert conditions are met THE system SHALL evaluate and trigger notifications within 10 minutes
- WHEN notification is triggered THE system SHALL deliver to all configured channels
- WHEN delivery fails THE system SHALL retry with exponential backoff up to 3 attempts
- WHEN user creates alert THE system SHALL validate conditions and test delivery
- WHEN alert is resolved THE system SHALL send follow-up notification if configured
- WHEN user modifies alert THE system SHALL update monitoring system immediately

#### States
- WHERE user has multiple notification channels THE system SHALL send to all enabled channels
- WHERE alert is active THE system SHALL suppress duplicate notifications for 4 hours
- WHERE delivery channel is failing THE system SHALL disable and notify user
- WHERE user is away THE system SHALL queue notifications for next login
- WHERE alert frequency is high THE system SHALL suggest condition refinement
- WHERE notification preferences exist THE system SHALL respect user timing preferences

#### Conditions
- IF alert condition becomes invalid THEN THE system SHALL disable alert and notify user
- IF notification volume exceeds limits THEN THE system SHALL implement progressive throttling
- IF user doesn't respond to alerts THEN THE system SHALL escalate through configured channels
- IF external notification service fails THEN THE system SHALL log error and retry later
- IF alert generates false positives THEN THE system SHALL suggest condition adjustment
- IF user disables alerts THE system SHALL confirm and explain implications

#### Continuous States
- WHILE monitoring conditions THE system SHALL evaluate thresholds every 60 seconds
- WHILE delivering notifications THE system SHALL track delivery status and timing
- WHILE alert is suppressed THE system SHALL continue monitoring without triggering
- WHILE user is configuring alerts THE system SHALL provide real-time validation
- WHILE notification queue is full THE system SHALL prioritize by severity and recency

#### Invariants
- THE system SHALL deliver critical alerts within 10 minutes of condition detection
- THE system SHALL maintain 99% notification delivery success rate
- THE system SHALL log all alert evaluations and delivery attempts for audit
- THE system SHALL respect user notification preferences and quiet hours
- THE system SHALL provide clear actionable guidance in all alert messages

## Gherkin Scenarios (Derived from EARS)

### AC-001: User Registration Success Flow
**Given** I am on the registration page  
**When** I enter valid email "user@example.com" and strong password "SecurePass123!"  
**And** I select timezone "America/New_York"  
**And** I accept GDPR terms (if EU user)  
**And** I click submit  
**Then** I should see "Registration successful, check your email" message  
**And** I should receive verification email within 5 minutes  
**And** verification email should contain secure token with 24-hour expiration  
**And** clicking verification link should activate account and redirect to onboarding  

### AC-002: Duplicate Email Prevention (from EARS IF statement)
**Given** An account exists with "existing@example.com"  
**When** I try to register with "existing@example.com"  
**Then** I should see error "Email already registered"  
**And** I should see link to password reset  
**And** I should not be able to proceed with registration  

### AC-003: Password Strength Validation (from EARS condition)
**Given** I am filling out registration form  
**When** I enter password "weak"  
**Then** I should see strength indicator showing "Weak"  
**And** I should see requirements: "8+ characters, mixed case, numbers, symbols"  
**And** submit button should remain disabled  
**When** I enter password "SecurePass123!"  
**Then** strength indicator should show "Strong"  
**And** submit button should become enabled  

### AC-004: Account Lockout Protection (from EARS continuous state)
**Given** I have failed login 4 times  
**When** I attempt 5th failed login  
**Then** account should be locked for 15 minutes  
**And** I should see "Account locked. Try again in 15 minutes"  
**And** I should see countdown timer  
**And** subsequent login attempts should be blocked until cooldown ends  

### AC-005: Portfolio Creation with GPU Selection
**Given** I am logged in as verified user  
**And** I have free tier subscription  
**When** I click "Create Portfolio"  
**Then** I should see portfolio creation wizard  
**When** I enter portfolio name "My Gaming Rig"  
**And** I select GPU "NVIDIA RTX 4090"  
**And** I configure quantity as 2  
**And** I set custom name "Gaming Beast 1"  
**Then** I should see estimated power consumption  
**And** I should see estimated monthly revenue  
**When** I click "Create Portfolio"  
**Then** portfolio should be created and activated  
**And** I should be redirected to portfolio dashboard  

### AC-006: Free Tier Portfolio Limits (from EARS state condition)
**Given** I am logged in with free tier  
**And** I already have 1 portfolio  
**When** I try to create second portfolio  
**Then** I should see "Free tier limited to 1 portfolio"  
**And** I should see upgrade options with pricing  
**And** creation should be blocked until upgrade  

### AC-007: AI Chat Basic Functionality
**Given** I am on the dashboard  
**When** I click "Ask AI Assistant"  
**Then** chat interface should open within 1 second  
**When** I type "How can I optimize my RTX 4090 pricing?"  
**And** I press Enter  
**Then** AI should respond within 5 seconds  
**And** response should reference my specific hardware  
**And** response should include actionable recommendations  
**And** conversation context should be maintained for follow-up questions  

### AC-008: AI Quota Enforcement (from EARS condition)
**Given** I have free tier with 50 message limit  
**And** I have used 49 messages this month  
**When** I send my 50th message  
**Then** AI should respond normally  
**When** I try to send 51st message  
**Then** I should see "Monthly quota exceeded"  
**And** I should see upgrade options  
**And** message should not be processed  

### AC-009: Market Data Pricing Comparison
**Given** I have portfolio with RTX 4090  
**When** I navigate to "Market Intelligence" tab  
**Then** I should see current market pricing within 15 seconds  
**And** I should see my pricing compared to market average  
**And** I should see percentile ranking (top 25%, average, bottom 25%)  
**And** I should see pricing recommendations  
**And** data should be updated within last 15 minutes  

### AC-010: Real-Time Dashboard Updates
**Given** I have dashboard open  
**And** WebSocket connection is established  
**When** GPU utilization changes  
**Then** dashboard should update within 60 seconds  
**And** utilization chart should reflect new data  
**And** performance metrics should recalculate  
**When** WebSocket disconnects  
**Then** system should attempt reconnection  
**And** fall back to 5-minute polling if reconnection fails  

### AC-011: Alert Configuration and Delivery
**Given** I am in Alert Settings  
**When** I create alert "Low Utilization Warning"  
**And** I set condition "Utilization below 70% for 30 minutes"  
**And** I enable email and Discord notifications  
**And** I click "Test Alert"  
**Then** test notification should be delivered within 2 minutes  
**And** delivery status should be confirmed  
**When** actual condition is met  
**Then** alert should trigger within 10 minutes  
**And** notification should include clear actionable guidance  

### AC-012: Alert Suppression Logic (from EARS continuous state)
**Given** I have active alert "GPU Offline"  
**When** alert condition is met  
**Then** notification should be sent immediately  
**When** same condition persists for next 3 hours  
**Then** duplicate notifications should be suppressed  
**When** condition resolves and triggers again after 5 hours  
**Then** new notification should be sent normally  

## Cross-Feature Requirements (EARS Format)

### Performance
- THE system SHALL respond to all API requests within 500ms for 95th percentile
- WHERE system load exceeds 80% capacity THE system SHALL auto-scale infrastructure
- WHILE under heavy load THE system SHALL maintain 99.5% uptime target
- WHEN database queries exceed 100ms THE system SHALL log performance warnings
- IF response time exceeds 2 seconds THEN THE system SHALL show loading indicators

### Accessibility
- THE system SHALL maintain WCAG 2.1 AA compliance across all interfaces
- WHEN user navigates with keyboard THE system SHALL provide visible focus indicators
- WHERE user has screen reader THE system SHALL provide proper ARIA labels and semantic HTML
- WHILE user zooms to 200% THE system SHALL maintain full functionality without horizontal scroll
- IF color is used for information THEN THE system SHALL provide alternative indicators

### Security
- THE system SHALL validate all inputs against SQL injection and XSS attacks
- WHEN suspicious activity is detected THE system SHALL trigger security alerts and logging
- WHERE authentication fails 5 times THE system SHALL implement account lockout
- WHILE handling sensitive data THE system SHALL encrypt using AES-256 standard
- IF security vulnerability is discovered THEN THE system SHALL implement emergency patches

### Data Privacy & Compliance
- THE system SHALL comply with GDPR requirements for EU users
- WHEN user requests data deletion THE system SHALL complete within 30 days
- WHERE user data is processed THE system SHALL obtain explicit consent
- WHILE storing personal data THE system SHALL implement data minimization principles
- IF data breach occurs THEN THE system SHALL notify authorities within 72 hours

### Monitoring & Observability
- THE system SHALL log all user actions and system events for audit trails
- WHEN errors occur THE system SHALL capture detailed context for debugging
- WHERE performance degrades THE system SHALL alert operations team
- WHILE processing critical functions THE system SHALL emit metrics for monitoring
- IF system health deteriorates THEN THE system SHALL trigger automated recovery procedures

---

*These acceptance criteria provide comprehensive coverage of all system requirements using EARS format, ensuring unambiguous interpretation and direct mapping to automated test cases. Each requirement is designed to be testable and verifiable during implementation.*