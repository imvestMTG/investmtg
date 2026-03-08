-- investMTG Auth Migration: Add users table and link existing tables
-- Run with: Cloudflare D1 API or wrangler d1 execute

-- Users table (Google OAuth)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_id TEXT UNIQUE NOT NULL,       -- Google sub (unique user identifier)
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  picture TEXT DEFAULT '',               -- Google profile picture URL
  role TEXT DEFAULT 'buyer',             -- buyer, seller, admin
  created_at INTEGER NOT NULL,
  last_login INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_google ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Auth sessions table (replace cookie-only sessions)
CREATE TABLE IF NOT EXISTS auth_sessions (
  token TEXT PRIMARY KEY,                -- Session token (UUID)
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,           -- 30-day expiry
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at);

-- Add user_id to existing tables (nullable for backward compat during migration)
-- SQLite doesn't support ALTER TABLE ADD COLUMN with FOREIGN KEY, so we add plain columns
ALTER TABLE portfolios ADD COLUMN user_id INTEGER;
ALTER TABLE listings ADD COLUMN user_id INTEGER;
ALTER TABLE sellers ADD COLUMN user_id INTEGER;
ALTER TABLE cart_items ADD COLUMN user_id INTEGER;

-- Create indexes for user_id lookups
CREATE INDEX IF NOT EXISTS idx_portfolios_user ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_user ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_sellers_user ON sellers(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);
