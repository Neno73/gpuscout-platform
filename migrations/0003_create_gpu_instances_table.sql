-- Migration: 0003_create_gpu_instances_table.sql
-- Description: Creates the gpu_instances table to store individual GPUs within a portfolio.

CREATE TABLE IF NOT EXISTS gpu_instances (
    id TEXT PRIMARY KEY,
    portfolio_id TEXT NOT NULL,
    -- gpu_model references a known GPU model name (e.g., 'RTX 4090')
    gpu_model TEXT NOT NULL,
    custom_name TEXT,
    platform_instance_id TEXT, -- e.g., ID from RunPod, Vast.ai, etc.
    settings TEXT, -- JSON object for overclock, power limits, etc.
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gpu_instances_portfolio_id ON gpu_instances(portfolio_id);