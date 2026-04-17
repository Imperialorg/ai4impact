-- =============================================================
-- Civix-Pulse — PostgreSQL + PostGIS Schema
-- =============================================================
-- Spatial database for field officer tracking and event dispatch.
-- Requires: PostgreSQL 15+ with PostGIS extension.
--
-- Usage:
--   psql -U civix -d civix_pulse -f schema.sql
-- =============================================================

-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Officers ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS officers (
    officer_id    TEXT PRIMARY KEY,                        -- e.g. "OP-441"
    name          TEXT NOT NULL,
    phone         TEXT,
    domain_skills TEXT[] NOT NULL DEFAULT '{}',            -- e.g. {"MUNICIPAL","WATER"}
    status        TEXT NOT NULL DEFAULT 'AVAILABLE'        -- AVAILABLE | DISPATCHED | OFF_DUTY
                  CHECK (status IN ('AVAILABLE', 'DISPATCHED', 'OFF_DUTY')),
    location      GEOGRAPHY(POINT, 4326),                 -- live GPS (SRID 4326 = WGS84)
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial index for nearest-officer queries
CREATE INDEX IF NOT EXISTS idx_officers_location
    ON officers USING GIST (location);

-- Filter index for available officers
CREATE INDEX IF NOT EXISTS idx_officers_status
    ON officers (status);

-- ─── Pulse Events (local ledger) ─────────────────────────────

CREATE TABLE IF NOT EXISTS pulse_events (
    event_id              TEXT PRIMARY KEY,                -- UUID from Pinecone
    translated_description TEXT NOT NULL,
    domain                TEXT NOT NULL,                   -- MUNICIPAL, TRAFFIC, WATER, ELECTRICITY
    coordinates           GEOGRAPHY(POINT, 4326) NOT NULL,
    impact_score          INT NOT NULL DEFAULT 0
                          CHECK (impact_score BETWEEN 0 AND 100),
    severity_color        TEXT NOT NULL DEFAULT '#FFFF00',
    cluster_found         BOOLEAN NOT NULL DEFAULT FALSE,
    master_event_id       TEXT REFERENCES pulse_events(event_id),
    assigned_officer_id   TEXT REFERENCES officers(officer_id),
    status                TEXT NOT NULL DEFAULT 'NEW'
                          CHECK (status IN ('NEW','ANALYZING','DISPATCHED','IN_PROGRESS','RESOLVED','ESCALATED')),
    verification_image    TEXT,                            -- Base64 or S3 URL
    verification_gps      GEOGRAPHY(POINT, 4326),
    resolution_verified   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at           TIMESTAMPTZ,
    time_to_resolution    INTERVAL GENERATED ALWAYS AS (resolved_at - created_at) STORED
);

-- Spatial index for geo-clustering
CREATE INDEX IF NOT EXISTS idx_events_coordinates
    ON pulse_events USING GIST (coordinates);

-- Time-based lookups
CREATE INDEX IF NOT EXISTS idx_events_created
    ON pulse_events (created_at DESC);

-- ─── Dispatch Log (audit trail) ──────────────────────────────

CREATE TABLE IF NOT EXISTS dispatch_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id        TEXT NOT NULL REFERENCES pulse_events(event_id),
    officer_id      TEXT NOT NULL REFERENCES officers(officer_id),
    action          TEXT NOT NULL                          -- DISPATCHED, DECLINED, ESCALATED, RESOLVED
                    CHECK (action IN ('DISPATCHED','DECLINED','ESCALATED','RESOLVED')),
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes           TEXT
);

-- ─── Useful Queries ──────────────────────────────────────────

-- Find nearest available officer for a domain within 5km:
--
-- SELECT officer_id, name,
--        ST_Distance(location, ST_Point(78.3914, 17.4482)::geography) AS dist_meters
-- FROM officers
-- WHERE status = 'AVAILABLE'
--   AND 'MUNICIPAL' = ANY(domain_skills)
-- ORDER BY location <-> ST_Point(78.3914, 17.4482)::geography
-- LIMIT 1;
