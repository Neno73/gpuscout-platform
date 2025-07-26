# MCP Tool Utilization Checklist

## Before Starting Any Task

### Phase 1: MCP Assessment (MANDATORY)
- [ ] **Cloudflare MCP**: Can I create real infrastructure instead of mocks?
- [ ] **Memory MCP**: What key decisions/insights should I capture?
- [ ] **Sentry MCP**: Should I set up error tracking for this feature?
- [ ] **DataDog MCP**: Do I need performance monitoring for this task?
- [ ] **Playwright MCP**: Will this need E2E testing?
- [ ] **Auth0 MCP**: Can I learn patterns or integrate enterprise features?
- [ ] **Neon MCP**: Do I need advanced database operations?

### Phase 2: Implementation Questions
- [ ] Am I using real Cloudflare resources or just mock data?
- [ ] Have I set up monitoring from the beginning?
- [ ] Am I testing the complete user journey with Playwright?
- [ ] Am I comparing with industry standards (Auth0 patterns)?

### Phase 3: Documentation & Memory
- [ ] What key technical decisions did I make and why?
- [ ] What gotchas or surprising discoveries should I document?
- [ ] What patterns worked well that others should reuse?
- [ ] What would I do differently next time?

## MCP Tool Usage Examples

### ✅ GOOD Memory Entries:
- "Chose Cloudflare Workers over Express because of edge deployment and D1 integration"
- "bcryptjs library uses $2a$ prefix instead of expected $2b$ - updated tests accordingly"
- "Jest requires 'node' environment for jose library to work properly with Uint8Array keys"
- "Rate limiting pattern: Store IP + endpoint in KV with TTL for automatic cleanup"

### ❌ BAD Memory Entries:
- Full code blocks
- Copy-paste of implementation details
- Obvious information everyone knows
- Redundant API documentation

## Task-Specific MCP Usage

### Authentication Tasks:
- **Cloudflare MCP**: Create D1 database, KV for sessions
- **Auth0 MCP**: Compare JWT patterns, learn enterprise features
- **Sentry MCP**: Track auth failures and security events
- **Memory MCP**: Document auth flow decisions

### UI/Frontend Tasks:
- **Playwright MCP**: Test user journeys and form interactions
- **Sentry MCP**: Track frontend errors and user experience issues
- **Memory MCP**: Document UX patterns and component decisions

### Database Tasks:
- **Neon MCP**: Advanced PostgreSQL features, scaling patterns
- **Cloudflare MCP**: D1 database operations and migrations
- **Memory MCP**: Document schema decisions and performance insights

### API Development:
- **Cloudflare MCP**: Workers deployment and edge computing
- **DataDog MCP**: API performance monitoring
- **Sentry MCP**: Error tracking and debugging
- **Memory MCP**: Document API design decisions and rate limiting strategies

## Remember:
- **Every task should use at least 2-3 MCP tools**
- **Cloudflare MCP and Memory MCP are mandatory for every task**
- **Don't work around MCP failures - report them immediately**
- **MCP tools are your superpowers - use them!**