-- ==============================================================================
-- TurboSanta Cloudflare D1 SQL Schema Update: Volunteers Table
-- Run this in Cloudflare Dashboard -> Storage & Databases -> D1 -> turbosanta-db -> Console
-- ==============================================================================

CREATE TABLE IF NOT EXISTS volunteers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    route_id TEXT REFERENCES routes(id),
    route_name TEXT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    organisation TEXT,
    checked_in BOOLEAN DEFAULT 0,
    bucket_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for instant volunteer lookups
CREATE INDEX IF NOT EXISTS idx_volunteers_table_route ON volunteers(table_id, route_name);

-- ==============================================================================
-- Gift Aid Declarations Table (HMRC R68 Compliant)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS gift_aid (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    title TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    house_name_or_number TEXT NOT NULL,
    postcode TEXT NOT NULL,
    declaration_date TEXT NOT NULL,
    donation_amount REAL NOT NULL,
    route_name TEXT,
    email TEXT,
    status TEXT DEFAULT 'Pending', -- 'Pending' or 'Claimed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gift_aid_table_status ON gift_aid(table_id, status);

-- Optional table columns for charity status and sponsors
-- ALTER TABLE tables ADD COLUMN enable_gift_aid BOOLEAN DEFAULT 0;
-- ALTER TABLE tables ADD COLUMN charity_number TEXT;
-- ALTER TABLE tables ADD COLUMN headline_sponsor_name TEXT;
-- ALTER TABLE tables ADD COLUMN headline_sponsor_logo TEXT;
-- ALTER TABLE tables ADD COLUMN headline_sponsor_url TEXT;
-- ALTER TABLE tables ADD COLUMN headline_sponsor_tagline TEXT;
-- ALTER TABLE tables ADD COLUMN partners_json TEXT;

-- ==============================================================================
-- Donations Ledger Table (Multi-Gateway Webhooks & Annual Tracking)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS donations (
    id TEXT PRIMARY KEY,
    table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    source TEXT,
    street_name TEXT,
    donor_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_donations_table_created ON donations(table_id, created_at);

