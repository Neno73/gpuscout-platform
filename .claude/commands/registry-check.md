# Registry Check Command

Check if an endpoint, component, or schema already exists in the registry to prevent duplicates.

Usage: `/registry:check [type] [name]`

## Types:
- `endpoint` - API endpoints (e.g., `/api/users`, `/api/portfolio/create`)
- `component` - React components (e.g., `UserForm`, `DashboardChart`)
- `schema` - Data schemas (e.g., `User`, `Portfolio`, `Alert`)
- `deployment` - Deployment configurations

## Examples:
```bash
/registry:check endpoint /api/users
/registry:check component UserForm
/registry:check schema User
/registry:check deployment staging
```

## Output Format:
```
=== REGISTRY CHECK ===
Type: endpoint
Search: /api/users

❌ NOT FOUND - Safe to create
   └─ Similar: /api/user-profiles (different)

✅ FOUND - Already exists
   └─ File: src/controllers/users.js
   └─ Added: 2024-01-20T10:30:00Z
   └─ Task: TASK-001
   └─ Method: POST
   └─ Handler: createUser()
```

## Registry Files:
- `registry/endpoints.json` - All API endpoints
- `registry/components.json` - React components  
- `registry/schemas.json` - Data models
- `registry/deployments.json` - Deploy configs

## Integration:
This command is automatically called by hooks before creating new:
- API routes
- React components
- Database schemas
- Configuration files

**Search Query**: $ARGUMENTS

**Remember**: Always check registry before creating anything new to maintain consistency and prevent conflicts.