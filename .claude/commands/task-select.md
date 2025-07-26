# Task Selection Command

Select a task to work on from the spec.md file.

Usage: `/task:select TASK-XXX`

This command will:
1. Set the current task in .claude/state/current_task.txt
2. Verify tests exist for the task
3. Calculate and store test file hash for immutability
4. Create feature branch
5. Show task specification and requirements
6. Initialize failure tracking

## Available Tasks from specs/spec.md:
- **TASK-001**: User Registration & Authentication System
- **TASK-002**: Real-time Portfolio Dashboard
- **TASK-003**: AI-powered Analytics & Chat Interface
- **TASK-004**: Market Intelligence & Pricing System
- **TASK-005**: Alerts & Notifications System

## Example Usage:
```
/task:select TASK-001
```

This will:
- Set current task to authentication system
- Verify authentication-system.test.md exists
- Hash the test file to prevent modifications
- Create branch `feature/task-001-auth-system`
- Display the full task specification

**Task ID**: $ARGUMENTS

**Remember**: 
- Tests are immutable contracts - they cannot be modified once hashed
- All MCP tools specified in the task are mandatory
- If any dependency fails, STOP and alert the user
- Each task must pass 100% of tests before completion