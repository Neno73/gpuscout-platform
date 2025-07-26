# Sub-Agent Workflow Integration Guide

## 🎯 Overview
This guide explains how to leverage sub-agents effectively during GPUScout platform development to maximize productivity and code quality while preventing context overflow.

## 📋 When to Use Sub-Agents

### 1. **Feature Research Phase**
Before implementing any new feature, spawn research sub-agents:

```bash
# Example for Dashboard Implementation
/subagent:research WebSocket implementation patterns for React real-time dashboards
/subagent:research Most efficient charting libraries for GPU metrics visualization  
/subagent:research Performance optimization strategies for real-time data updates
```

**Main Context**: Reviews specs, plans component structure
**Sub-agents**: Research best practices in parallel

### 2. **Compatibility Verification**
When making changes that could affect existing systems:

```bash
/subagent:research Check all API endpoints that might be affected by this change
/subagent:research Verify this component pattern works with our existing auth system
```

### 3. **Complex Integration Research**
For external APIs and third-party services:

```bash
/subagent:research Latest Stripe integration patterns for subscription billing
/subagent:research Claude AI API rate limiting and best practices for chat interfaces
/subagent:research 500.farm API integration patterns and data caching strategies
```

## 🔄 Specific Workflow Patterns

### Pattern 1: Feature Research Trinity
For any major feature implementation:

```
Main Context: Plan and implement feature structure
├── Sub-agent 1: Research current industry best practices
├── Sub-agent 2: Analyze existing codebase for similar patterns
├── Sub-agent 3: Verify compatibility with current architecture
└── Sub-agent 4: Check performance implications
```

### Pattern 2: Implementation Verification
After building features:

```
Main Context: Complete implementation and run tests
├── Sub-agent 1: Security audit - check for vulnerabilities
├── Sub-agent 2: Performance analysis - identify bottlenecks
├── Sub-agent 3: Accessibility review - ensure compliance
└── Sub-agent 4: Documentation generation - update all docs
```

### Pattern 3: Cross-Service Integration
When features span multiple services:

```
Main Context: Build core feature
├── Sub-agent 1: Research authentication service integration
├── Sub-agent 2: Verify database schema compatibility
├── Sub-agent 3: Check external API integration requirements
└── Sub-agent 4: Validate end-to-end data flow
```

## 🚀 Task-Specific Sub-Agent Usage

### For TASK-001 (Authentication System):
```bash
Main: Implement JWT authentication flow
├── /subagent:research JWT refresh token security patterns for React apps in 2024
├── /subagent:research bcrypt vs Argon2 for password hashing performance comparison
├── /subagent:research OWASP authentication security checklist compliance
└── /subagent:research React authentication state management with Zustand best practices
```

### For TASK-002 (Real-time Dashboard):
```bash
Main: Build dashboard component structure  
├── /subagent:research WebSocket vs Server-Sent Events for GPU metrics streaming
├── /subagent:research Chart.js vs D3.js vs Recharts for real-time GPU visualizations
├── /subagent:research React performance optimization for frequent data updates
└── /subagent:research Responsive dashboard design patterns for technical users
```

### For TASK-003 (AI Chat Interface):
```bash
Main: Implement chat UI and Claude integration
├── /subagent:research Claude AI API integration patterns and conversation context management
├── /subagent:research React chat UI libraries vs custom implementation trade-offs
├── /subagent:research Conversation history storage and retrieval optimization
└── /subagent:research AI chat rate limiting and cost optimization strategies
```

### For TASK-004 (Market Intelligence):
```bash
Main: Build pricing intelligence system
├── /subagent:research 500.farm API integration patterns and rate limits
├── /subagent:research Efficient data caching strategies for market pricing data
├── /subagent:research Competitive analysis UI/UX patterns for technical dashboards
└── /subagent:research Real-time price update mechanisms and WebSocket optimization
```

### For TASK-005 (Alerts & Notifications):
```bash
Main: Implement alert system architecture
├── /subagent:research Multi-channel notification delivery patterns (email, Discord, webhooks)
├── /subagent:research Alert fatigue prevention and intelligent suppression algorithms
├── /subagent:research Discord webhook integration security and rate limiting
└── /subagent:research Email template design for technical GPU hosting alerts
```

