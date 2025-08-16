-- Data Retention Enhancement for GPUScout Platform
-- Implements tiered retention: 3-day raw data + daily aggregations

-- Enhanced gpu_price_trends table for daily aggregations
DROP TABLE IF EXISTS gpu_price_trends;
CREATE TABLE gpu_price_trends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    gpu_model TEXT NOT NULL,
    
    -- Core pricing metrics (aggregated from raw data)
    price_median REAL NOT NULL,
    price_p10 REAL,
    price_p90 REAL,
    price_min REAL,
    price_max REAL,
    price_avg REAL,
    
    -- Volume and availability metrics
    total_offers INTEGER DEFAULT 0,
    available_offers INTEGER DEFAULT 0,
    rented_offers INTEGER DEFAULT 0,
    verified_offers INTEGER DEFAULT 0,
    
    -- Performance context
    avg_dlperf REAL,
    avg_dlperf_per_dollar REAL,
    
    -- Geographic diversity
    country_count INTEGER DEFAULT 0,
    top_countries TEXT, -- JSON: ["US", "DE", "CA"]
    
    -- Provider insights
    host_count INTEGER DEFAULT 0,
    avg_reliability REAL,
    
    -- Metadata
    sample_date DATE NOT NULL,
    source_records INTEGER DEFAULT 0, -- How many raw records were aggregated
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(gpu_model, sample_date)
);

-- Data retention tracking table
CREATE TABLE data_retention_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    job_type TEXT NOT NULL, -- 'aggregation' or 'cleanup'
    target_date DATE NOT NULL, -- Date being processed
    status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    
    records_processed INTEGER DEFAULT 0,
    records_deleted INTEGER DEFAULT 0,
    records_aggregated INTEGER DEFAULT 0,
    
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    error_message TEXT,
    
    metadata TEXT -- JSON: additional info about the job
);

-- Enhanced indexes for performance
CREATE INDEX idx_price_trends_model_date ON gpu_price_trends(gpu_model, sample_date DESC);
CREATE INDEX idx_price_trends_date ON gpu_price_trends(sample_date DESC);
CREATE INDEX idx_retention_jobs_date ON data_retention_jobs(target_date, job_type);

-- Add retention metadata to existing tables for tracking
ALTER TABLE gpu_market_stats ADD COLUMN expires_at DATETIME;
ALTER TABLE gpu_providers ADD COLUMN expires_at DATETIME;
ALTER TABLE gpu_availability_metrics ADD COLUMN expires_at DATETIME;

-- Update existing records with expiration dates (3 days from creation)
UPDATE gpu_market_stats 
SET expires_at = datetime(created_at, '+3 days') 
WHERE expires_at IS NULL;

UPDATE gpu_marketplace_offers 
SET expires_at = datetime(created_at, '+3 days') 
WHERE expires_at IS NULL;

UPDATE gpu_providers 
SET expires_at = datetime(updated_at, '+3 days') 
WHERE expires_at IS NULL;

UPDATE gpu_availability_metrics 
SET expires_at = datetime(collected_at, '+3 days') 
WHERE expires_at IS NULL;

-- Indexes for efficient cleanup queries
CREATE INDEX idx_market_stats_expires ON gpu_market_stats(expires_at);
CREATE INDEX idx_offers_expires ON gpu_marketplace_offers(expires_at);
CREATE INDEX idx_providers_expires ON gpu_providers(expires_at);
CREATE INDEX idx_metrics_expires ON gpu_availability_metrics(expires_at);