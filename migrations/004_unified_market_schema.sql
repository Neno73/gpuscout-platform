-- Unified Market Data Schema for GPUScout Platform
-- Optimized design eliminating redundancy across 500.farm endpoints

-- Drop existing market tables to rebuild with unified approach
DROP TABLE IF EXISTS gpu_offers;
DROP TABLE IF EXISTS gpu_machines; 
DROP TABLE IF EXISTS gpu_hosts;
DROP TABLE IF EXISTS gpu_stats_history;

-- 1. GPU Market Statistics (from /gpu-stats)
-- Real-time market-wide pricing and availability data
CREATE TABLE gpu_market_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model TEXT NOT NULL,
    
    -- Market statistics by verification status
    rented_verified_count INTEGER DEFAULT 0,
    rented_verified_median REAL DEFAULT 0,
    rented_verified_p10 REAL DEFAULT 0,
    rented_verified_p90 REAL DEFAULT 0,
    
    rented_unverified_count INTEGER DEFAULT 0,
    rented_unverified_median REAL DEFAULT 0,
    rented_unverified_p10 REAL DEFAULT 0,
    rented_unverified_p90 REAL DEFAULT 0,
    
    available_verified_count INTEGER DEFAULT 0,
    available_verified_median REAL DEFAULT 0,
    available_verified_p10 REAL DEFAULT 0,
    available_verified_p90 REAL DEFAULT 0,
    
    available_unverified_count INTEGER DEFAULT 0,
    available_unverified_median REAL DEFAULT 0,
    available_unverified_p10 REAL DEFAULT 0,
    available_unverified_p90 REAL DEFAULT 0,
    
    total_all_count INTEGER DEFAULT 0,
    total_all_median REAL DEFAULT 0,
    total_all_p10 REAL DEFAULT 0,
    total_all_p90 REAL DEFAULT 0,
    
    -- GPU specifications
    vram_gb INTEGER,
    dlperf REAL,
    tflops REAL,
    
    -- Metadata
    data_timestamp TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint on model + timestamp for historical snapshots
    UNIQUE(model, data_timestamp)
);

-- 2. GPU Providers (from /hosts)
-- Host-level aggregation with fleet information
CREATE TABLE gpu_providers (
    host_id INTEGER PRIMARY KEY,
    
    -- Fleet overview
    total_machines INTEGER DEFAULT 0,
    total_gpus_by_model TEXT, -- JSON: {"RTX 4090": 540, "RTX 3090": 30}
    total_tflops REAL DEFAULT 0,
    
    -- Location & infrastructure
    country TEXT,
    location TEXT,
    latitude REAL,
    longitude REAL,
    location_accuracy INTEGER,
    isp TEXT,
    domain TEXT,
    
    -- Network capacity
    inet_up_mbps REAL,
    inet_down_mbps REAL,
    ip_address_count INTEGER DEFAULT 0,
    
    -- Computed metrics
    avg_reliability REAL,
    verification_rate REAL, -- Percentage of verified machines
    price_competitiveness REAL, -- Relative to market average
    
    -- Metadata
    data_timestamp TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(host_id, data_timestamp)
);

