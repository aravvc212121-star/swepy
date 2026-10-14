import test from 'node:test';
import assert from 'node:assert/strict';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.USE_IN_MEMORY_DB = 'true';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/swepy_test';

/* ═══════════════════════════════════════════════════
   1. GEO UTILITIES — canonical haversine + validation
   ═══════════════════════════════════════════════════ */

test('haversineMeters: known Delhi points ≈ 860m', async () => {
  const { haversineMeters } = await import('../src/server/lib/geo.ts');
  const a = { lat: 28.6139, lng: 77.2090 };
  const b = { lat: 28.6200, lng: 77.2150 };
  const dist = haversineMeters(a, b);
  assert.ok(dist > 800, `Expected > 800m, got ${dist}`);
  assert.ok(dist < 1000, `Expected < 1000m, got ${dist}`);
});

test('haversineMeters: same point = 0', async () => {
  const { haversineMeters } = await import('../src/server/lib/geo.ts');
  const p = { lat: 28.6139, lng: 77.2090 };
  assert.equal(haversineMeters(p, p), 0);
});

test('isValidCoord: rejects (0,0), out of range, NaN', async () => {
  const { isValidCoord } = await import('../src/server/lib/geo.ts');
  assert.equal(isValidCoord(0, 0), false, 'Should reject null island (0,0)');
  assert.equal(isValidCoord(91, 0), false, 'lat > 90');
  assert.equal(isValidCoord(-91, 0), false, 'lat < -90');
  assert.equal(isValidCoord(0, 181), false, 'lng > 180');
  assert.equal(isValidCoord(NaN, 77), false, 'NaN lat');
  assert.equal(isValidCoord(28, Infinity), false, 'Infinity lng');
  assert.equal(isValidCoord(28.6139, 77.2090), true, 'Valid Delhi coords');
});

test('isReasonableSpeed: rejects teleportation', async () => {
  const { isReasonableSpeed } = await import('../src/server/lib/geo.ts');
  // 1000m in 1 second = 1000 m/s — impossible
  assert.equal(isReasonableSpeed(1000, 1000, 50), false);
  // 100m in 10 seconds = 10 m/s — fine
  assert.equal(isReasonableSpeed(100, 10000, 50), true);
  // 0 time delta
  assert.equal(isReasonableSpeed(100, 0, 50), false);
});

test('isAtLocation: accuracy bubble check', async () => {
  const { isAtLocation } = await import('../src/server/lib/geo.ts');
  // Within combined accuracy
  assert.equal(isAtLocation(20, 15, 10), true, '20m < 25m combined');
  // Outside
  assert.equal(isAtLocation(50, 10, 10), false, '50m > 25m min combined');
  // Custom min
  assert.equal(isAtLocation(50, 10, 10, 60), true, '50m < 60m custom min');
});

/* ═══════════════════════════════════════════════════
   2. STATUS STATE MACHINE (shared lib)
   ═══════════════════════════════════════════════════ */

test('canTransition: valid transitions', async () => {
  const { canTransition } = await import('../src/lib/swepy/status.ts');
  assert.ok(canTransition('searching', 'accepted'));
  assert.ok(canTransition('searching', 'cancelled'));
  assert.ok(canTransition('searching', 'expired'));
  assert.ok(canTransition('accepted', 'on_the_way'));
  assert.ok(canTransition('accepted', 'cancelled'));
  assert.ok(canTransition('on_the_way', 'arrived'));
  assert.ok(canTransition('on_the_way', 'cancelled'));
});

test('canTransition: invalid transitions', async () => {
  const { canTransition } = await import('../src/lib/swepy/status.ts');
  assert.ok(!canTransition('searching', 'completed'));
  assert.ok(!canTransition('completed', 'searching'));
  assert.ok(!canTransition('cancelled', 'accepted'));
  assert.ok(!canTransition('expired', 'accepted'));
});

