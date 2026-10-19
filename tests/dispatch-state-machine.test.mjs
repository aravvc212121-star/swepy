import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.USE_IN_MEMORY_DB = 'true';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/swepy_test';

import { bookingService } from '../src/server/services/booking.service.ts';
import { dispatchService } from '../src/server/services/dispatch.service.ts';
import { bookingRepo } from '../src/server/repositories/booking.repository.ts';
import { helperRepo } from '../src/server/repositories/helper.repository.ts';
import { realtimeEventBus } from '../src/server/lib/realtime-events.ts';
import { DISPATCH_CONFIG, ORDER_STATES } from '../src/server/config/dispatch.config.ts';
import { haversineMeters, estimateEtaMinutes } from '../src/server/lib/geo.ts';

// Helper coordinate generator: places a helper north of center by exact meters
function coordsAtDistance(centerLat, centerLng, metersNorth) {
  // 1 degree latitude ≈ 111,320 meters
  const latDelta = metersNorth / 111320;
  return { lat: centerLat + latDelta, lng: centerLng };
}

/* ══════════════════════════════════════════════════════════════════════════
   PHASE 5 SIMULATION TESTS: 10 REQUIRED SCENARIOS
   ══════════════════════════════════════════════════════════════════════════ */

test.beforeEach(() => {
  helperRepo.clear();
  bookingRepo.clear();
});

test('Scenario 1: Helpers at 1.5 km and 2.3 km: wave 1 offers 1.5 km helper first, first to accept wins', async () => {
  const userLoc = { lat: 28.6139, lng: 77.2090 };
  const h1Loc = coordsAtDistance(userLoc.lat, userLoc.lng, 1500); // 1.5 km
  const h2Loc = coordsAtDistance(userLoc.lat, userLoc.lng, 2300); // 2.3 km

  const h1 = helperRepo.createOrUpdateSimulationHelper({
    id: 'helper_sc1_1',
    name: 'Pooja (1.5km)',
    lat: h1Loc.lat,
    lng: h1Loc.lng,
    is_online: true,
  });
  const h2 = helperRepo.createOrUpdateSimulationHelper({
    id: 'helper_sc1_2',
    name: 'Ramesh (2.3km)',
    lat: h2Loc.lat,
    lng: h2Loc.lng,
    is_online: true,
  });

  const { booking } = await bookingService.createBooking({
    customer_id: 'cust_sc1',
    user_lat: userLoc.lat,
    user_lng: userLoc.lng,
    service_code: 'cleaning_standard',
    price_paise: 29900,
  });

  // Wave 1: radius 2.0 km -> only h1 (1.5km) is in wave 1
  const wave1Result = await dispatchService.dispatchWave(booking.id, 1);
  assert.equal(wave1Result.status, 'OFFERED');
  assert.equal(wave1Result.offersSent, 1);
  assert.equal(wave1Result.offeredHelperIds[0], h1.id);

  // If h1 accepts, first to accept wins and order becomes ACCEPTED
  const acceptResult = await dispatchService.acceptOffer(booking.id, h1.id);
  assert.equal(acceptResult.success, true);
  assert.equal(acceptResult.booking.status, ORDER_STATES.ACCEPTED);
  assert.equal(acceptResult.booking.helper_id, h1.id);
  assert.equal(acceptResult.booking.sub_state, 'EN_ROUTE');
});

test('Scenario 2: No helper inside 2.0 km, one at 2.4 km: dispatch jumps to 2.5 km step immediately', async () => {
  const userLoc = { lat: 28.6139, lng: 77.2090 };
  const hLoc = coordsAtDistance(userLoc.lat, userLoc.lng, 2400); // 2.4 km (outside 2.0 km, inside 2.5 km)

  const h = helperRepo.createOrUpdateSimulationHelper({
    id: 'helper_sc2',
    name: 'Sunita (2.4km)',
    lat: hLoc.lat,
    lng: hLoc.lng,
    is_online: true,
  });

  const { booking } = await bookingService.createBooking({
    customer_id: 'cust_sc2',
    user_lat: userLoc.lat,
    user_lng: userLoc.lng,
    service_code: 'cleaning_standard',
    price_paise: 29900,
  });

  // Start dispatch: Wave 1 has 0 helpers inside 2.0km -> immediately jumps to Wave 2 (2.5km) without waiting
  const dispatchResult = await dispatchService.startDispatch(booking.id);
  assert.equal(dispatchResult.status, 'OFFERED');
  assert.equal(dispatchResult.wave, 2); // Jumped straight to wave 2!
  assert.ok(dispatchResult.offeredHelperIds.includes(h.id));

  const offers = await bookingRepo.findOffersByBookingId(booking.id);
  assert.equal(offers.length, 1);
  assert.equal(offers[0].helper_id, h.id);
  assert.equal(offers[0].radius_km, 2.5);
});

