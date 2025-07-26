-- Market Data Tables for GPUScout Platform
-- Schema for storing 500.farm API data with historical tracking

-- GPU Statistics Historical Data
CREATE TABLE gpu_stats_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model TEXT NOT NULL,
    rental_count INTEGER DEFAULT 0,
    median_price REAL DEFAULT 0,
    percentile_25 REAL DEFAULT 0,
    percentile_75 REAL DEFAULT 0,
    percentile_90 REAL DEFAULT 0,
    min_price REAL DEFAULT 0,
    max_price REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- GPU Offers (Current marketplace offers)
CREATE TABLE gpu_offers (
    id TEXT PRIMARY KEY,
    model TEXT NOT NULL,
    price_per_hour REAL NOT NULL,
    availability BOOLEAN DEFAULT TRUE,
    location TEXT,
    performance_score REAL,
    memory_gb INTEGER,
    host_id TEXT,
    external_offer_id TEXT, -- Original ID from 500.farm
    specifications TEXT, -- JSON blob for detailed specs
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME -- When offer expires/becomes stale
);

-- GPU Machines (Physical machine data)
CREATE TABLE gpu_machines (
    id TEXT PRIMARY KEY,
    host_id TEXT,
    model TEXT NOT NULL,
    memory_gb INTEGER,
    cuda_version TEXT,
    driver_version TEXT,
    pcie_bandwidth REAL,
    temperature_max INTEGER,
    power_consumption INTEGER,
    benchmark_scores TEXT, -- JSON blob for various benchmark results  
    availability_status TEXT DEFAULT 'unknown', -- available, busy, offline
    location TEXT,
    external_machine_id TEXT, -- Original ID from 500.farm
    specifications TEXT, -- JSON blob for detailed specs
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- GPU Hosts (Provider/host information)
CREATE TABLE gpu_hosts (
    id TEXT PRIMARY KEY,
    name TEXT,
    location TEXT,
    country_code TEXT,
    total_machines INTEGER DEFAULT 0,
    available_machines INTEGER DEFAULT 0,
    reliability_score REAL, -- 0-1 based on uptime, reviews
    response_time_ms INTEGER,
    bandwidth_mbps REAL,
    pricing_tier TEXT, -- budget, standard, premium
    external_host_id TEXT, -- Original ID from 500.farm
    contact_info TEXT, -- JSON blob for contact details
    verification_status TEXT DEFAULT 'unverified', -- verified, unverified, flagged
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Market Data Sync Jobs (Track background sync operations)
CREATE TABLE market_sync_jobs (
    id TEXT PRIMARY KEY,
    endpoint TEXT NOT NULL, -- gpu-stats, offers, machines, hosts
    status TEXT DEFAULT 'pending', -- pending, running, completed, failed
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    metadata TEXT -- JSON blob for additional sync info
);

-- Price History for trending analysis
CREATE TABLE gpu_price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model TEXT NOT NULL,
    price_per_hour REAL NOT NULL,
    sample_count INTEGER DEFAULT 1, -- How many offers at this price
    price_source TEXT DEFAULT '500.farm',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance benchmarks collected over time
CREATE TABLE gpu_benchmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model TEXT NOT NULL,
    benchmark_type TEXT NOT NULL, -- tensorflow, pytorch, gaming, mining
    score REAL NOT NULL,
    score_unit TEXT, -- fps, iterations/sec, hash/sec
    test_configuration TEXT, -- JSON blob with test details
    source TEXT DEFAULT '500.farm',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_gpu_stats_history_model_date ON gpu_stats_history(model, created_at DESC);
CREATE INDEX idx_gpu_stats_history_created_at ON gpu_stats_history(created_at DESC);

CREATE INDEX idx_gpu_offers_model_price ON gpu_offers(model, price_per_hour ASC);
CREATE INDEX idx_gpu_offers_availability ON gpu_offers(availability, expires_at);
CREATE INDEX idx_gpu_offers_created_at ON gpu_offers(created_at DESC);

CREATE INDEX idx_gpu_machines_model ON gpu_machines(model);
CREATE INDEX idx_gpu_machines_host_availability ON gpu_machines(host_id, availability_status);
CREATE INDEX idx_gpu_machines_last_seen ON gpu_machines(last_seen DESC);

CREATE INDEX idx_gpu_hosts_location ON gpu_hosts(location, country_code);
CREATE INDEX idx_gpu_hosts_reliability ON gpu_hosts(reliability_score DESC);
CREATE INDEX idx_gpu_hosts_last_seen ON gpu_hosts(last_seen DESC);

CREATE INDEX idx_market_sync_jobs_status ON market_sync_jobs(status, started_at DESC);

CREATE INDEX idx_gpu_price_history_model_date ON gpu_price_history(model, created_at DESC);

CREATE INDEX idx_gpu_benchmarks_model_type ON gpu_benchmarks(model, benchmark_type);
CREATE INDEX idx_gpu_benchmarks_created_at ON gpu_benchmarks(created_at DESC);