test('isActive includes right statuses', async () => {
  const { isActive } = await import('../src/lib/swepy/status.ts');
  assert.ok(isActive('searching'));
  assert.ok(isActive('accepted'));
  assert.ok(isActive('on_the_way'));
  assert.ok(isActive('arrived'));
  assert.ok(isActive('in_progress'));
  assert.ok(!isActive('completed'));
  assert.ok(!isActive('cancelled'));
  assert.ok(!isActive('expired'));
});

test('isTerminal flags correct statuses', async () => {
  const { isTerminal } = await import('../src/lib/swepy/status.ts');
  assert.ok(isTerminal('completed'));
  assert.ok(isTerminal('cancelled'));
  assert.ok(isTerminal('expired'));
  assert.ok(!isTerminal('searching'));
  assert.ok(!isTerminal('accepted'));
});

/* ═══════════════════════════════════════════════════
   3. ROUTING PROVIDERS & FALLBACK
   ═══════════════════════════════════════════════════ */

test('StraightLineProvider computes ETA with 1.35 factor', async () => {
  const { StraightLineProvider, haversineDistanceMeters } = await import('../src/server/services/routing/straight-line.provider.ts');
  const provider = new StraightLineProvider();
  const from = { lat: 28.6139, lng: 77.2090 };
  const to = { lat: 28.6200, lng: 77.2150 };
  const directDist = haversineDistanceMeters(from, to);
  assert.ok(directDist > 0);
  const route = await provider.calculateRoute(from, to);
  assert.equal(route.source, 'straight_line');
  assert.equal(route.isApproximate, true);
  assert.ok(route.distance_m >= directDist * 1.34);
  assert.ok(route.duration_s >= 60);
});

test('ORS falls back to straight-line when unconfigured', async () => {
  const { OpenRouteServiceProvider } = await import('../src/server/services/routing/ors.provider.ts');
  const provider = new OpenRouteServiceProvider();
  delete process.env.ORS_API_KEY;
  const from = { lat: 28.6139, lng: 77.2090 };
  const to = { lat: 28.6200, lng: 77.2150 };
  const route = await provider.calculateRoute(from, to);
  assert.equal(route.source, 'straight_line');
  assert.equal(route.isApproximate, true);
});

/* ═══════════════════════════════════════════════════
   4. LIVE LOCATION REPOSITORY (in-memory fallback)
   ═══════════════════════════════════════════════════ */

test('LiveLocationRepo: upsert, get, delete', async () => {
  const { liveLocationRepo } = await import('../src/server/repositories/live-location.repository.ts');
  const bookingId = 'test_bk_' + Date.now();
  const helperId = 'test_hlp_1';

  await liveLocationRepo.upsertLiveLocation({
    booking_id: bookingId, helper_id: helperId,
    lat: 28.6145, lng: 77.2100, accuracy_m: 12,
    heading_deg: 90, speed_mps: 5.5, recorded_at: new Date(),
  });

  const record = await liveLocationRepo.getLiveLocation(bookingId);
  assert.ok(record);
  assert.equal(record.booking_id, bookingId);
  assert.equal(record.lat, 28.6145);

  await liveLocationRepo.deleteLiveLocation(bookingId);
  const deleted = await liveLocationRepo.getLiveLocation(bookingId);
  assert.equal(deleted, null);
});

test('LiveLocationRepo: cleanup stale locations', async () => {
  const { liveLocationRepo } = await import('../src/server/repositories/live-location.repository.ts');
  const bookingId = 'stale_cleanup_' + Date.now();

  await liveLocationRepo.upsertLiveLocation({
    booking_id: bookingId, helper_id: 'hlp_stale',
    lat: 28.6150, lng: 77.2100, accuracy_m: 10,
    recorded_at: new Date(),
  });

  // Manually backdate the record
  const rec = await liveLocationRepo.getLiveLocation(bookingId);
  if (rec) rec.updated_at = new Date(Date.now() - 700000); // 11+ minutes ago

  const cleaned = await liveLocationRepo.cleanupStaleLocations(new Date(Date.now() - 600000));
  assert.ok(cleaned >= 1, `Expected at least 1 cleaned, got ${cleaned}`);

  const shouldBeNull = await liveLocationRepo.getLiveLocation(bookingId);
  assert.equal(shouldBeNull, null);
});