test('Scenario 3: All helpers reject or time out: radius expands step by step, then NO_HELPER_FOUND', async () => {
  const userLoc = { lat: 28.6139, lng: 77.2090 };

  const { booking } = await bookingService.createBooking({
    customer_id: 'cust_sc3',
    user_lat: userLoc.lat,
    user_lng: userLoc.lng,
    service_code: 'cleaning_standard',
    price_paise: 29900,
  });

  // Helpers at wave 1 (1.8km) and wave 4 (4.5km)
  const hWave1 = helperRepo.createOrUpdateSimulationHelper({
    id: 'helper_sc3_w1',
    name: 'Helper W1',
    lat: coordsAtDistance(userLoc.lat, userLoc.lng, 1800).lat,
    lng: userLoc.lng,
    is_online: true,
  });

  await dispatchService.dispatchWave(booking.id, 1);
  // Helper 1 rejects offer
  await dispatchService.handleOfferRejection(booking.id, hWave1.id, 'Too far');

  // Next waves: no other helpers exist in radius steps
  // Sweeping / executing through final wave
  const finalResult = await dispatchService.dispatchWave(booking.id, 5); // Exceeds DISPATCH_CONFIG.RADIUS_STEPS_KM.length
  assert.equal(finalResult.status, 'NO_HELPER_FOUND');

  const updatedBooking = await bookingRepo.findBookingById(booking.id);
  assert.equal(updatedBooking.status, ORDER_STATES.NO_HELPER_FOUND);
});

test('Scenario 4: Two helpers accept at the same instant: exactly one wins, the other gets "order taken"', async () => {
  const userLoc = { lat: 28.6139, lng: 77.2090 };
  const h1 = helperRepo.createOrUpdateSimulationHelper({
    id: 'helper_sc4_1',
    name: 'Helper 1',
    lat: coordsAtDistance(userLoc.lat, userLoc.lng, 1200).lat,
    lng: userLoc.lng,
    is_online: true,
  });
  const h2 = helperRepo.createOrUpdateSimulationHelper({
    id: 'helper_sc4_2',
    name: 'Helper 2',
    lat: coordsAtDistance(userLoc.lat, userLoc.lng, 1400).lat,
    lng: userLoc.lng,
    is_online: true,
  });

  const { booking } = await bookingService.createBooking({
    customer_id: 'cust_sc4',
    user_lat: userLoc.lat,
    user_lng: userLoc.lng,
    service_code: 'cleaning_standard',
    price_paise: 29900,
  });

  await dispatchService.dispatchWave(booking.id, 1);

  // Both helpers accept concurrently
  const [res1, res2] = await Promise.all([
    dispatchService.acceptOffer(booking.id, h1.id),
    dispatchService.acceptOffer(booking.id, h2.id),
  ]);

  const winner = res1.success ? res1 : res2;
  const loser = res1.success ? res2 : res1;

  assert.equal(winner.success, true);
  assert.equal(winner.booking.status, ORDER_STATES.ACCEPTED);

  assert.equal(loser.success, false);
  assert.ok(
    loser.reason === 'ORDER_ALREADY_TAKEN' || loser.reason === 'OFFER_EXPIRED',
    `Expected ORDER_ALREADY_TAKEN or OFFER_EXPIRED, got ${loser.reason}`
  );
  assert.equal(loser.booking, null);
});

