-- Migration 003: Row Level Security — enable on EVERY table with NO policies.
-- This ensures Supabase's anon/authenticated roles cannot read data through PostgREST.
-- Only the server's connection role (postgres or a dedicated app role) has access.

ALTER TABLE cities             ENABLE ROW LEVEL SECURITY;
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_challenges     ENABLE ROW LEVEL SECURITY;
ALTER TABLE services           ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_packages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE helpers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE helper_services    ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_offers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events      ENABLE ROW LEVEL SECURITY;
