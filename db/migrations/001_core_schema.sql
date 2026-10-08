-- Migration 001: Core schema — cities, users, sessions, otp_challenges, services, service_packages
-- Forward-only. No down migration.

-- ── booking_number sequence ──
CREATE SEQUENCE IF NOT EXISTS booking_number_seq START 10000;

-- ── cities ──
CREATE TABLE cities (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  state      TEXT NOT NULL,
  timezone   TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── users ──
CREATE TABLE users (
  id                TEXT PRIMARY KEY,
  role              TEXT NOT NULL CHECK (role IN ('customer','helper','admin')),
  phone_e164        TEXT NOT NULL UNIQUE,
  phone_verified_at TIMESTAMPTZ,
  email             TEXT UNIQUE,
  email_verified_at TIMESTAMPTZ,
  full_name         TEXT NOT NULL DEFAULT '',
  avatar_url        TEXT,
  language          TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en','hi')),
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deleted')),
  last_login_at     TIMESTAMPTZ,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive email uniqueness (partial, only non-null)
CREATE UNIQUE INDEX idx_users_email_ci ON users (LOWER(email)) WHERE email IS NOT NULL;

-- ── sessions ──
CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ,
  ip          TEXT,
  user_agent  TEXT,
  device_id   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions (user_id);
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);

-- ── otp_challenges ──
CREATE TABLE otp_challenges (
  id           TEXT PRIMARY KEY,
  phone_e164   TEXT NOT NULL,
  code_hash    TEXT NOT NULL,
  purpose      TEXT NOT NULL DEFAULT 'login' CHECK (purpose IN ('login','verify_phone','verify_email')),
  attempts     INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_phone_created ON otp_challenges (phone_e164, created_at DESC);

-- ── services ──
CREATE TABLE services (
  id             TEXT PRIMARY KEY,
  code           TEXT NOT NULL UNIQUE,
  name_en        TEXT NOT NULL,
  name_hi        TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  description_hi TEXT NOT NULL DEFAULT '',
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order     INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── service_packages ──
CREATE TABLE service_packages (
  id           TEXT PRIMARY KEY,
  service_id   TEXT NOT NULL REFERENCES services(id),
  city_id      TEXT REFERENCES cities(id),
  home_size    TEXT NOT NULL CHECK (home_size IN ('1BHK','2BHK','3BHK','4BHK')),
  duration_min INT NOT NULL CHECK (duration_min > 0),
  price_paise  INT NOT NULL CHECK (price_paise >= 0),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from   TIMESTAMPTZ,
  valid_to     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
