# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GPUScout Platform is an AI-powered analytics platform for GPU hosts to optimize revenue through data-driven insights. Currently in business planning phase with comprehensive architecture documentation.

## Development Setup

### Current Status: TASK-001 COMPLETED ✅
Authentication system fully implemented with:
- Cloudflare Workers + D1 database backend
- JWT authentication with refresh tokens
- Password hashing (bcryptjs, 12 salt rounds)
- Input validation (Zod schemas)
- Complete test coverage (15/15 tests passing)

### Available Commands
```bash
npm test                    # Run test suite (Jest)
npm run dev                 # Start Cloudflare Workers dev server
wrangler dev                # Alternative dev server
npm run test:watch          # Watch mode for tests
npm run test:coverage       # Coverage report
```

## Architecture Overview

### Technology Stack (Actual Implementation)
- **Backend**: ✅ Cloudflare Workers with TypeScript 
- **Database**: ✅ Cloudflare D1 (SQLite-based) + KV for caching
- **Authentication**: ✅ JWT with jose library (HS256, refresh tokens)
- **Validation**: ✅ Zod schemas for input validation
- **Testing**: ✅ Jest with Node.js environment
- **Frontend**: 🚧 React components (LoginForm, RegistrationForm, EmailVerificationBanner)
- **AI Integration**: 🔄 Planned (Claude primary, Gemini analytics)
- **Infrastructure**: ✅ Cloudflare Workers platform

### Key Components
1. **User Service**: Authentication, profiles, subscriptions
2. **Portfolio Service**: GPU portfolio management and tracking
3. **Market Data Service**: Pricing intelligence and trends
4. **AI Agent Service**: Conversational AI for optimization advice
5. **Alert Service**: Proactive notifications and monitoring

### API Design
- RESTful conventions with `/api/v1/` prefix
- JWT-based authentication with refresh tokens
- Standardized response format with success/data/error/meta structure
- OpenAPI 3.0 specifications in `architecture/interfaces.md`

## Important Business Context

### Target Market
- 20,000+ GPU hosts globally
- Solo hosts ($500-2000/month revenue)
- Small farms ($2000-10000+/month revenue)

### Pricing Tiers
- Free: Basic dashboard and market data
- Individual ($19/month): Advanced analytics, AI agent, alerts
- Professional ($49/month): Multi-machine, API access
- Enterprise ($99-199/month): White-label, custom integrations

### Core Value Propositions
1. Real-time analytics and portfolio performance
2. AI-powered personalized recommendations
3. Competitive intelligence and pricing optimization
4. Proactive alerts for opportunities
5. 5-10% average revenue increase for users

## Development Guidelines

### Contract-First Development
All services must implement their declared interfaces exactly as specified in `architecture/interfaces.md`. Breaking changes require version increments.

### Performance Targets
- Dashboard load: <2 seconds initial, <500ms navigation
- API responses: <200ms simple, <500ms complex
- AI chat: <3 seconds for responses
- 99.5% uptime target

### Security Requirements
- TLS 1.3 for all communications
- AES-256 encryption for sensitive data
- JWT tokens with Redis blacklisting
- Comprehensive input validation
- Rate limiting by subscription tier

## Key Integration Points

