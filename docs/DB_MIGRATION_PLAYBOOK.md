# DB Migration Playbook: Supabase to Production Postgres

This playbook outlines the steps required to migrate the Swepy database from a hosted Supabase Postgres instance to a production-grade managed Postgres provider (e.g., AWS RDS/Aurora, Google Cloud SQL, Neon).

## 1. Portability Principles Applied
- **Standard Connection Strings:** The application connects via standard `DATABASE_URL` (pooler) and `DIRECT_URL` (migrations).
- **No Supabase Auth:** First-party sessions (OTP -> JWT/Cookie) are used instead of Supabase Auth.
- **No Business Logic in DB:** Row Level Security (RLS) is enabled purely to block Supabase's public PostgREST API. No policies exist.
- **No Supabase Extensions:** UUIDv7 generation and basic distance calculations (Haversine) are handled in the application layer or with standard SQL.

## 2. Migration Steps (Near-Zero Downtime using Logical Replication)

To achieve minimal downtime during the cutover:

1. **Provision Target DB:** Spin up the new RDS/Aurora/CloudSQL instance (PostgreSQL 16+).
2. **Setup Logical Replication:**
   - Create a publication on the Supabase source DB: `CREATE PUBLICATION swepy_pub FOR ALL TABLES;`
   - Create a subscription on the target DB: `CREATE SUBSCRIPTION swepy_sub CONNECTION 'postgres://...' PUBLICATION swepy_pub;`
3. **Initial Sync & Catchup:** Wait for the target DB to fully sync and catch up to real-time replication.
4. **Prepare Environment Variables:** Configure the new `DATABASE_URL` and `DIRECT_URL` in your production environment (Vercel, AWS ECS, etc.).
5. **Maintenance Window (Cutover):**
   - Put the app in maintenance mode (scale workers to 0 or block writes).
   - Ensure replication is fully caught up.
   - Drop the subscription on the target DB.
   - Swap the environment variables to point to the new DB.
   - Restart the application servers.
   - Run `npm run db:migrate` on the new DB to ensure schema consistency.
   - Disable maintenance mode.

## 3. Top 10 Query Patterns & Indexes

1. **Get Active Session:**
   - Query: `SELECT * FROM sessions WHERE token_hash = ? AND expires_at > NOW()`
   - Index: `idx_sessions_token_hash` (Implicit from UNIQUE constraint)
2. **Find User by Phone:**
   - Query: `SELECT * FROM users WHERE phone_e164 = ?`
   - Index: `users_phone_e164_key` (Implicit from UNIQUE constraint)
3. **Verify OTP:**
   - Query: `SELECT * FROM otp_challenges WHERE phone_e164 = ? ORDER BY created_at DESC LIMIT 1`
   - Index: `idx_otp_phone_created`
4. **Find Online Helpers in City:**
   - Query: `SELECT * FROM helpers WHERE city_id = ? AND is_online = true AND status = 'active'`
   - Index: `idx_helpers_city_online`
5. **Get Active Bookings for Customer:**
   - Query: `SELECT * FROM bookings WHERE customer_id = ? ORDER BY created_at DESC`
   - Index: `idx_bookings_customer`
6. **Get Active Bookings for Helper:**
   - Query: `SELECT * FROM bookings WHERE helper_id = ? AND status IN (...)`
   - Index: `idx_bookings_helper_status`
7. **Find Pending Offers for Booking:**
   - Query: `SELECT * FROM booking_offers WHERE booking_id = ? AND status = 'pending'`
   - Index: `idx_offers_booking_status`
8. **Check Helper Active Offers:**
   - Query: `SELECT * FROM booking_offers WHERE helper_id = ? AND status = 'pending' AND expires_at > NOW()`
   - Index: `idx_offers_helper_status`
9. **Fetch Unprocessed Outbox Events:**
   - Query: `SELECT * FROM outbox_events WHERE processed_at IS NULL ORDER BY created_at ASC`
   - Index: `idx_outbox_unprocessed`
10. **Idempotency Check:**
    - Query: `INSERT INTO bookings ... ON CONFLICT (customer_id, idempotency_key)`
    - Index: `idx_bookings_idempotency`

## 4. Scaling Considerations (Future)

- **Connection Pooling:** Use PgBouncer or AWS RDS Proxy between the app servers and the database to manage high connection counts. Disable prepared statements in the driver (`prepare: false`).
- **Read Replicas:** Route read-heavy queries (e.g., fetching historical completed bookings or helper ratings) to read replicas.
- **Partitioning:** Partition `booking_events`, `outbox_events`, and `notifications` by month (`created_at`).
- **Live Location Tracking:** Move high-frequency helper location pings out of Postgres and into Redis.
- **Realtime:** Replace polling with WebSockets (Socket.io) or Pub/Sub (Ably/Pusher).
- **Background Jobs:** Replace the simple in-process outbox poller with Amazon SQS, BullMQ (Redis), or Google Cloud Tasks.
- **Sharding:** If a single cluster is outgrown, shard the database by `city_id` or geographical region.
