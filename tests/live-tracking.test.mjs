import test from 'node:test';
import assert from 'node:assert/strict';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.USE_IN_MEMORY_DB = 'true';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/swepy_test';

// 1. Test Routing Providers & Fallback
test('StraightLineProvider computes ETA with 1.35 factor and minimum 1 minute', async () => {
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

test('OpenRouteServiceProvider falls back to StraightLineProvider when unconfigured, rate-limited or on error', async () => {
  const { OpenRouteServiceProvider } = await import('../src/server/services/routing/ors.provider.ts');
  const provider = new OpenRouteServiceProvider();

  delete process.env.ORS_API_KEY;

  const from = { lat: 28.6139, lng: 77.2090 };
  const to = { lat: 28.6200, lng: 77.2150 };

  const route = await provider.calculateRoute(from, to);
  assert.equal(route.source, 'straight_line');
  assert.equal(route.isApproximate, true);
});

// 2. Test LiveLocationRepository In-Memory Fallback
test('LiveLocationRepository upserts and retrieves live location record', async () => {
  const { liveLocationRepo } = await import('../src/server/repositories/live-location.repository.ts');

  const bookingId = 'test_bk_' + Date.now();
  const helperId = 'test_hlp_1';

  await liveLocationRepo.upsertLiveLocation({
    booking_id: bookingId,
    helper_id: helperId,
    lat: 28.6145,
    lng: 77.2100,
    accuracy_m: 12,
    heading_deg: 90,
    speed_mps: 5.5,
    recorded_at: new Date(),
  });

  const record = await liveLocationRepo.getLiveLocation(bookingId);
  assert.ok(record);
  assert.equal(record.booking_id, bookingId);
  assert.equal(record.helper_id, helperId);
  assert.equal(record.lat, 28.6145);
  assert.equal(record.lng, 77.2100);

  // Deletion
  await liveLocationRepo.deleteLiveLocation(bookingId);
  const deleted = await liveLocationRepo.getLiveLocation(bookingId);
  assert.equal(deleted, null);
});

// 3. Test POST /api/helper/location endpoint
test('POST /api/helper/location: rejects unauthenticated or non-helper role', async () => {
  const { POST } = await import('../src/app/api/helper/location/route.ts');

  const req = new Request('http://localhost:3000/api/helper/location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: 28.614,
      lng: 77.210,
      accuracy_m: 10,
      recorded_at: new Date().toISOString(),
    }),
  });

  const res = await POST(req);
  assert.equal(res.status, 401);
});

test('POST /api/helper/location: enforces rate limit (1 request per 2 seconds)', async () => {
  const { POST } = await import('../src/app/api/helper/location/route.ts');
  const helperId = 'rate_test_hlp_' + Date.now();

  const makeReq = () =>
    new Request(`http://localhost:3000/api/helper/location?helperId=${helperId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-helper-id': helperId,
      },
      body: JSON.stringify({
        lat: 28.614,
        lng: 77.210,
        accuracy_m: 10,
        recorded_at: new Date().toISOString(),
      }),
    });

  // 1st request should pass
  const res1 = await POST(makeReq());
  assert.equal(res1.status, 200);

  // 2nd request immediately after should be 429 Rate Limit
  const res2 = await POST(makeReq());
  assert.equal(res2.status, 429);
  assert.equal(res2.headers.get('Retry-After'), '2');
});

test('POST /api/helper/location: rejects timestamps older than 30s', async () => {
  const { POST } = await import('../src/app/api/helper/location/route.ts');
  const helperId = 'drift_test_hlp_' + Date.now();

  const req = new Request(`http://localhost:3000/api/helper/location?helperId=${helperId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-helper-id': helperId,
    },
    body: JSON.stringify({
      lat: 28.614,
      lng: 77.210,
      accuracy_m: 10,
      recorded_at: new Date(Date.now() - 45000).toISOString(), // 45s off
    }),
  });

  const res = await POST(req);
  assert.equal(res.status, 400);
});

// 4. Test GET /api/bookings/[id]/live endpoint
test('GET /api/bookings/[id]/live: customer cannot read another booking live data', async () => {
  const { GET, demoBookings } = await import('../src/app/api/bookings/[id]/live/route.ts');

  const privateBookingId = 'private_bk_' + Date.now();
  demoBookings.set(privateBookingId, {
    id: privateBookingId,
    customer_id: 'cust_real',
    helper_id: 'hlp_real',
    status: 'assigned',
    lat: 28.6139,
    lng: 77.2090,
  });

  // Unauthorized user
  const req = new Request(`http://localhost:3000/api/bookings/${privateBookingId}/live`, {
    headers: {
      'x-user-id': 'unauthorized_cust_intruder',
      'x-user-role': 'user',
    },
  });

  const res = await GET(req, { params: Promise.resolve({ id: privateBookingId }) });
  assert.equal(res.status, 403);
});

