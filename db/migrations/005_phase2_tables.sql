-- Migration 005: Phase 2 tables — notifications, payments, ratings, documents, audit

-- ── notification_preferences ──
CREATE TABLE notification_preferences (
  user_id           TEXT PRIMARY KEY REFERENCES users(id),
  master_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  booking_updates   BOOLEAN NOT NULL DEFAULT TRUE,
  payments          BOOLEAN NOT NULL DEFAULT TRUE,
  reminders         BOOLEAN NOT NULL DEFAULT TRUE,
  offers            BOOLEAN NOT NULL DEFAULT TRUE,
  push_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  whatsapp_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  sms_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── notifications ──
CREATE TABLE notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  type       TEXT NOT NULL,
  title_key  TEXT NOT NULL,
  body_key   TEXT NOT NULL,
  params     JSONB,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);

-- ── user_devices ──
CREATE TABLE user_devices (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  platform     TEXT NOT NULL,
  push_token   TEXT NOT NULL UNIQUE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── payment_methods ──
-- NEVER store full card numbers or CVV; only gateway tokens and last4.
CREATE TABLE payment_methods (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  type            TEXT NOT NULL CHECK (type IN ('upi','card','wallet','pay_after_service')),
  brand           TEXT,
  upi_handle      TEXT,
  card_last4      TEXT,
  card_exp_month  INT,
  card_exp_year   INT,
  gateway_token   TEXT,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── payments ──
CREATE TABLE payments (
  id                 TEXT PRIMARY KEY,
  booking_id         TEXT NOT NULL REFERENCES bookings(id),
  user_id            TEXT NOT NULL REFERENCES users(id),
  amount_paise       INT NOT NULL CHECK (amount_paise >= 0),
  currency           TEXT NOT NULL DEFAULT 'INR',
  method_type        TEXT,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','succeeded','failed','refunded')),
  gateway            TEXT,
  gateway_order_id   TEXT,
  gateway_payment_id TEXT,
  idempotency_key    TEXT UNIQUE,
  failure_reason     TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ratings ──
CREATE TABLE ratings (
  id           TEXT PRIMARY KEY,
  booking_id   TEXT NOT NULL REFERENCES bookings(id),
  from_user_id TEXT NOT NULL REFERENCES users(id),
  to_user_id   TEXT NOT NULL REFERENCES users(id),
  score        INT NOT NULL CHECK (score >= 1 AND score <= 5),
  tags         TEXT[],
  comment      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_ratings_unique ON ratings (booking_id, from_user_id);

-- ── helper_documents ──
-- NEVER store a full Aadhaar number; only masked last 4 and a verification reference.
CREATE TABLE helper_documents (
  id           TEXT PRIMARY KEY,
  helper_id    TEXT NOT NULL REFERENCES helpers(user_id),
  doc_type     TEXT NOT NULL,
  storage_path TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  verified_at  TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── audit_logs ──
CREATE TABLE audit_logs (
  id            TEXT PRIMARY KEY,
  actor_user_id TEXT,
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT,
  ip            TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on Phase 2 tables
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods          ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE helper_documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs               ENABLE ROW LEVEL SECURITY;
