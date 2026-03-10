-- v58: Portfolio Upgrade — Binders, Conditions, Lists
-- Run via: npx wrangler d1 execute investmtg-db --file=migrations/v58-portfolio-upgrade.sql --remote

-- 1. Binders — user-created folder-like containers for portfolio cards
CREATE TABLE IF NOT EXISTS binders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#D4A843',
  icon TEXT DEFAULT 'folder',
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_binders_user ON binders(user_id);

-- 2. Add condition + binder_id columns to portfolios
--    (SQLite doesn't support ADD COLUMN IF NOT EXISTS, so we catch errors)
ALTER TABLE portfolios ADD COLUMN condition TEXT DEFAULT 'NM';
ALTER TABLE portfolios ADD COLUMN binder_id INTEGER DEFAULT NULL;

-- 3. Lists — virtual tracking (Wishlist, Buylist, Trade list)
CREATE TABLE IF NOT EXISTS lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  list_type TEXT NOT NULL DEFAULT 'wishlist',
  description TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lists_user ON lists(user_id);

-- 4. List items — cards in a list (no ownership implied)
CREATE TABLE IF NOT EXISTS list_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  list_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  card_name TEXT,
  quantity INTEGER DEFAULT 1,
  target_price REAL,
  condition TEXT DEFAULT 'NM',
  notes TEXT DEFAULT '',
  added_at INTEGER NOT NULL,
  UNIQUE(list_id, card_id),
  FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_list_items_list ON list_items(list_id);
