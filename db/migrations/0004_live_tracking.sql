-- Migration 0004: Live helper tracking tables
-- Portable SQL for PostgreSQL with RLS enabled

-- 1. UNLOGGED table for live helper location pings (high write throughput, no WAL overhead)
CREATE UNLOGGED TABLE IF NOT EXISTS booking_live_locations (
  booking_id TEXT PRIMARY KEY,
  helper_id TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy_m REAL NOT NULL,
  heading_deg REAL,
  speed_mps REAL,
  recorded_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS with no policies (server-side service access only)
ALTER TABLE booking_live_locations ENABLE ROW LEVEL SECURITY;

-- 2. Cached route geometry and duration
CREATE TABLE IF NOT EXISTS booking_routes (
  booking_id TEXT PRIMARY KEY,
  geometry JSONB NOT NULL,
  distance_m REAL NOT NULL,
  duration_s REAL NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('ors', 'straight_line')),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS with no policies
ALTER TABLE booking_routes ENABLE ROW LEVEL SECURITY;

-- Indices for quick lookup and cleanup
CREATE INDEX IF NOT EXISTS idx_booking_live_locations_helper_id ON booking_live_locations(helper_id);
CREATE INDEX IF NOT EXISTS idx_booking_live_locations_updated_at ON booking_live_locations(updated_at);