### External APIs
- 500.farm API (market data via https://500.farm/vastai-exporter/)
- Discord API (notifications)
- Stripe API (payments)
- Various GPU platform APIs

### Data Flow
1. Market data cached in Redis with appropriate TTL
2. User data strictly isolated by tenant
3. AI conversations stored with memory for context
4. Real-time updates via WebSocket connections

## AI Development Notes

When implementing features:
1. Follow interface contracts strictly - they enable parallel development
2. Use TypeScript for all code with strict typing
3. Implement comprehensive error handling per standards
4. Add appropriate caching headers to GET endpoints
5. Ensure all endpoints validate input against JSON schemas
6. Mock external services during development

# AI-Driven Development Project Guide

## 🎯 Project Overview
This is an AI-driven development project where you (Claude Code) are the primary developer. You will implement features based on comprehensive specifications, leveraging powerful MCP tools for maximum efficiency.

## 🔄 Enhanced Development Workflow

### Phase 1: Task Planning & MCP Assessment
1. **Select Task**: Use `/task:select TASK-XXX` to choose from specs/spec.md
2. **MCP Tool Review**: Identify which MCP tools can add value:
   - **Cloudflare MCP**: For actual infrastructure (D1, KV, Workers deployment)
   - **Sentry MCP**: For error tracking and monitoring setup
   - **DataDog MCP**: For performance monitoring and metrics
   - **Playwright MCP**: For E2E testing and user journey validation
   - **Auth0 MCP**: For authentication patterns and enterprise features
   - **Neon MCP**: For database operations and alternatives
3. **Create TodoWrite Plan**: Include MCP usage and documentation steps
4. **Read Specs**: Study specs/features/[task].md thoroughly

### Phase 2: Implementation with MCP Integration
1. **Start with Real Infrastructure**: Use Cloudflare MCP to create actual resources
2. **Implement with MCP Support**: Actively leverage selected tools during development
3. **Flexible Testing Approach**: 
   - Write tests that focus on functionality over rigid formats
   - Allow reasonable variations (like bcrypt prefixes, library differences)
   - Update tests when platform realities differ from assumptions
   - Document why changes were made
4. **Monitor from Day One**: Set up Sentry/DataDog tracking early

### Phase 3: Mandatory Documentation & Memory
1. **MANDATORY Documentation Updates** (NON-NEGOTIABLE):
   - Update cheatsheet.md (system state, endpoints, components)
   - Update CLAUDE.md (architecture status)
   - Update spec.md (mark task complete)
2. **Memory System**: Add key insights (NOT code blocks):
   - Decision rationale ("Why Cloudflare Workers over Express")
   - Technical discoveries ("bcryptjs uses $2a$, Jest needs 'node' env")
   - Patterns that work ("Rate limiting with KV storage")
   - Gotchas and solutions
3. **Commit with Structure**: Include MCP tools used and insights gained

### Failure Handling:
- **Attempts 1-2**: Debug and retry
- **Attempt 3**: Documentation research (automatic)
- **Attempt 4**: Alternative implementation approach
- **Attempt 5**: Stop and notify human (automatic)

## 📁 Project Structure
```
project/
├── business/           # Business requirements (READ ONLY)
├── architecture/       # System design (READ ONLY)
├── specs/             
│   ├── spec.md        # Master task list with links
│   ├── features/      # Detailed specs per task
│   ├── acceptance-criteria.md  # EARS format requirements
│   └── tests/         # IMMUTABLE test files (DO NOT MODIFY)
├── registry/          
│   ├── endpoints.json # Track all API endpoints
│   ├── components.json # Track all UI components
│   ├── schemas.json   # Track data models
│   └── deployments.json # Track deployments
├── src/               # Your implementation goes here
└── .claude/           
    ├── cheatsheet.md  # Current system state
    ├── state/         # Task tracking
    └── logs/          # Test results, commands
```

## 🚫 Critical Rules

### NEVER:
- Modify test files (they are hashed and immutable)
- Skip tests to show progress
- Implement features without reading specs
- Create duplicate endpoints/components (check registry first)
- Move to next task without passing all tests
- Search for library documentation (it's already in the spec)
- Use outdated patterns (follow the provided examples exactly)
- **Skip or work around missing MCP tools - STOP and alert user**
- **Implement without required dependencies - ALL tools in specs are MANDATORY**

### ALWAYS:
- Read the full specification before coding
- Check registry before creating new endpoints/components
- Run tests after EVERY file change
- Update registry when adding new endpoints/components
- Commit with descriptive messages

## 🛠️ Available MCP Tools
- **Auth0 MCP**: Complete authentication system management (applications, APIs, actions, logs, forms)
- **Graphity Memory MCP**: Persistent knowledge graph for storing decisions, patterns, and learnings
- **Grafana MCP**: Performance monitoring during tests
- **DataDog MCP**: APM tracing for debugging
- **Sentry MCP**: Error tracking and reporting
- **Playwright MCP**: E2E test automation
- **Firecrawl MCP**: External service testing

## 📊 Registry Management

### Before Creating Anything New:
```bash
# Check if endpoint exists
cat registry/endpoints.json | grep "/api/users"

# Check if component exists  
cat registry/components.json | grep "UserForm"

# Check if schema exists
cat registry/schemas.json | grep "User"
```

### Registry Format:
```json
{
  "endpoints": [{
    "path": "/api/users",
    "method": "POST",
    "handler": "src/controllers/users.js",
    "added": "2024-01-20T10:30:00Z",
    "task": "TASK-001"
  }]
}
```

## 🧪 Testing Requirements

### Test Execution:
- Unit tests: Run after each function implementation
- Integration tests: Run after endpoint completion
- E2E tests: Run after feature completion
- Performance tests: Run via Grafana MCP when specified

### Test Standards:
- Coverage must exceed 90%
- All edge cases must pass
- Performance thresholds must be met
- No console errors allowed

## 🔀 Git Workflow

### Branch Naming:
```
feature/task-XXX-description
```

### Commit Messages:
```
feat: Implement user registration
fix: Handle edge case in password validation  
test: Add missing test for email validation
docs: Update API documentation
```

### Pull Requests:
- Create PR to staging after task completion
- Title: "TASK-XXX: Feature description"
- Description: Link to specs and test results

## 📝 Documentation Updates

### After Each Task:
1. Update API documentation if endpoints added
2. Update component documentation if UI changed
3. Update README with new features
4. Update CHANGELOG with task completion

## 🆘 When You're Stuck

### Missing Dependencies or Tools:
If ANY required tool fails or is unavailable:
1. **STOP IMMEDIATELY** - Do not try to work around it
2. **Alert the user** with specific error:
   ```
   ❌ BLOCKED: Sentry MCP is not available
   Error: Connection refused on port 3000
   Required for: Error monitoring tests in TASK-001
   
   Please install/fix Sentry MCP before continuing.
   ```
3. **Do NOT**:
   - Skip the tests that need the tool
   - Implement a mock version
   - Comment out the requirement
   - Move to a different task

### Getting Help:
1. Re-read the specification
2. Check similar implementations in codebase
3. Review architecture documents
4. Search error messages in logs
5. After 5 failures: Stop and wait for human help

### Common Issues:
- **"Test file modified"**: Tests are immutable, restart task
- **"Duplicate endpoint"**: Check registry first
- **"Token limit exceeded"**: Task too large, ask for subdivision
- **"Deployment failed"**: Check staging logs

## 🎯 Success Criteria

A task is complete when:
✅ All tests pass (100%)
✅ Registry is updated
✅ Documentation is updated  
✅ Code is committed
✅ Memory is updated with decisions

## 🚀 Quick Commands
```bash
# Select next task
/task:select TASK-001

# Check current task
cat .claude/state/current_task.txt

# View test results
cat .claude/logs/test_results_*.log

# Check failure count
cat .claude/state/failure_count_*.txt

# View command history
tail -50 .claude/logs/commands.log
```

## 💡 Best Practices

### Code Quality:
- Write self-documenting code
- Add JSDoc comments for all functions
- Follow the project's ESLint rules
- Use meaningful variable names
- Keep functions small and focused

### Performance:
- Optimize database queries
- Implement caching where specified
- Use pagination for large datasets
- Monitor response times via MCP tools

### Security:
- Validate all inputs
- Use parameterized queries
- Implement rate limiting
- Follow OWASP guidelines
- Never log sensitive data

---

Remember: You are building production-grade software. Quality over speed. The tests define success - passing them is non-negotiable.

## Future Implementation Priorities

### Phase 1 (MVP)
- Real-time portfolio dashboard
- Basic QA agent
- Pricing intelligence
- Simple alerts system

### Phase 2 (Growth)
- Personalized AI agent with memory
- Advanced analytics dashboard
- Competitive intelligence
- Proactive alert bot

### Phase 3 (Scale)
- Multi-machine portfolio management
- API access and integrations
- White-label options
- Advanced AI capabilities