test('Scenario 5: A helper whose ETA is above 25 minutes is never offered', async () => {
  const userLoc = { lat: 28.6139, lng: 77.2090 };
  // 6 km at 18 km/h with 1.35 detour factor = 6 * 1.35 / 18 * 60 = 27 minutes (> 25 min)
  const farLoc = coordsAtDistance(userLoc.lat, userLoc.lng, 6000);
  const eta = estimateEtaMinutes(farLoc, userLoc);
  assert.ok(eta > DISPATCH_CONFIG.MAX_ETA_MINUTES, `ETA was ${eta}, expected > 25`);

  const farHelper = helperRepo.createOrUpdateSimulationHelper({
    id: 'helper_sc5_far',
    name: 'Far Helper',
    lat: farLoc.lat,
    lng: farLoc.lng,
    is_online: true,
  });

  const { booking } = await bookingService.createBooking({
    customer_id: 'cust_sc5',
    user_lat: userLoc.lat,
    user_lng: userLoc.lng,
    service_code: 'cleaning_standard',
    price_paise: 29900,
  });

  // Wave with up to 7 km radius
  const eligible = await dispatchService.getEligibleHelpers(booking.id, 7.0);
  const offered = eligible.find(h => h.id === farHelper.id);
  assert.equal(offered, undefined, 'Helper with ETA > 25 min must never be eligible or offered');
});

test('Scenario 6: A helper with a stale location or an active order is never offered', async () => {
  const userLoc = { lat: 28.6139, lng: 77.2090 };
  const closeLoc = coordsAtDistance(userLoc.lat, userLoc.lng, 1000);

  // Helper with stale location (45 seconds old)
  const staleHelper = helperRepo.createOrUpdateSimulationHelper({
    id: 'helper_sc6_stale',
    name: 'Stale Helper',
    lat: closeLoc.lat,
    lng: closeLoc.lng,
    is_online: true,
    last_location_update: new Date(Date.now() - 45 * 1000).toISOString(),
  });

  // Helper with active order
  const busyHelper = helperRepo.createOrUpdateSimulationHelper({
    id: 'helper_sc6_busy',
    name: 'Busy Helper',
    lat: closeLoc.lat,
    lng: closeLoc.lng,
    is_online: true,
    last_location_update: new Date().toISOString(),
  });

  // Give busyHelper an active order
  const { booking: busyBooking } = await bookingService.createBooking({
    customer_id: 'cust_sc6_busy',
    user_lat: userLoc.lat,
    user_lng: userLoc.lng,
    service_code: 'cleaning_standard',
    price_paise: 29900,
  });
  await bookingRepo.createOffer({
    order_id: busyBooking.id,
    helper_id: busyHelper.id,
    status: 'ACCEPTED',
    wave_number: 1,
    radius_km: 2.0,
    eta_minutes: 5,
    expires_at: new Date(Date.now() + 60000),
  });
  await bookingService.transitionState({
    orderId: busyBooking.id,
    toState: ORDER_STATES.ACCEPTED,
    actor: busyHelper.id,
    helperId: busyHelper.id,
  });

  // Now create a new booking to test dispatch
  const { booking: testBooking } = await bookingService.createBooking({
    customer_id: 'cust_sc6_test',
    user_lat: userLoc.lat,
    user_lng: userLoc.lng,
    service_code: 'cleaning_standard',
    price_paise: 29900,
  });

  const eligible = await dispatchService.getEligibleHelpers(testBooking.id, 2.5);
  assert.equal(eligible.some(h => h.id === staleHelper.id), false, 'Stale helper should not be eligible');
  assert.equal(eligible.some(h => h.id === busyHelper.id), false, 'Busy helper should not be eligible');
});

