# Task Status Command

Check the comprehensive status of the current development task.

Usage: `/task:status`

## Status Information Provided:

### Current Task Details
- Active task ID and name
- Task specification summary
- Required MCP tools status
- Feature branch information

### Test Status
- Test file integrity (hash verification)
- Latest test results and coverage
- Failure count and retry status
- Performance benchmark comparison

### Implementation Progress
- Files modified for current task
- Registry updates pending
- Documentation updates needed
- Git commit history for task

### Next Steps
- Remaining work items
- Next available task in queue
- Blocking dependencies
- Estimated completion status

## Example Output:
```
=== CURRENT TASK ===
Task: TASK-002 (Real-time Portfolio Dashboard)
Branch: feature/task-002-dashboard
Status: In Progress (2/5 attempts)

=== TEST STATUS ===
✅ Test file integrity verified
❌ 3 tests failing (performance thresholds)
📊 Coverage: 87% (target: 90%)

=== DEPENDENCIES ===
✅ Playwright MCP - Connected
⚠️  Grafana MCP - Slow response
❌ DataDog MCP - Connection failed

=== PROGRESS ===
Modified: 4 files
Registry: 2 endpoints added
Docs: Pending updates
Last Commit: 15 minutes ago

=== NEXT STEPS ===
1. Fix performance test failures
2. Add missing error handling
3. Update component documentation
```

**No arguments required** - shows status for currently active task.