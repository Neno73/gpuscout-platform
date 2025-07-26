-- Create users table for authentication system
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    timezone TEXT NOT NULL,
    language TEXT DEFAULT 'en',
    subscription_tier TEXT DEFAULT 'free',
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token TEXT,
    verification_expires DATETIME,
    reset_token TEXT,
    reset_expires DATETIME,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until DATETIME,
    gdpr_consent BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token) WHERE verification_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token) WHERE reset_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL;