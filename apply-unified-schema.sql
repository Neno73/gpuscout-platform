-- Apply unified market schema directly to remote database
-- This script can be run directly via D1 query

-- First, mark that users table migration has been applied (since it already exists)
INSERT INTO d1_migrations (name, applied_at) 
VALUES ('0001_create_users_table.sql', datetime('now'))
ON CONFLICT DO NOTHING;

-- Now apply the unified market schema
-- (Contents of 004_unified_market_schema.sql will be inserted here)