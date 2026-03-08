-- investMTG D1 Database Schema
-- Run with: wrangler d1 execute investmtg-db --file=schema.sql

-- Price cache: avoid hammering Scryfall on every page load
CREATE TABLE IF NOT EXISTS prices (
  card_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  set_code TEXT,
  set_name TEXT,
  collector_number TEXT,
  rarity TEXT,
  mana_cost TEXT,
  type_line TEXT,
  oracle_text TEXT,
  colors TEXT,                    -- JSON array e.g. ["W","U"]
  price_usd REAL,
  price_usd_foil REAL,
  price_eur REAL,
  image_small TEXT,
  image_normal TEXT,
  image_large TEXT,
  scryfall_uri TEXT,
  updated_at INTEGER NOT NULL     -- Unix timestamp (seconds)
);
CREATE INDEX IF NOT EXISTS idx_prices_name ON prices(name);
CREATE INDEX IF NOT EXISTS idx_prices_updated ON prices(updated_at);

-- Portfolio tracking: persists across sessions
CREATE TABLE IF NOT EXISTS portfolios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_token TEXT NOT NULL,
  card_id TEXT NOT NULL,
  card_name TEXT,
  quantity INTEGER DEFAULT 1,
  added_price REAL,               -- Price when added (for tracking gains)
  added_at INTEGER NOT NULL,
  UNIQUE(session_token, card_id)
);
CREATE INDEX IF NOT EXISTS idx_portfolios_session ON portfolios(session_token);

-- Marketplace listings: sellers post cards for sale
CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_name TEXT NOT NULL,
  seller_contact TEXT,
  seller_store TEXT,              -- Store affiliation (if any)
  card_id TEXT,
  card_name TEXT NOT NULL,
  set_name TEXT,
  condition TEXT NOT NULL,        -- NM, LP, MP, HP, DMG
  language TEXT DEFAULT 'English',
  price REAL NOT NULL,
  image_uri TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active',   -- active, reserved, sold, removed
  session_token TEXT,             -- Seller's session for managing listings
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(session_token);
CREATE INDEX IF NOT EXISTS idx_listings_card ON listings(card_name);

-- Seller profiles
CREATE TABLE IF NOT EXISTS sellers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_token TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  contact TEXT,
  store_affiliation TEXT,
  bio TEXT,
  registered_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sellers_session ON sellers(session_token);

-- Community events
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subtitle TEXT,
  host TEXT,
  location TEXT,
  event_date TEXT,                -- Display date string
  event_timestamp INTEGER,        -- Unix timestamp for sorting/expiry
  cost TEXT,
  tags TEXT,                      -- JSON array
  image_key TEXT,                 -- R2 object key or relative path
  link TEXT,
  recurring INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_active ON events(active);

-- Local stores
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,            -- e.g. 's1', 's2'
  name TEXT NOT NULL,
  badge TEXT,
  address TEXT,
  phone TEXT,
  website TEXT,
  hours TEXT,
  tags TEXT,                      -- JSON array
  description TEXT,
  verified INTEGER DEFAULT 1,
  active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL
);

-- Orders: created at checkout
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  items TEXT NOT NULL,
  subtotal REAL NOT NULL,
  tax REAL NOT NULL,
  shipping REAL DEFAULT 0,
  total REAL NOT NULL,
  fulfillment TEXT DEFAULT 'pickup',
  pickup_store TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  payment_method TEXT DEFAULT 'reserve',
  status TEXT DEFAULT 'reserved',
  payment_status TEXT DEFAULT NULL,
  checkout_id TEXT DEFAULT NULL,
  sumup_txn_id TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Monthly sequential counter for GUM-YYYYMM-XXXXX order IDs
CREATE TABLE IF NOT EXISTS order_counters (
  month_key TEXT PRIMARY KEY,
  last_seq INTEGER NOT NULL DEFAULT 1
);

-- Cart items (persistent across sessions)
CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_token TEXT NOT NULL,
  listing_id INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  added_at INTEGER NOT NULL,
  FOREIGN KEY (listing_id) REFERENCES listings(id),
  UNIQUE(session_token, listing_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_session ON cart_items(session_token);
