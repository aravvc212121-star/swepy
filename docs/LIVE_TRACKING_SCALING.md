# Swepy Live Tracking Architecture & Scaling Playbook

This document details the migration path from Swepy's current free, zero-dependency tracking stack to production-scale infrastructure capable of handling tens of thousands of active concurrent helpers.

---

## 1. Live Position Store: Migrating to Redis

### Current State
Live positions are stored in PostgreSQL using an `UNLOGGED` table (`booking_live_locations`) with a 1-row-per-active-booking constraint, backed by an in-memory repository for local development.

### Production Redis Architecture
1. **Key Schema**:
   - `booking:live:<booking_id>` -> Hash (`lat`, `lng`, `accuracy_m`, `heading_deg`, `speed_mps`, `recorded_at`, `updated_at`)
   - **TTL**: Set to **30 seconds** on every ping (`EXPIRE booking:live:<booking_id> 30`).
   - If a helper loses connectivity or disconnects, the position automatically expires without requiring batch cleanup cron jobs.
2. **Helper Idle Tracking**:
   - `helper:geo:idle` -> Redis Geospatial Index (`GEOADD helper:geo:idle <lng> <lat> <helper_id>`)
   - Allows instant radius and nearest-neighbor dispatch queries (`GEORADIUS` / `GEOSEARCH`) in < 2ms.
3. **Transition Plan**:
   - Implement `RedisLiveLocationRepository` implementing `ILiveLocationRepository`.
   - Swap the dependency injection in `live-location.repository.ts` without touching route handlers or the UI.

---

## 2. Transport Gateway: Upgrading from Polling to SSE / WebSocket

### Current State
`PollingGateway` polls `GET /api/bookings/:id/live` every 3 seconds with HTTP `ETag` / `If-None-Match` caching, pausing when backgrounded and backing off on errors.

### Production Push Architecture
1. **Server-Sent Events (SSE) or WebSockets**:
   - Swap `PollingGateway` for `SSEGateway` or `WebSocketGateway` implementing `RealtimeGateway.subscribe(bookingId, onUpdate)`.
   - The UI components (`LiveMap` and `/booking/[id]`) consume `RealtimeGateway` and require zero code changes.
2. **Pub/Sub Mechanism**:
   - Redis Pub/Sub or Redis Streams: Channel `booking:<booking_id>:stream`.
   - When `POST /api/helper/location` receives a valid sample, it publishes to `booking:<booking_id>:stream`.
   - Subscribed WebSocket connection immediately pushes the serialized frame to the customer's browser.
3. **Load Shedding via `next_interval_ms`**:
   - The server response `{ ok: true, next_interval_ms }` dynamically regulates helper publishing cadence.
   - Under server load spikes or high density, the server increases `next_interval_ms` (e.g., from 4,000ms to 6,000ms or 8,000ms) to shed ingestion throughput by up to 50% without dropping connections.

---

## 3. Routing Engine: Self-Hosted OSRM / Valhalla / ORS

### Current State
- `StraightLineProvider` (free, no API key, haversine × 1.35 with 15 km/h average speed).
- `OpenRouteServiceProvider` (ORS API with 30 req/min and 1,800 req/day limiter, falling back to straight-line on limits or errors).

### Production Self-Hosted Migration
- Deploy an internal routing cluster using **OSRM** (Open Source Routing Machine) or **Valhalla** on Docker/Kubernetes using OpenStreetMap India extract (`india-latest.osm.pbf`).
- Sub-millisecond route calculation with turn-by-turn geometry and traffic profiles.
- Implement `OSRMProvider` implementing `RoutingProvider`. Change `ROUTING_PROVIDER_URL=http://internal-osrm:5000`.

---

## 4. Mobile GPS Reliability: Native Helper App with Foreground Service

### The Web Browser Limitation
Modern mobile browsers (Safari on iOS and Chrome on Android) throttle or suspend JavaScript execution and background GPS timers within 15–30 seconds of the screen locking or switching apps, regardless of Screen Wake Locks.

### Recommended Native Architecture
1. **Android Foreground Service**:
   - Use a native Android (Kotlin / Flutter / React Native) foreground service with a persistent notification ("Swepy Helper is sharing live location").
   - Requests `ACCESS_FINE_LOCATION` and `ACCESS_BACKGROUND_LOCATION`.
   - Uses `FusedLocationProviderClient` with `PRIORITY_HIGH_ACCURACY` and 3–4 second update interval.
2. **Batched Retry & Network Resilience**:
   - In tunnels or low-coverage spots, queue up to 3 latest samples with accurate timestamps.
   - Deliver when network recovers; server rejects samples older than 30s.

---

## 5. Privacy Policy & Compliance (DPDP Act, India)

### Data Minimization Guidelines:
1. **Strict Sharing Window**:
   - Helper coordinates are collected and visible to the customer **strictly** between `assigned` and `arrived` states.
   - At `in_progress`, `completed`, or `cancelled`, coordinates are immediately deleted from live storage and coordinates publishing stops.
2. **Zero Persistent Location Logs**:
   - Raw `lat` / `lng` coordinates are **never** logged to application logs or database audit logs.
   - Audit logs (`booking_events`) record state transitions (e.g., `helper_arrived`, `trip_started`) with timestamps and actor IDs, never GPS coordinates.
3. **Consent & Purpose Limitation**:
   - Precise helper location is requested only upon toggling "Online" and utilized solely for dispatch matching and customer delivery tracking during active bookings.