/* ═══════════════════════════════════════════════════
   5. HELPER LOCATION ENDPOINT
   ═══════════════════════════════════════════════════ */

test('POST /api/helper/location: rejects unauthenticated', async () => {
  const { POST } = await import('../src/app/api/helper/location/route.ts');
  const req = new Request('http://localhost:3000/api/helper/location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: 28.614, lng: 77.210, accuracy_m: 10, recorded_at: new Date().toISOString() }),
  });
  const res = await POST(req);
  assert.equal(res.status, 401);
});

test('POST /api/helper/location: rate limit 1 per 2s', async () => {
  const { POST } = await import('../src/app/api/helper/location/route.ts');
  const helperId = 'rate_test_hlp_' + Date.now();

  const makeReq = () => new Request(`http://localhost:3000/api/helper/location?helperId=${helperId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-helper-id': helperId },
    body: JSON.stringify({ lat: 28.614, lng: 77.210, accuracy_m: 10, recorded_at: new Date().toISOString() }),
  });

  const res1 = await POST(makeReq());
  assert.equal(res1.status, 200);

  const res2 = await POST(makeReq());
  assert.equal(res2.status, 429);
  assert.equal(res2.headers.get('Retry-After'), '2');
});

test('POST /api/helper/location: rejects old timestamps (>30s drift)', async () => {
  const { POST } = await import('../src/app/api/helper/location/route.ts');
  const helperId = 'drift_test_hlp_' + Date.now();

  const req = new Request(`http://localhost:3000/api/helper/location?helperId=${helperId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-helper-id': helperId },
    body: JSON.stringify({ lat: 28.614, lng: 77.210, accuracy_m: 10, recorded_at: new Date(Date.now() - 45000).toISOString() }),
  });

  const res = await POST(req);
  assert.equal(res.status, 400);
});

test('POST /api/helper/location: rejects null island (0,0)', async () => {
  const { POST } = await import('../src/app/api/helper/location/route.ts');
  const helperId = 'null_island_test_' + Date.now();

  const req = new Request(`http://localhost:3000/api/helper/location?helperId=${helperId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-helper-id': helperId },
    body: JSON.stringify({ lat: 0, lng: 0, accuracy_m: 10, recorded_at: new Date().toISOString() }),
  });

  const res = await POST(req);
  assert.equal(res.status, 400);
});

/* ═══════════════════════════════════════════════════
   6. LIVE TRACKING ENDPOINT
   ═══════════════════════════════════════════════════ */

test('GET /api/bookings/[id]/live: authorization check', async () => {
  const { GET, demoBookings } = await import('../src/app/api/bookings/[id]/live/route.ts');

  const privateBookingId = 'private_bk_' + Date.now();
  demoBookings.set(privateBookingId, {
    id: privateBookingId, customer_id: 'cust_real',
    helper_id: 'hlp_real', status: 'accepted',
    lat: 28.6139, lng: 77.2090,
  });

  const req = new Request(`http://localhost:3000/api/bookings/${privateBookingId}/live`, {
    headers: { 'x-user-id': 'unauthorized_cust_intruder', 'x-user-role': 'user' },
  });

  const res = await GET(req, { params: Promise.resolve({ id: privateBookingId }) });
  assert.equal(res.status, 403);
});

test('GET /api/bookings/[id]/live: completed returns no helper', async () => {
  const { GET, demoBookings } = await import('../src/app/api/bookings/[id]/live/route.ts');

  const completedId = 'done_bk_' + Date.now();
  demoBookings.set(completedId, {
    id: completedId, customer_id: 'cust_1',
    helper_id: 'hlp_1', status: 'completed',
    lat: 28.6139, lng: 77.2090,
  });

  const req = new Request(`http://localhost:3000/api/bookings/${completedId}/live`, {
    headers: { 'x-user-id': 'cust_1' },
  });

  const res = await GET(req, { params: Promise.resolve({ id: completedId }) });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.booking_status, 'completed');
  assert.equal(data.helper, undefined);
});

