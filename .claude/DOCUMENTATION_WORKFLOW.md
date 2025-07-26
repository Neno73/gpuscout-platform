# Mandatory Documentation Workflow

## After Every Task Completion (NON-NEGOTIABLE)

### Step 1: Update System State
```bash
# Update .claude/cheatsheet.md
- [ ] Current system state (active task, endpoints, components, test coverage)
- [ ] API endpoints registry with implementation status
- [ ] Components registry with current count
- [ ] Performance baselines if applicable
- [ ] Any new blockers or issues encountered
```

### Step 2: Update Architecture Documentation  
```bash
# Update CLAUDE.md
- [ ] Technology stack status (mark implemented vs planned)
- [ ] Key components implementation status
- [ ] Available commands (if new ones added)
- [ ] Integration points updates
- [ ] MCP tools usage notes
```

### Step 3: Update Project Specification
```bash
# Update specs/spec.md  
- [ ] Mark completed task with [x] and ✅ COMPLETED
- [ ] Add any new insights or changes to requirements
- [ ] Update development workflow section if needed
```

### Step 4: Memory System (Key Insights Only)
```bash
# Use mcp__graphitymemory__add_memory for:
- [ ] Technical decisions and rationale
- [ ] Gotchas and unexpected discoveries  
- [ ] Patterns that worked well
- [ ] What would be done differently next time
```

### Step 5: Registry Verification
```bash  
# Verify registry files are current:
- [ ] registry/endpoints.json has all new endpoints
- [ ] registry/components.json has all new components
- [ ] registry/schemas.json updated if data models changed
- [ ] registry/deployments.json updated if infrastructure changed
```

### Step 6: Structured Commit
```bash
git add -A
git commit -m "Complete TASK-XXX: [Brief Description]

- [Key accomplishment 1]
- [Key accomplishment 2] 
- [Key accomplishment 3]
- MCP Tools Used: [list tools]
- Key Insights: [brief summary]
- Tests: [X/Y passing]
- Documentation: Updated all required files

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Failure Conditions

### Task is NOT complete until ALL documentation is updated:
- Missing cheatsheet.md updates = INCOMPLETE
- Missing CLAUDE.md updates = INCOMPLETE  
- Missing spec.md task marking = INCOMPLETE
- No structured commit = INCOMPLETE
- Missing registry updates = INCOMPLETE

### If Memory MCP Fails:
- Create temporary .claude/insights/TASK-XXX.md file
- Document key insights there instead
- Alert user about MCP connection issue
- DO NOT proceed without capturing insights

## Quality Checklist

### Before Marking Task Complete:
- [ ] All endpoints work and are documented
- [ ] All components render and are catalogued
- [ ] Tests pass and coverage is adequate
- [ ] Performance meets baseline requirements
- [ ] Security requirements addressed
- [ ] Documentation is complete and current
- [ ] Memory/insights captured properly
- [ ] Commit includes MCP tool usage summary

## Template Files

### .claude/insights/TASK-XXX.md (if Memory MCP fails):
```markdown
# TASK-XXX Key Insights

## Technical Decisions
- Why did we choose X over Y?
- What were the key architectural decisions?

## Gotchas & Discoveries
- What unexpected issues did we encounter?
- What library behaviors differed from expectations?

## Patterns That Worked
- What implementation patterns were successful?
- What should be reused in future tasks?

## Future Improvements
- What would we do differently next time?
- What technical debt was created?
```

## Remember: Documentation is NOT optional - it's what keeps us from getting lost in the building process!