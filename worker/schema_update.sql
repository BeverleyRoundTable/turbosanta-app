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
