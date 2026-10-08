# Database migration guide

When moving from the browser-storage demo to a real database, here is what each piece becomes.

## Tables

### profiles
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | User or helper ID |
| role | enum('user','helper') | |
| name | text | |
| phone | text unique | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### helpers
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK FK profiles.id | |
| lat | double | Last known position |
| lng | double | Last known position |
| is_online | boolean | |
| last_ping_at | timestamptz | Drop if stale |
| skills | text[] | |
| service_radius_km | int | |

### bookings
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK profiles.id | |
| helper_id | uuid FK profiles.id nullable | Set on accept |
| service_name | text | |
| home_size | text | |
| address_short | text | Rough area, public |
| address_full | text | Exact, revealed to assigned helper only |
| lat | double | |
| lng | double | |
| price | int | Paise or INR cents |
| otp | char(4) | |
| status | enum | See status.ts |
| radius_step | int | Current search radius index |
| rating | int nullable | 1-5 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### booking_requests
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| booking_id | uuid FK bookings.id | |
| helper_id | uuid FK helpers.id | |
| status | enum('pending','accepted','declined','expired') | |
| distance_m | int | Snapshot at request time |
| created_at | timestamptz | |
| responded_at | timestamptz nullable | |

### earnings
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| booking_id | uuid FK bookings.id | |
| helper_id | uuid FK helpers.id | |
| service_name | text | Denormalised for list display |
| home_size | text | |
| amount | int | |
| tip | int | |
| rating | int nullable | |
| completed_at | timestamptz | |
| created_at | timestamptz | |

## Store method → database query

| Method | Becomes |
|--------|---------|
| createBooking | `INSERT INTO bookings` |
| getBooking | `SELECT FROM bookings WHERE id = $1` |
| updateBooking | `UPDATE bookings SET ... WHERE id = $1` |
| listBookingsForUser | `SELECT FROM bookings WHERE user_id = $1 ORDER BY created_at DESC` |
| listBookingsForHelper | `SELECT FROM bookings WHERE helper_id = $1 ORDER BY created_at DESC` |
| getActiveBookingForUser | `SELECT FROM bookings WHERE user_id = $1 AND status IN (...active)` |
| getActiveBookingForHelper | `SELECT FROM bookings WHERE helper_id = $1 AND status IN (...active)` |
| appendEarning | `INSERT INTO earnings` |
| listEarningsForHelper | `SELECT FROM earnings WHERE helper_id = $1 ORDER BY completed_at DESC` |

## Realtime events → server-side

| Event | Becomes |
|-------|---------|
| helper_online | Server tracks connected helpers in Redis or a presence channel |
| helper_location | Writes to helpers.lat/lng, fan-out to relevant booking channels |
| helper_offline | Sets is_online = false, removes from presence |
| booking_new | Server creates booking_requests rows, pushes to eligible helpers |
| booking_expand | Server adds new booking_requests for wider radius |
| booking_accept | **Atomic**: `UPDATE bookings SET helper_id = $1, status = 'accepted' WHERE id = $2 AND status = 'searching'`. Returns affected rows; if 0, someone else won. |
| booking_assigned | Pushed to all helpers who were offered this booking (cleanup) |
| booking_release | `UPDATE bookings SET helper_id = NULL, status = 'searching'` then re-broadcast |
| booking_cancel | `UPDATE bookings SET status = 'cancelled'` |
| job_location | Fan-out to the user for this booking only |
| job_status | `UPDATE bookings SET status = $1` with transition validation |

## Timers that should move to the server

| Timer | Why |
|-------|-----|
| 30-second radius expansion | User's tab might close; server ensures the booking still gets expanded and eventually expired |
| Helper stale timeout | Server prunes helpers.is_online if no ping in 20 seconds |
| Offer expiry per helper | booking_requests.status → expired if no response in STEP_TIMEOUT_S |

## Privacy rules

| Data | Rule |
|------|------|
| Exact address (address_full) | Only visible to the assigned helper (helper_id matches), never in booking_new |
| Phone number | Never sent over the realtime channel; masked calling or revealed only on the job screen |
| OTP | Stored hashed on the server; verified server-side |
| Helper location | Streamed only to the user of the active booking, not to other users |