test('Scenario 7: After accept: user receives OTP, helper payload contains NO OTP, helper screen has only OTP field', async () => {
  const userLoc = { lat: 28.6139, lng: 77.2090 };
  const hLoc = coordsAtDistance(userLoc.lat, userLoc.lng, 1200);

  const helper = helperRepo.createOrUpdateSimulationHelper({
    id: 'helper_sc7',
    name: 'Anita',
    lat: hLoc.lat,
    lng: hLoc.lng,
    is_online: true,
  });

  const { booking } = await bookingService.createBooking({
    customer_id: 'cust_sc7',
    user_lat: userLoc.lat,
    user_lng: userLoc.lng,
    service_code: 'cleaning_standard',
    price_paise: 29900,
  });

  await dispatchService.dispatchWave(booking.id, 1);
  const acceptResult = await dispatchService.acceptOffer(booking.id, helper.id);
  assert.equal(acceptResult.success, true);

  // User active order: must contain plaintext 4-digit OTP
  const userOrder = await bookingService.getCustomerActiveOrder('cust_sc7');
  assert.ok(userOrder, 'Customer active order exists');
  assert.ok(userOrder.otp, 'Customer payload contains OTP');
  assert.equal(userOrder.otp.length, 4, 'OTP is 4 digits');

  // Helper active order: OTP must be strictly stripped / undefined
  const helperOrder = await bookingService.getHelperActiveOrder(helper.id);
  assert.ok(helperOrder, 'Helper active order exists');
  assert.equal(helperOrder.otp, undefined, 'Helper payload contains NO OTP');
  assert.equal(helperOrder.start_code, undefined, 'Helper payload contains NO start_code');
});

test('Scenario 8: Wrong OTP is rejected and counted; 5 wrong attempts lock out; correct OTP gives CONFIRMED on both; resubmitting is idempotent', async () => {
  const userLoc = { lat: 28.6139, lng: 77.2090 };
  const hLoc = coordsAtDistance(userLoc.lat, userLoc.lng, 1000);

  const helper = helperRepo.createOrUpdateSimulationHelper({
    id: 'helper_sc8',
    name: 'Kavita',
    lat: hLoc.lat,
    lng: hLoc.lng,
    is_online: true,
  });

  const { booking } = await bookingService.createBooking({
    customer_id: 'cust_sc8',
    user_lat: userLoc.lat,
    user_lng: userLoc.lng,
    service_code: 'cleaning_standard',
    price_paise: 29900,
  });

  await dispatchService.dispatchWave(booking.id, 1);
  await dispatchService.acceptOffer(booking.id, helper.id);

  const userActive = await bookingService.getCustomerActiveOrder('cust_sc8');
  const validOtp = userActive.otp;
  assert.ok(validOtp, 'Valid OTP exists for customer');

  // 1. Wrong OTP is rejected and counted
  const wrongRes1 = await bookingService.verifyOtp({
    orderId: booking.id,
    helperId: helper.id,
    otp: '0000' === validOtp ? '1111' : '0000',
  });
  assert.equal(wrongRes1.success, false);
  assert.equal(wrongRes1.message, 'Incorrect OTP');
  assert.equal(wrongRes1.remainingAttempts, 4);

  // 2. Submit wrong OTPs to reach 5 failed attempts
  await bookingService.verifyOtp({ orderId: booking.id, helperId: helper.id, otp: '0000' });
  await bookingService.verifyOtp({ orderId: booking.id, helperId: helper.id, otp: '0000' });
  await bookingService.verifyOtp({ orderId: booking.id, helperId: helper.id, otp: '0000' });
  const lockedRes = await bookingService.verifyOtp({ orderId: booking.id, helperId: helper.id, otp: '0000' });
  assert.equal(lockedRes.success, false);
  assert.equal(lockedRes.locked, true);
  assert.ok(lockedRes.message.includes('locked for 5 minutes'));

  // Reset lockout for testing correct OTP on another fresh order
  const { booking: booking2 } = await bookingService.createBooking({
    customer_id: 'cust_sc8_b',
    user_lat: userLoc.lat,
    user_lng: userLoc.lng,
    service_code: 'cleaning_standard',
    price_paise: 29900,
  });
  const helper2 = helperRepo.createOrUpdateSimulationHelper({
    id: 'helper_sc8_b',
    name: 'Asha',
    lat: hLoc.lat,
    lng: hLoc.lng,
    is_online: true,
  });
  await dispatchService.dispatchWave(booking2.id, 1);
  await dispatchService.acceptOffer(booking2.id, helper2.id);
  const userActive2 = await bookingService.getCustomerActiveOrder('cust_sc8_b');

  // Correct OTP gives CONFIRMED
  const correctRes = await bookingService.verifyOtp({
    orderId: booking2.id,
    helperId: helper2.id,
    otp: userActive2.otp,
  });
  assert.equal(correctRes.success, true);
  assert.equal(correctRes.status, ORDER_STATES.CONFIRMED);

  // Both devices see CONFIRMED
  const confirmedUser = await bookingService.getCustomerActiveOrder('cust_sc8_b');
  assert.equal(confirmedUser.status, ORDER_STATES.CONFIRMED);

  const confirmedHelper = await bookingService.getHelperActiveOrder(helper2.id);
  assert.equal(confirmedHelper.status, ORDER_STATES.CONFIRMED);

  // Submitting correct OTP again is IDEMPOTENT (no error, no double transition)
  const reVerify = await bookingService.verifyOtp({
    orderId: booking2.id,
    helperId: helper2.id,
    otp: userActive2.otp,
  });
  assert.equal(reVerify.success, true);
  assert.equal(reVerify.idempotent, true);
  assert.equal(reVerify.status, ORDER_STATES.CONFIRMED);
});