test('GET /api/bookings/[id]/live: ETag 304 on unchanged poll', async () => {
  const { GET, demoBookings } = await import('../src/app/api/bookings/[id]/live/route.ts');

  const etag304Id = 'etag_bk_' + Date.now();
  demoBookings.set(etag304Id, {
    id: etag304Id, customer_id: 'cust_e',
    helper_id: 'hlp_e', status: 'completed',
    lat: 28.6139, lng: 77.2090,
  });

  const req1 = new Request(`http://localhost:3000/api/bookings/${etag304Id}/live`, {
    headers: { 'x-user-id': 'cust_e' },
  });
  const res1 = await GET(req1, { params: Promise.resolve({ id: etag304Id }) });
  assert.equal(res1.status, 200);
  const etag = res1.headers.get('ETag');
  assert.ok(etag);

  const req2 = new Request(`http://localhost:3000/api/bookings/${etag304Id}/live`, {
    headers: { 'If-None-Match': etag, 'x-user-id': 'cust_e' },
  });
  const res2 = await GET(req2, { params: Promise.resolve({ id: etag304Id }) });
  assert.equal(res2.status, 304);
});

test('GET /api/bookings/[id]/live: stale helper detection (>20s)', async () => {
  const { GET, demoBookings } = await import('../src/app/api/bookings/[id]/live/route.ts');
  const { liveLocationRepo } = await import('../src/server/repositories/live-location.repository.ts');

  const staleBkId = 'stale_bk_' + Date.now();
  demoBookings.set(staleBkId, {
    id: staleBkId, customer_id: 'cust_stale',
    helper_id: 'hlp_stale', status: 'on_the_way',
    lat: 28.6139, lng: 77.2090,
  });

  await liveLocationRepo.upsertLiveLocation({
    booking_id: staleBkId, helper_id: 'hlp_stale',
    lat: 28.6200, lng: 77.2100, accuracy_m: 10,
    recorded_at: new Date(Date.now() - 25000),
  });

  const rec = await liveLocationRepo.getLiveLocation(staleBkId);
  if (rec) rec.updated_at = new Date(Date.now() - 25000);

  const req = new Request(`http://localhost:3000/api/bookings/${staleBkId}/live`, {
    headers: { 'x-user-id': 'cust_stale' },
  });

  const res = await GET(req, { params: Promise.resolve({ id: staleBkId }) });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.helper);
  assert.equal(data.helper.stale, true);
});

test('GET /api/bookings/[id]/live: OTP not exposed to helper', async () => {
  const { GET, demoBookings } = await import('../src/app/api/bookings/[id]/live/route.ts');

  const otpBkId = 'otp_bk_' + Date.now();
  demoBookings.set(otpBkId, {
    id: otpBkId, customer_id: 'cust_otp',
    helper_id: 'hlp_otp', status: 'accepted',
    lat: 28.6139, lng: 77.2090,
    start_code: '1234',
  });

  // Helper calls the endpoint
  const reqHelper = new Request(`http://localhost:3000/api/bookings/${otpBkId}/live`, {
    headers: { 'x-user-id': 'hlp_otp', 'x-user-role': 'helper' },
  });
  const resHelper = await GET(reqHelper, { params: Promise.resolve({ id: otpBkId }) });
  const dataHelper = await resHelper.json();
  // Helper should NOT see the OTP
  assert.equal(dataHelper.start_code, undefined, 'Helper must not see OTP');
});

/* ═══════════════════════════════════════════════════
   7. LIVE LOCATION CLEANUP ON COMPLETION
   ═══════════════════════════════════════════════════ */