-- 3. GPU Marketplace Offers (from /offers + /machines enrichment)
-- Individual rental configurations with machine context
CREATE TABLE gpu_marketplace_offers (
    offer_id INTEGER PRIMARY KEY,
    machine_id INTEGER,
    host_id INTEGER,
    bundle_id INTEGER,
    
    -- GPU specifications
    gpu_name TEXT NOT NULL,
    gpu_ram_mb INTEGER,
    gpu_total_ram_mb INTEGER,
    num_gpus INTEGER DEFAULT 1,
    gpu_arch TEXT,
    compute_cap INTEGER,
    
    -- Performance metrics
    dlperf REAL,
    dlperf_per_dollar REAL,
    flops_per_dollar REAL,
    total_flops REAL,
    overall_score REAL,
    
    -- Pricing (core dashboard data)
    price_base_per_hour REAL NOT NULL,
    price_total_adjusted REAL,
    price_discounted REAL,
    price_minimum_bid REAL,
    storage_cost_per_hour REAL,
    vram_cost_per_hour REAL,
    
    -- System specifications
    cpu_name TEXT,
    cpu_cores INTEGER,
    cpu_ghz REAL,
    cpu_ram_mb INTEGER,
    cpu_arch TEXT,
    storage_name TEXT,
    storage_gb REAL,
    storage_bandwidth_mbps REAL,
    
    -- Network & infrastructure
    inet_up_mbps REAL,
    inet_down_mbps REAL,
    inet_cost_per_gb REAL,
    static_ip BOOLEAN DEFAULT FALSE,
    direct_ports INTEGER,
    
    -- Reliability & trust
    reliability_score REAL,
    verification_status TEXT,
    verified BOOLEAN DEFAULT FALSE,
    expected_reliability REAL,
    
    -- Location (enriched from machines)
    country TEXT,
    location TEXT,
    latitude REAL,
    longitude REAL,
    location_accuracy INTEGER,
    
    -- Availability
    rentable BOOLEAN DEFAULT TRUE,
    rental_duration_hours REAL,
    time_remaining TEXT,
    start_date INTEGER,
    end_date INTEGER,
    
    -- Machine context (from /machines)
    machine_total_gpus INTEGER, -- Total GPUs on this physical machine
    machine_rented_gpus INTEGER, -- Currently rented GPUs on machine
    available_chunk_sizes TEXT, -- JSON array: [1, 2, 6] for rental chunks
    
    -- System info
    os_version TEXT,
    driver_version TEXT,
    cuda_version REAL,
    
    -- Metadata
    data_timestamp TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME, -- When offer becomes stale (24h TTL)
    
    -- Foreign key relationships
    FOREIGN KEY (host_id) REFERENCES gpu_providers(host_id)
);

-- 4. Real-time Availability Metrics (from /metrics/global)
-- Prometheus-style metrics for real-time dashboard updates
CREATE TABLE gpu_availability_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    gpu_name TEXT NOT NULL,
    rented BOOLEAN NOT NULL,
    verified BOOLEAN NOT NULL,
    count INTEGER NOT NULL,
    
    -- Metadata
    collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint prevents duplicates in same collection cycle
    UNIQUE(gpu_name, rented, verified, collected_at)
);

-- 5. Historical Price Tracking
-- Simplified price history for trending charts
CREATE TABLE gpu_price_trends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    gpu_model TEXT NOT NULL,
    price_median REAL NOT NULL,
    price_p10 REAL,
    price_p90 REAL,
    available_count INTEGER,
    sample_date DATE, -- Daily aggregation
    
    UNIQUE(gpu_model, sample_date)
);

-- 6. Data Sync Jobs (unchanged - still needed)
CREATE TABLE market_sync_jobs (
    id TEXT PRIMARY KEY,
    endpoint TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    metadata TEXT
);

-- Performance Indexes
CREATE INDEX idx_market_stats_model_date ON gpu_market_stats(model, created_at DESC);
CREATE INDEX idx_providers_location ON gpu_providers(country, location);
CREATE INDEX idx_providers_tflops ON gpu_providers(total_tflops DESC);
CREATE INDEX idx_offers_gpu_price ON gpu_marketplace_offers(gpu_name, price_base_per_hour ASC);
CREATE INDEX idx_offers_performance ON gpu_marketplace_offers(dlperf_per_dollar DESC);
CREATE INDEX idx_offers_location ON gpu_marketplace_offers(country, location);
CREATE INDEX idx_offers_availability ON gpu_marketplace_offers(rentable, expires_at);
CREATE INDEX idx_offers_host ON gpu_marketplace_offers(host_id);
CREATE INDEX idx_metrics_gpu_time ON gpu_availability_metrics(gpu_name, collected_at DESC);
CREATE INDEX idx_trends_model_date ON gpu_price_trends(gpu_model, sample_date DESC);