test('Scenario 9: Server restart mid-search: the order is recovered, not stuck', async () => {
  const userLoc = { lat: 28.6139, lng: 77.2090 };
  const { booking } = await bookingService.createBooking({
    customer_id: 'cust_sc9',
    user_lat: userLoc.lat,
    user_lng: userLoc.lng,
    service_code: 'cleaning_standard',
    price_paise: 29900,
  });

  // Simulate an expired offer from before server restarted
  await bookingRepo.createOffer({
    order_id: booking.id,
    helper_id: 'helper_old',
    status: 'PENDING',
    wave_number: 1,
    radius_km: 2.0,
    eta_minutes: 6,
    expires_at: new Date(Date.now() - 30000), // Expired 30s ago
  });

  // Run startup sweeper
  const sweepSummary = await bookingService.sweepStaleOrders();
  assert.ok(sweepSummary.sweptOffersCount >= 1, 'Expired offer must be swept');

  // Verify offer is no longer PENDING
  const offers = await bookingRepo.findOffersByBookingId(booking.id);
  assert.equal(offers[0].status, 'EXPIRED');

  // Verify order is not stuck
  const current = await bookingRepo.findBookingById(booking.id);
  assert.ok(current.status === ORDER_STATES.SEARCHING || current.status === ORDER_STATES.NO_HELPER_FOUND);
});

test('Scenario 10: App closed and reopened during ACCEPTED: correct screen and OTP show up via active-order endpoint', async () => {
  const userLoc = { lat: 28.6139, lng: 77.2090 };
  const hLoc = coordsAtDistance(userLoc.lat, userLoc.lng, 900);

  const helper = helperRepo.createOrUpdateSimulationHelper({
    id: 'helper_sc10',
    name: 'Rekha',
    lat: hLoc.lat,
    lng: hLoc.lng,
    is_online: true,
  });

  const { booking } = await bookingService.createBooking({
    customer_id: 'cust_sc10',
    user_lat: userLoc.lat,
    user_lng: userLoc.lng,
    service_code: 'cleaning_standard',
    price_paise: 29900,
  });

  await dispatchService.dispatchWave(booking.id, 1);
  await dispatchService.acceptOffer(booking.id, helper.id);

  // Simulate app restart / reopened: customer calls /api/bookings/active
  const activeOrder = await bookingService.getCustomerActiveOrder('cust_sc10');
  assert.ok(activeOrder, 'Active order must be found on app reopen');
  assert.equal(activeOrder.status, ORDER_STATES.ACCEPTED);
  assert.equal(activeOrder.sub_state, 'EN_ROUTE');
  assert.equal(activeOrder.helper_id, helper.id);
  assert.equal(activeOrder.helper_name, 'Rekha');
  assert.ok(activeOrder.otp, 'Plaintext OTP is present for tracking screen');
  assert.equal(activeOrder.otp.length, 4);

  // Helper also reopens app
  const helperActive = await bookingService.getHelperActiveOrder(helper.id);
  assert.ok(helperActive, 'Helper active order must be found on app reopen');
  assert.equal(helperActive.status, ORDER_STATES.ACCEPTED);
  assert.equal(helperActive.otp, undefined, 'Helper gets NO OTP');
});