test('Live row deleted when booking transitions to completed via POST', async () => {
  const { POST, demoBookings } = await import('../src/app/api/bookings/[id]/live/route.ts');
  const { liveLocationRepo } = await import('../src/server/repositories/live-location.repository.ts');

  const bkId = 'complete_bk_' + Date.now();
  demoBookings.set(bkId, {
    id: bkId, customer_id: 'cust_done',
    helper_id: 'hlp_done', status: 'on_the_way',
    lat: 28.6139, lng: 77.2090,
  });

  await liveLocationRepo.upsertLiveLocation({
    booking_id: bkId, helper_id: 'hlp_done',
    lat: 28.6139, lng: 77.2090, accuracy_m: 5,
    recorded_at: new Date(),
  });

  const postReq = new Request(`http://localhost:3000/api/bookings/${bkId}/live`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'completed' }),
  });

  const postRes = await POST(postReq, { params: Promise.resolve({ id: bkId }) });
  assert.equal(postRes.status, 200);

  const rec = await liveLocationRepo.getLiveLocation(bkId);
  assert.equal(rec, null, 'Live location should be cleaned up after completion');
});

/* ═══════════════════════════════════════════════════
   8. MATCHING & HAVERSINE (frontend-shared module)
   ═══════════════════════════════════════════════════ */

test('pickHelpersInRadius: filters and sorts by distance', async () => {
  const { pickHelpersInRadius } = await import('../src/lib/swepy/matching.ts');
  const center = { lat: 28.6139, lng: 77.2090 };
  const helpers = [
    { helper_id: 'h1', name: 'Near', lat: 28.6140, lng: 77.2091, last_ping: Date.now() },
    { helper_id: 'h2', name: 'Far', lat: 28.6300, lng: 77.2300, last_ping: Date.now() },
    { helper_id: 'h3', name: 'Mid', lat: 28.6170, lng: 77.2120, last_ping: Date.now() },
  ];

  const within500m = pickHelpersInRadius(helpers, center, 500);
  assert.ok(within500m.length >= 1, 'Should find at least the nearest helper');
  assert.equal(within500m[0].helper_id, 'h1', 'Nearest should be first');

  const within5km = pickHelpersInRadius(helpers, center, 5000);
  assert.ok(within5km.length >= 2, 'Should find more helpers in larger radius');
});

test('computeEta: minimum 1 minute', async () => {
  const { computeEta } = await import('../src/lib/swepy/matching.ts');
  assert.ok(computeEta(10) >= 1, 'ETA should be at least 1 min');
  assert.ok(computeEta(5000) > 1, 'ETA for 5km should be > 1 min');
});

test('generateOtp: 4-digit string', async () => {
  const { generateOtp } = await import('../src/lib/swepy/matching.ts');
  const otp = generateOtp();
  assert.equal(otp.length, 4, `OTP should be 4 digits, got: ${otp}`);
  assert.ok(/^\d{4}$/.test(otp), `OTP should be numeric, got: ${otp}`);
});

/* ═══════════════════════════════════════════════════
   9. GEO CONVERSIONS
   ═══════════════════════════════════════════════════ */

test('GeoJSON conversions: fromGeoJSON / toGeoJSON roundtrip', async () => {
  const { fromGeoJSON, toGeoJSON } = await import('../src/server/lib/geo.ts');
  const geoJson = [77.2090, 28.6139]; // [lng, lat]
  const latLng = fromGeoJSON(geoJson);
  assert.equal(latLng.lat, 28.6139);
  assert.equal(latLng.lng, 77.2090);

  const back = toGeoJSON(latLng);
  assert.equal(back[0], 77.2090);
  assert.equal(back[1], 28.6139);
});

test('roadAdjustedDistanceM: applies 1.35 factor', async () => {
  const { roadAdjustedDistanceM } = await import('../src/server/lib/geo.ts');
  assert.equal(roadAdjustedDistanceM(1000), 1350);
  assert.equal(roadAdjustedDistanceM(1000, 1.5), 1500);
});

test('etaMinutes: minimum 1 minute', async () => {
  const { etaMinutes } = await import('../src/server/lib/geo.ts');
  assert.ok(etaMinutes(10) >= 1);
  assert.ok(etaMinutes(15000) > 1);
});
