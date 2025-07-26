-- Migration: 0002_create_portfolios_table.sql
-- Description: Creates the portfolios table to store user's GPU collections.

CREATE TABLE IF NOT EXISTS portfolios (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);