## 💡 Sub-Agent Best Practices

### 1. **Be Specific with Research Requests**
❌ Bad: "Research authentication"
✅ Good: "Research JWT refresh token patterns for React apps with 15-minute access tokens and Redis blacklisting"

### 2. **Provide Context**
Always mention:
- You're building a GPU hosting analytics platform
- Technology stack (React 18, Node 20+, PostgreSQL, Redis)
- Performance requirements (dashboard <2s load time)
- User base (technical GPU hosts, 20k+ users)

### 3. **Request Actionable Outputs**
Ask sub-agents for:
- Code examples and implementation patterns
- Performance benchmarks and comparisons
- Security considerations and best practices
- Integration gotchas and common pitfalls

### 4. **Use Parallel Sub-Agents for Complex Features**
For features requiring multiple domains of knowledge:
```bash
# Spawn all at once for parallel research
/subagent:research Authentication security patterns
/subagent:research React authentication UX best practices  
/subagent:research Database schema design for user management
/subagent:research JWT token management and refresh strategies
```

## 🔧 Integration with Development Workflow

### Pre-Implementation (Always)
```
1. Select task: /task:select TASK-XXX
2. Spawn research sub-agents (3-4 parallel)
3. Review task specs while sub-agents research
4. Integrate sub-agent findings into implementation plan
5. Begin implementation with verified patterns
```

### During Implementation
```
1. Hit complexity? → Spawn verification sub-agent
2. Need performance data? → Spawn benchmark sub-agent  
3. Security concerns? → Spawn audit sub-agent
4. Integration questions? → Spawn compatibility sub-agent
```

### Post-Implementation
```
1. Complete feature and run tests
2. Spawn documentation sub-agent
3. Spawn final review sub-agent
4. Integrate findings before task completion
```

## 📊 Sub-Agent Output Integration

When sub-agents complete research, integrate findings like this:

```
Based on sub-agent research:

🔍 BEST PRACTICES (Sub-agent 1):
- Use @uidotdev/usehooks for WebSocket management
- Implement exponential backoff for reconnections
- Message acknowledgment for critical updates

🏗️ EXISTING PATTERNS (Sub-agent 2):  
- Our auth system already uses JWT pattern from user service
- Dashboard components follow Container/Presenter pattern
- Error handling uses centralized ErrorBoundary

✅ COMPATIBILITY (Sub-agent 3):
- No breaking changes with current API structure
- Redis caching layer compatible with new data flow
- TypeScript interfaces align with existing schemas

⚡ PERFORMANCE (Sub-agent 4):
- WebSocket preferred over SSE for bi-directional needs
- Connection pooling needed for 100+ concurrent users
- Memory usage optimized with message queuing

Implementation approach: Using WebSocket with connection pooling and exponential backoff, following our existing Container/Presenter pattern for dashboard components.
```

## 🚨 Important Reminders

### Sub-Agent Limitations
- **Cannot modify code directly** - they research and report back
- **Each has fresh context** - provide complete task context
- **Results need integration** - you must synthesize findings

### When NOT to Use Sub-Agents
- Simple, well-understood tasks
- When context is still manageable
- For debugging specific errors (use main context)
- When time is critical and research isn't needed

### Success Metrics
- ✅ Faster implementation due to pre-researched patterns
- ✅ Fewer architectural mistakes from verified approaches  
- ✅ Better code quality from security and performance reviews
- ✅ Comprehensive documentation from parallel doc generation

## 📝 Sub-Agent Logging

All sub-agent usage is automatically logged to `.claude/logs/subagent.log`:

```bash
# View recent sub-agent activity
tail -20 .claude/logs/subagent.log

# Search for specific research topics
grep -i "authentication" .claude/logs/subagent.log
```

## 🎯 Expected Outcomes

With proper sub-agent usage, you should achieve:

1. **Faster Development**: Parallel research while implementing
2. **Higher Quality**: Verified patterns and security reviews
3. **Better Architecture**: Multiple perspectives on complex decisions
4. **Comprehensive Docs**: Auto-generated documentation
5. **Context Management**: Main context stays focused on implementation

---

**Start using sub-agents immediately for any feature more complex than basic CRUD operations!**