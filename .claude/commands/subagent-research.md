# Sub-Agent Research Command

Spawn a specialized sub-agent to research topics in parallel while maintaining your main implementation flow.

Usage: `/subagent:research [topic]`

## Research Categories:

### 🔍 **Technical Research**
- Library best practices and patterns
- Performance optimization strategies
- Security vulnerability analysis
- Integration compatibility checks
- Breaking change impact analysis

### 📊 **Architecture Analysis**
- Existing codebase pattern analysis
- Database schema optimization
- API design consistency checks
- Component reusability assessment

### 🔧 **Implementation Verification**
- Code review and quality analysis
- Test coverage gap identification
- Documentation completeness check
- Deployment readiness verification

### 🚀 **Feature Research**
- Industry best practices for feature type
- Competitive analysis (UX patterns only)
- Accessibility compliance requirements
- Mobile responsiveness considerations

## Example Usage:

### For Dashboard Implementation:
```bash
/subagent:research WebSocket implementation patterns for React real-time dashboards
/subagent:research Most efficient charting libraries for GPU metrics visualization
/subagent:research Performance optimization for real-time data updates
```

### For Authentication System:
```bash
/subagent:research JWT refresh token security patterns for 2024
/subagent:research React authentication state management best practices
/subagent:research OWASP authentication security checklist compliance
```

### For AI Chat Interface:
```bash
/subagent:research Claude AI API integration patterns and rate limiting
/subagent:research Conversational UI design patterns for technical users
/subagent:research Chat context management strategies for long conversations
```

## Sub-Agent Output Integration:
Sub-agents will return structured research that you can integrate:

```
=== SUB-AGENT RESEARCH COMPLETE ===
Topic: WebSocket patterns for React
Key Findings:
- useWebSocket hook pattern is current best practice
- Connection pooling recommended for >100 concurrent connections
- Automatic reconnection with exponential backoff essential
- Message queuing needed for offline resilience

Recommendations:
- Use @uidotdev/usehooks for WebSocket management
- Implement connection health checks every 30s
- Add message acknowledgment for critical updates
- Consider Server-Sent Events for one-way updates

Code Examples: [provided]
Security Considerations: [listed]
Performance Metrics: [benchmarks]
```

## Research Guidelines:
- **Be Specific**: "Research authentication" → "Research JWT refresh patterns for React with 15-minute tokens"
- **Include Context**: Mention you're building a GPU hosting analytics platform
- **Specify Constraints**: Note any technology requirements (React 18, Node 20+, etc.)
- **Request Examples**: Ask for code patterns and implementation examples

**Research Topic**: $ARGUMENTS

**Pro Tip**: Use multiple sub-agents for complex features:
- Sub-agent 1: Best practices research
- Sub-agent 2: Existing codebase analysis  
- Sub-agent 3: Integration compatibility check
- Sub-agent 4: Performance implications