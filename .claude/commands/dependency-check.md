# Dependency Check Command

Verify all required dependencies and MCP tools are available before starting implementation.

Usage: `/dependency-check`

## What This Command Checks:

### 🔧 **MCP Tools Connectivity**
Tests connection to all required MCP tools from current task:
- **Playwright MCP** - E2E testing and browser automation
- **Grafana MCP** - Performance monitoring and metrics
- **DataDog MCP** - APM tracing and error tracking  
- **Sentry MCP** - Error monitoring and reporting
- **Firecrawl MCP** - External service testing
- **Graphity Memory MCP** - Decision and learning storage

### 📦 **Node.js Dependencies**
Verifies package.json dependencies are installed:
- React 18+ for frontend components
- Express.js for API server
- Jest for testing framework
- TypeScript for type safety
- Database clients (PostgreSQL, Redis)

### 🏗️ **Infrastructure Dependencies**
Checks external service connectivity:
- Database connections (PostgreSQL, Redis)
- Email service (for notifications)
- Discord webhooks (for alerts)
- 500.farm API (for market data)
- Claude AI API (for chat features)

### 🔐 **Environment Variables**
Validates required configuration:
- JWT secrets and encryption keys
- Database connection strings
- API keys and tokens
- Service endpoints and URLs

## Example Output:
```
=== DEPENDENCY CHECK RESULTS ===

MCP Tools Status:
✅ Playwright MCP - Connected (v1.2.0)
✅ Grafana MCP - Connected (metrics available)
⚠️  DataDog MCP - Slow response (2.3s)
❌ Sentry MCP - Connection failed (timeout)
✅ Firecrawl MCP - Connected
❌ Graphity Memory MCP - Not available

Node Dependencies:
✅ All packages installed (npm ls clean)
✅ TypeScript compiler ready
✅ Jest test runner configured

Infrastructure:
✅ PostgreSQL - Connected (latency: 45ms)
✅ Redis - Connected (6.2.7)
⚠️  Email service - Rate limited (990/1000)
❌ Discord webhook - Invalid URL

Environment:
✅ JWT_SECRET configured
✅ DATABASE_URL valid
❌ CLAUDE_API_KEY missing
✅ DISCORD_WEBHOOK_URL set

OVERALL STATUS: ❌ BLOCKED
Critical issues: 2 MCP tools unavailable, 1 API key missing
```

## Failure Response:
When dependencies fail, this command will:

```
🛑 IMPLEMENTATION BLOCKED

Missing critical dependencies:
- Sentry MCP: Required for error monitoring tests
- CLAUDE_API_KEY: Required for AI chat features

❌ DO NOT PROCEED with implementation
❌ DO NOT skip or work around missing tools
❌ DO NOT comment out failing tests

✅ REQUIRED ACTIONS:
1. Install/fix Sentry MCP integration
2. Configure CLAUDE_API_KEY in environment
3. Re-run /dependency-check to verify fixes
4. Only then proceed with /task:select

Contact system administrator or check documentation:
- MCP setup guide: docs/mcp-setup.md
- Environment config: docs/environment.md
```

## Integration with Task Flow:
- Automatically runs when `/task:select` is used
- Blocks code editing tools if dependencies missing
- Logs dependency status to `.claude/logs/dependencies.log`
- Updates `.claude/state/dependency_status.json`

**No arguments required** - checks all dependencies for current/next task.

**CRITICAL**: If ANY required dependency is missing, you MUST stop and alert the user. Never attempt to work around missing tools or skip tests that require them.