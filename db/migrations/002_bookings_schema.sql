-- Migration 002: Helpers, addresses, bookings, offers, events, outbox

-- ── helpers (1:1 with users where role='helper') ──
CREATE TABLE helpers (
  user_id              TEXT PRIMARY KEY REFERENCES users(id),
  city_id              TEXT REFERENCES cities(id),
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','offboarded')),
  verification_status  TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','in_review','verified','rejected')),
  is_online            BOOLEAN NOT NULL DEFAULT FALSE,
  online_since         TIMESTAMPTZ,
  last_lat             DOUBLE PRECISION,
  last_lng             DOUBLE PRECISION,
  last_h3_cell         TEXT,
  last_location_at     TIMESTAMPTZ,
  rating_avg           NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count         INT NOT NULL DEFAULT 0,
  jobs_completed       INT NOT NULL DEFAULT 0,
  service_radius_km    NUMERIC(4,1) NOT NULL DEFAULT 5.0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_helpers_city_online ON helpers (city_id, is_online, status, verification_status);
CREATE INDEX idx_helpers_h3_cell ON helpers (last_h3_cell);

-- ── helper_services ──
CREATE TABLE helper_services (
  helper_id  TEXT NOT NULL REFERENCES helpers(user_id),
  service_id TEXT NOT NULL REFERENCES services(id),
  PRIMARY KEY (helper_id, service_id)
);

-- ── addresses ──
CREATE TABLE addresses (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  label         TEXT NOT NULL DEFAULT 'Home',
  flat_tower    TEXT,
  society_name  TEXT,
  line1         TEXT NOT NULL DEFAULT '',
  landmark      TEXT,
  locality      TEXT,
  city_id       TEXT REFERENCES cities(id),
  pincode       TEXT,
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  h3_cell       TEXT,
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── bookings ──
CREATE TABLE bookings (
  id                  TEXT PRIMARY KEY,
  booking_number      TEXT NOT NULL UNIQUE DEFAULT ('SW' || nextval('booking_number_seq')::TEXT),
  customer_id         TEXT NOT NULL REFERENCES users(id),
  helper_id           TEXT REFERENCES users(id),
  address_id          TEXT REFERENCES addresses(id),
  address_snapshot    JSONB,
  service_package_id  TEXT REFERENCES service_packages(id),
  service_code        TEXT,
  home_size           TEXT,
  duration_min        INT,
  schedule_type       TEXT NOT NULL DEFAULT 'instant' CHECK (schedule_type IN ('instant','scheduled')),
  scheduled_start     TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'searching' CHECK (status IN ('searching','assigned','on_the_way','arrived','in_progress','completed','cancelled','no_helper_found')),
  dispatch_wave       INT NOT NULL DEFAULT 1,
  price_paise         INT NOT NULL DEFAULT 0 CHECK (price_paise >= 0),
  tax_paise           INT NOT NULL DEFAULT 0 CHECK (tax_paise >= 0),
  fee_paise           INT NOT NULL DEFAULT 0 CHECK (fee_paise >= 0),
  discount_paise      INT NOT NULL DEFAULT 0 CHECK (discount_paise >= 0),
  total_paise         INT NOT NULL DEFAULT 0 CHECK (total_paise >= 0),
  currency            TEXT NOT NULL DEFAULT 'INR',
  payment_mode        TEXT NOT NULL DEFAULT 'pay_after_service' CHECK (payment_mode IN ('pay_after_service','upi','card','cash')),
  start_code          TEXT,
  start_code_attempts INT NOT NULL DEFAULT 0,
  eta_minutes         INT,
  eta_updated_at      TIMESTAMPTZ,
  assigned_at         TIMESTAMPTZ,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancelled_by        TEXT CHECK (cancelled_by IS NULL OR cancelled_by IN ('customer','helper','system','admin')),
  cancel_reason       TEXT,
  customer_notes      TEXT,
  idempotency_key     TEXT,
  version             INT NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotency: same customer can't create duplicate bookings
CREATE UNIQUE INDEX idx_bookings_idempotency ON bookings (customer_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Query indexes
CREATE INDEX idx_bookings_customer ON bookings (customer_id, created_at DESC);
CREATE INDEX idx_bookings_helper_status ON bookings (helper_id, status);
CREATE INDEX idx_bookings_status_scheduled ON bookings (status, scheduled_start);
CREATE INDEX idx_bookings_active ON bookings (status) WHERE status IN ('searching','assigned','on_the_way','arrived','in_progress');

-- ── booking_offers ──
CREATE TABLE booking_offers (
  id            TEXT PRIMARY KEY,
  booking_id    TEXT NOT NULL REFERENCES bookings(id),
  helper_id     TEXT NOT NULL REFERENCES users(id),
  wave          INT NOT NULL DEFAULT 1,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired','cancelled')),
  offered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,
  responded_at  TIMESTAMPTZ,
  reject_reason TEXT,
  distance_m    INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Each helper gets at most one offer per booking
CREATE UNIQUE INDEX idx_offers_booking_helper ON booking_offers (booking_id, helper_id);

-- Only ONE accepted offer per booking (database-level guarantee)
CREATE UNIQUE INDEX idx_offers_single_accept ON booking_offers (booking_id) WHERE status = 'accepted';

-- Query indexes
CREATE INDEX idx_offers_helper_status ON booking_offers (helper_id, status, expires_at);
CREATE INDEX idx_offers_booking_status ON booking_offers (booking_id, status);

-- ── booking_events (append-only audit trail) ──
CREATE TABLE booking_events (
  id            TEXT PRIMARY KEY,
  booking_id    TEXT NOT NULL REFERENCES bookings(id),
  event_type    TEXT NOT NULL,
  from_status   TEXT,
  to_status     TEXT,
  actor_user_id TEXT,
  actor_role    TEXT,
  payload       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booking_events ON booking_events (booking_id, created_at);

-- ── outbox_events (transactional outbox) ──
CREATE TABLE outbox_events (
  id             TEXT PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id   TEXT NOT NULL,
  event_type     TEXT NOT NULL,
  payload        JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at   TIMESTAMPTZ
);

CREATE INDEX idx_outbox_unprocessed ON outbox_events (created_at) WHERE processed_at IS NULL;