test('GET /api/bookings/[id]/live: outside sharing window returns no helper coordinates', async () => {
  const { GET, demoBookings } = await import('../src/app/api/bookings/[id]/live/route.ts');

  const completedBookingId = 'done_bk_' + Date.now();
  demoBookings.set(completedBookingId, {
    id: completedBookingId,
    customer_id: 'cust_1',
    helper_id: 'hlp_1',
    status: 'completed',
    lat: 28.6139,
    lng: 77.2090,
  });

  const req = new Request(`http://localhost:3000/api/bookings/${completedBookingId}/live`, {
    headers: { 'x-user-id': 'cust_1' },
  });

  const res = await GET(req, { params: Promise.resolve({ id: completedBookingId }) });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.booking_status, 'completed');
  assert.equal(data.helper, undefined);
});

test('GET /api/bookings/[id]/live: returns 304 on unchanged poll with ETag', async () => {
  const { GET } = await import('../src/app/api/bookings/[id]/live/route.ts');

  const req1 = new Request('http://localhost:3000/api/bookings/demo/live');
  const res1 = await GET(req1, { params: Promise.resolve({ id: 'demo' }) });
  assert.equal(res1.status, 200);
  const etag = res1.headers.get('ETag');
  assert.ok(etag);

  // 2nd poll with If-None-Match
  const req2 = new Request('http://localhost:3000/api/bookings/demo/live', {
    headers: { 'If-None-Match': etag },
  });
  const res2 = await GET(req2, { params: Promise.resolve({ id: 'demo' }) });
  assert.equal(res2.status, 304);
});

test('GET /api/bookings/[id]/live: detects stale helper position (>20s)', async () => {
  const { GET, demoBookings } = await import('../src/app/api/bookings/[id]/live/route.ts');
  const { liveLocationRepo } = await import('../src/server/repositories/live-location.repository.ts');

  const staleBkId = 'stale_bk_' + Date.now();
  demoBookings.set(staleBkId, {
    id: staleBkId,
    customer_id: 'cust_stale',
    helper_id: 'hlp_stale',
    status: 'on_the_way',
    lat: 28.6139,
    lng: 77.2090,
  });

  // Insert location with 25s old timestamp
  await liveLocationRepo.upsertLiveLocation({
    booking_id: staleBkId,
    helper_id: 'hlp_stale',
    lat: 28.6200,
    lng: 77.2100,
    accuracy_m: 10,
    recorded_at: new Date(Date.now() - 25000),
  });

  // Manually backdate updated_at in memory
  const rec = await liveLocationRepo.getLiveLocation(staleBkId);
  if (rec) {
    rec.updated_at = new Date(Date.now() - 25000);
  }

  const req = new Request(`http://localhost:3000/api/bookings/${staleBkId}/live`, {
    headers: { 'x-user-id': 'cust_stale' },
  });

  const res = await GET(req, { params: Promise.resolve({ id: staleBkId }) });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.helper);
  assert.equal(data.helper.stale, true);
});

test('Live row deleted when booking transitions to in_progress', async () => {
  const { GET, demoBookings } = await import('../src/app/api/bookings/[id]/live/route.ts');
  const { liveLocationRepo } = await import('../src/server/repositories/live-location.repository.ts');

  const bkId = 'inprogress_bk_' + Date.now();
  demoBookings.set(bkId, {
    id: bkId,
    customer_id: 'cust_ip',
    helper_id: 'hlp_ip',
    status: 'in_progress',
    lat: 28.6139,
    lng: 77.2090,
  });

  await liveLocationRepo.upsertLiveLocation({
    booking_id: bkId,
    helper_id: 'hlp_ip',
    lat: 28.6150,
    lng: 77.2100,
    accuracy_m: 10,
    recorded_at: new Date(),
  });

  const req = new Request(`http://localhost:3000/api/bookings/${bkId}/live`, {
    headers: { 'x-user-id': 'cust_ip' },
  });

  await GET(req, { params: Promise.resolve({ id: bkId }) });

  // Verification: live row must be deleted
  const rec = await liveLocationRepo.getLiveLocation(bkId);
  assert.equal(rec, null);
});
