/**
 * BookingService — single source of truth for order state machine.
 *
 * State Machine:
 *   SEARCHING -> ACCEPTED -> CONFIRMED
 *   SEARCHING -> NO_HELPER_FOUND
 *   SEARCHING / ACCEPTED -> CANCELLED
 *   (Continuation after CONFIRMED: CONFIRMED -> in_progress -> completed)
 *
 * Derived Sub-States (server-derived, never set by helper button):
 *   EN_ROUTE (right after accept)
 *   ARRIVED (helper within 50m of user, based on live location)
 *
 * Every transition is written in ONE place, validated against current state,
 * and logged in an order_events record (order_id, from_state, to_state, actor, timestamp).
 */

import crypto from 'crypto';
import { sql } from '../db/client';
import { uuidv7, generateStartCode } from '../lib/id';
import { hmacHash } from '../lib/crypto';
import { bookingRepo } from '../repositories/booking.repository';
import { liveLocationRepo } from '../repositories/live-location.repository';
import { helperRepo } from '../repositories/helper.repository';
import { realtimeEvents } from '../lib/realtime-events';
import { haversineMeters } from '../lib/geo';
import {
  DISPATCH_CONFIG,
  ORDER_STATES,
  DERIVED_SUB_STATES,
  OrderState,
  DerivedSubState,
} from '../config/dispatch.config';

/** Canonical transition matrix */
const VALID_TRANSITIONS: Record<string, Record<string, string[]>> = {
  SEARCHING: {
    ACCEPTED: ['helper'],
    NO_HELPER_FOUND: ['system'],
    CANCELLED: ['customer', 'system'],
  },
  ACCEPTED: {
    CONFIRMED: ['helper', 'system'], // via OTP
    CANCELLED: ['customer', 'helper', 'system'],
    SEARCHING: ['system'], // helper released / re-dispatch
  },
  CONFIRMED: {
    in_progress: ['helper', 'system'],
    completed: ['helper', 'system'],
    CANCELLED: ['system'],
  },
  in_progress: {
    completed: ['helper', 'system'],
    CANCELLED: ['system'],
  },
  NO_HELPER_FOUND: {},
  CANCELLED: {},
  completed: {},
};

export class BookingService {
  /**
   * Helper to normalize statuses (supports both upper and lowercase inputs)
   */
  normalizeStatus(s: string): string {
    const upper = s ? String(s).toUpperCase() : '';
    if (upper === 'SEARCHING') return ORDER_STATES.SEARCHING;
    if (upper === 'ACCEPTED') return ORDER_STATES.ACCEPTED;
    if (upper === 'CONFIRMED') return ORDER_STATES.CONFIRMED;
    if (upper === 'NO_HELPER_FOUND' || upper === 'EXPIRED') return ORDER_STATES.NO_HELPER_FOUND;
    if (upper === 'CANCELLED') return ORDER_STATES.CANCELLED;
    if (upper === 'ON_THE_WAY') return ORDER_STATES.ACCEPTED; // mapped to ACCEPTED with EN_ROUTE sub-state
    if (upper === 'ARRIVED') return ORDER_STATES.ACCEPTED;    // mapped to ACCEPTED with ARRIVED sub-state
    return s.toLowerCase();
  }

  /**
   * Derive the sub-state (EN_ROUTE or ARRIVED) based on live location distance.
   * Derived automatically by the server, NEVER by a helper button.
   */
  async deriveSubState(order: any, helperLocation?: { lat: number; lng: number } | null): Promise<DerivedSubState | null> {
    const status = this.normalizeStatus(order.status);
    if (status !== ORDER_STATES.ACCEPTED) {
      return null;
    }

    let hLoc = helperLocation;
    if (!hLoc) {
      const live = await liveLocationRepo.getLiveLocation(order.id);
      if (live) {
        hLoc = { lat: live.lat, lng: live.lng };
      } else if (order.helper_id) {
        const helper = await helperRepo.getHelper(order.helper_id);
        if (helper?.last_lat && helper?.last_lng) {
          hLoc = { lat: helper.last_lat, lng: helper.last_lng };
        }
      }
    }

    const uLat = order.address_snapshot?.lat || order.lat;
    const uLng = order.address_snapshot?.lng || order.lng;

    if (hLoc && uLat && uLng) {
      const distM = haversineMeters({ lat: uLat, lng: uLng }, { lat: hLoc.lat, lng: hLoc.lng });
      if (distM <= DISPATCH_CONFIG.ARRIVED_THRESHOLD_METERS) {
        return DERIVED_SUB_STATES.ARRIVED;
      }
    }

    return DERIVED_SUB_STATES.EN_ROUTE;
  }

  /**
   * Validate a proposed transition.
   * Throws Error if invalid or unauthorized.
   */
  validateTransition(fromStatus: string, toStatus: string, actorRole: string): void {
    const fromNorm = this.normalizeStatus(fromStatus);
    const toNorm = this.normalizeStatus(toStatus);

    const allowedNext = VALID_TRANSITIONS[fromNorm];
    if (!allowedNext) {
      throw new Error(`Unknown current status: ${fromStatus}`);
    }

    const allowedActors = allowedNext[toNorm];
    if (!allowedActors) {
      throw new Error(`Invalid order state transition: ${fromNorm} -> ${toNorm}`);
    }

    if (!allowedActors.includes(actorRole)) {
      throw new Error(
        `Actor '${actorRole}' is not authorized to transition ${fromNorm} -> ${toNorm}. Allowed: ${allowedActors.join(', ')}`
      );
    }
  }

  /**
   * Execute an atomic transition and write to order_events audit log.
   */
  async transitionOrder(
    orderId: string,
    toState: string,
    actorId: string,
    actorRole: 'customer' | 'helper' | 'system',
    extraUpdates?: Record<string, any>,
    payload?: any
  ): Promise<any> {
    const order = await bookingRepo.getBooking(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    const fromState = this.normalizeStatus(order.status);
    const targetState = this.normalizeStatus(toState);

    // Idempotency: if already in target state, return current order
    if (fromState === targetState) {
      return order;
    }

    this.validateTransition(fromState, targetState, actorRole);

    // 1. Update order status
    const updated = await bookingRepo.updateBookingStatus(
      orderId,
      targetState,
      extraUpdates?.helper_id,
      extraUpdates
    );

    // 2. Append order_events record: (order_id, from_state, to_state, actor, timestamp)
    await bookingRepo.appendOrderEvent(
      orderId,
      fromState,
      targetState,
      `${actorRole}:${actorId}`,
      payload
    );

    return updated;
  }

  /* ── 1. CREATE ORDER ── */
  async createBooking(data: {
    customerId?: string;
    customer_id?: string;
    lat?: number;
    user_lat?: number;
    lng?: number;
    user_lng?: number;
    addressId?: string;
    addressSnapshot?: any;
    servicePackageId?: string;
    serviceCode?: string;
    service_code?: string;
    homeSize?: string;
    home_size?: string;
    durationMin?: number;
    pricePaise?: number;
    price_paise?: number;
    customerNotes?: string;
    idempotencyKey?: string;
    cityId?: string;
  }): Promise<any> {
    const customerId = data.customerId || data.customer_id || 'customer';
    const lat = data.lat ?? data.user_lat ?? 0;
    const lng = data.lng ?? data.user_lng ?? 0;
    const pricePaise = data.pricePaise ?? data.price_paise ?? 29900;
    const serviceCode = data.serviceCode || data.service_code || 'deep_cleaning';
    const homeSize = data.homeSize || data.home_size || '1BHK';

    // Idempotency check
    if (data.idempotencyKey) {
      const active = await bookingRepo.findActiveForUser(customerId);
      if (active && active.idempotency_key === data.idempotencyKey) {
        (active as any).booking = active;
        return active;
      }
    }

    const booking = await bookingRepo.createBooking({
      ...data,
      customerId,
      lat,
      lng,
      pricePaise,
      serviceCode,
      homeSize,
    });

    // Log creation in order_events
    await bookingRepo.appendOrderEvent(
      booking.id,
      null,
      ORDER_STATES.SEARCHING,
      `customer:${customerId}`,
      { address: data.addressSnapshot }
    );

    (booking as any).booking = booking;
    return booking;
  }

  async transitionState(
    orderIdOrParams: string | { orderId?: string; bookingId?: string; toState?: string; toStatus?: string; actor?: string; actorId?: string; actorRole?: string; helperId?: string },
    toStatusArg?: string,
    actorIdArg?: string,
    actorRoleArg?: string,
    patchArg?: any,
    metadataArg?: any
  ): Promise<any> {
    if (typeof orderIdOrParams === 'object') {
      const orderId = (orderIdOrParams.orderId || orderIdOrParams.bookingId)!;
      const targetState = orderIdOrParams.toState || orderIdOrParams.toStatus || ORDER_STATES.ACCEPTED;
      const actId = orderIdOrParams.actor || orderIdOrParams.actorId || orderIdOrParams.helperId || 'system';
      const actRole = orderIdOrParams.actorRole || (orderIdOrParams.helperId ? 'helper' : 'system');
      const patch = orderIdOrParams.helperId ? { helper_id: orderIdOrParams.helperId } : {};
      return this.transitionOrder(orderId, targetState, actId, actRole as any, patch);
    }
    return this.transitionOrder(orderIdOrParams, toStatusArg!, actorIdArg!, actorRoleArg! as any, patchArg, metadataArg);
  }

  private acceptLocks = new Set<string>();

  /* ── 2. ACCEPT (Atomic Helper Accept) ── */
  async accept(orderId: string, helperId: string, offerId?: string): Promise<{ order: any; booking?: any; plaintextOtp: string }> {
    while (this.acceptLocks.has(orderId)) {
      await new Promise(r => setTimeout(r, 20));
    }
    this.acceptLocks.add(orderId);
    try {
      // Check helper eligibility: no other active booking
      const hasActive = await helperRepo.hasActiveBooking(helperId);
      if (hasActive) {
        throw new Error('Helper already has an active booking');
      }

    const order = await bookingRepo.getBooking(orderId);
    if (!order) throw new Error('Order not found');

    const currentStatus = this.normalizeStatus(order.status);

    // Idempotent: already accepted by this helper
    if (currentStatus === ORDER_STATES.ACCEPTED && order.helper_id === helperId) {
      const otp = bookingRepo.getPlaintextOtp(orderId) || '0000';
      return { order, plaintextOtp: otp };
    }

    // Race-safe check: only SEARCHING orders can be accepted
    if (currentStatus !== ORDER_STATES.SEARCHING) {
      throw new Error('Order already taken or expired');
    }

    // Check offer status if offerId or helper offers exist
    const offers = await bookingRepo.getOffersForOrder(orderId);
    const helperOffer = offers.find(o => o.helper_id === helperId);
    if (helperOffer) {
      if (helperOffer.status === 'EXPIRED' || new Date(helperOffer.expires_at).getTime() < Date.now()) {
        throw new Error('Offer expired or already taken');
      }
    }

    // 1. Generate 4-digit OTP at this moment
    const startCode = generateStartCode(); // 4 digits
    const startCodeHash = hmacHash(startCode);

    // 2. Perform atomic conditional transition: SEARCHING -> ACCEPTED
    const updated = await this.transitionOrder(
      orderId,
      ORDER_STATES.ACCEPTED,
      helperId,
      'helper',
      {
        helper_id: helperId,
        start_code: startCodeHash,
        start_code_attempts: 0,
        assigned_at: new Date().toISOString(),
      },
      { helper_id: helperId, offer_id: offerId || helperOffer?.id }
    );

    // 3. Mark winning offer as ACCEPTED, close all other offers
    if (helperOffer) {
      await bookingRepo.updateOfferStatus(helperOffer.id, 'ACCEPTED');
    }
    const cancelledHelpers = await bookingRepo.cancelOtherOffers(orderId, helperId);

    // Store plaintext OTP securely for customer-only retrieval
    bookingRepo.savePlaintextOtp(orderId, startCode);

    // 4. Notify other helpers that order is taken
    for (const otherHelperId of cancelledHelpers) {
      await realtimeEvents.emitOrderTaken({
        order_id: orderId,
        helper_id: otherHelperId,
        reason: 'already_taken',
      });
    }

    // 5. Emit order:accepted to user (with OTP, helper info, ETA)
    const helper = await helperRepo.getHelper(helperId);
    const userLat = order.address_snapshot?.lat || order.lat || 28.6139;
    const userLng = order.address_snapshot?.lng || order.lng || 77.2090;
    const helperLat = helper?.last_lat || 28.6139;
    const helperLng = helper?.last_lng || 77.2090;
    const distM = haversineMeters({ lat: userLat, lng: userLng }, { lat: helperLat, lng: helperLng });
    const etaMin = Math.max(1, Math.round(((distM / 1000) * DISPATCH_CONFIG.ROAD_DETOUR_FACTOR / DISPATCH_CONFIG.SPEED_KMPH) * 60));

    await realtimeEvents.emitOrderAccepted({
      order_id: orderId,
      customer_id: order.customer_id,
      helper_info: {
        id: helperId,
        name: helper?.full_name || 'Helper',
        phone: helper?.phone_e164,
        rating: helper?.rating_avg || 4.9,
      },
      eta_minutes: etaMin,
      helper_location: {
        lat: helperLat,
        lng: helperLng,
      },
      otp: startCode, // Sent ONLY to customer
      sub_state: DERIVED_SUB_STATES.EN_ROUTE,
    });

    const subState = await this.deriveSubState(updated, { lat: helperLat, lng: helperLng });
    (updated as any).sub_state = subState;
    (updated as any).booking = updated;
    return { order: updated, booking: updated, plaintextOtp: startCode };
    } finally {
      this.acceptLocks.delete(orderId);
    }
  }

  /* ── 3. VERIFY OTP (Atomic Verification: ACCEPTED -> CONFIRMED) ── */
  async verifyOtp(
    orderIdOrParams: string | { orderId?: string; bookingId?: string; helperId: string; otp?: string; code?: string },
    helperIdArg?: string,
    inputOtpArg?: string
  ): Promise<{
    order: any;
    valid: boolean;
    success: boolean;
    status: string;
    attemptsLeft: number;
    remainingAttempts: number;
    locked: boolean;
    idempotent?: boolean;
    message: string;
  }> {
    let orderId: string;
    let helperId: string;
    let inputOtp: string;

    if (typeof orderIdOrParams === 'object') {
      orderId = (orderIdOrParams.orderId || orderIdOrParams.bookingId)!;
      helperId = orderIdOrParams.helperId;
      inputOtp = (orderIdOrParams.otp || orderIdOrParams.code)!;
    } else {
      orderId = orderIdOrParams;
      helperId = helperIdArg!;
      inputOtp = inputOtpArg!;
    }

    const order = await bookingRepo.getBooking(orderId);
    if (!order) throw new Error('Order not found');

    const currentStatus = this.normalizeStatus(order.status);

    // Idempotent: already CONFIRMED
    if (currentStatus === ORDER_STATES.CONFIRMED || currentStatus === 'completed' || currentStatus === 'in_progress') {
      return {
        order,
        valid: true,
        success: true,
        status: ORDER_STATES.CONFIRMED,
        attemptsLeft: 0,
        remainingAttempts: 0,
        locked: false,
        idempotent: true,
        message: 'Order already confirmed',
      };
    }

    // Only assigned helper can verify
    if (order.helper_id !== helperId) {
      throw new Error('Only the assigned helper can verify OTP');
    }

    if (currentStatus !== ORDER_STATES.ACCEPTED) {
      throw new Error(`OTP verification is only allowed in ACCEPTED status, current: ${order.status}`);
    }

    // Check lockout: 5 wrong attempts = 5 minutes lockout
    const attempts = order.start_code_attempts || 0;
    if (attempts >= DISPATCH_CONFIG.OTP_MAX_ATTEMPTS) {
      // Check last failed event timestamp
      const events = await bookingRepo.getOrderEvents(orderId);
      const lastFail = events.filter(e => e.to_state === 'OTP_FAILED').pop();
      if (lastFail) {
        const elapsedMs = Date.now() - new Date(lastFail.timestamp).getTime();
        if (elapsedMs < DISPATCH_CONFIG.OTP_LOCKOUT_MS) {
          const remainingMin = Math.ceil((DISPATCH_CONFIG.OTP_LOCKOUT_MS - elapsedMs) / 60000);
          return {
            order,
            valid: false,
            success: false,
            status: order.status,
            attemptsLeft: 0,
            remainingAttempts: 0,
            locked: true,
            idempotent: false,
            message: `Too many wrong attempts. Verification locked for ${remainingMin} minute(s).`,
          };
        }
      }
      // Lockout expired, reset attempts
      await bookingRepo.updateBookingStatus(orderId, order.status, undefined, { start_code_attempts: 0 });
    }

    // Constant-time comparison
    const inputHash = hmacHash(inputOtp);
    const storedHash = order.start_code;
    let isValid = false;

    if (storedHash) {
      const a = Buffer.from(storedHash, 'utf8');
      const b = Buffer.from(inputHash, 'utf8');
      if (a.length === b.length) {
        isValid = crypto.timingSafeEqual(a, b);
      }
    }

    if (!isValid) {
      const newAttempts = (order.start_code_attempts || 0) + 1;
      const isNowLocked = newAttempts >= DISPATCH_CONFIG.OTP_MAX_ATTEMPTS;

      await bookingRepo.updateBookingStatus(orderId, order.status, undefined, {
        start_code_attempts: newAttempts,
      });

      await bookingRepo.appendOrderEvent(
        orderId,
        ORDER_STATES.ACCEPTED,
        'OTP_FAILED',
        `helper:${helperId}`,
        { attempts: newAttempts, locked: isNowLocked }
      );

      // If locked, notify user
      if (isNowLocked) {
        await realtimeEvents.emit('order:otp_locked', {
          order_id: orderId,
          customer_id: order.customer_id,
          locked_duration_minutes: 5,
        });
      }

      const attemptsLeft = Math.max(0, DISPATCH_CONFIG.OTP_MAX_ATTEMPTS - newAttempts);
      return {
        order,
        valid: false,
        success: false,
        status: order.status,
        attemptsLeft,
        remainingAttempts: attemptsLeft,
        locked: isNowLocked,
        idempotent: false,
        message: isNowLocked ? 'Too many wrong attempts. Verification locked for 5 minutes.' : 'Incorrect OTP',
      };
    }

    // ── Correct OTP: Atomically transition to CONFIRMED ──
    const confirmedOrder = await this.transitionOrder(
      orderId,
      ORDER_STATES.CONFIRMED,
      helperId,
      'helper',
      {
        start_code: null, // clear hash
        start_code_attempts: 0,
        confirmed_at: new Date().toISOString(),
      },
      { verified_by: helperId }
    );

    // Clear plaintext OTP
    bookingRepo.clearPlaintextOtp(orderId);

    // Clean up live locations as helper has arrived and confirmed
    await this.cleanupOnComplete(orderId);

    // Emit order:confirmed to BOTH user and helper
    await realtimeEvents.emitOrderConfirmed({
      order_id: orderId,
      customer_id: order.customer_id,
      helper_id: helperId,
      confirmed_at: new Date().toISOString(),
      status: 'CONFIRMED',
    });

    return {
      order: confirmedOrder,
      valid: true,
      success: true,
      status: ORDER_STATES.CONFIRMED,
      attemptsLeft: 0,
      remainingAttempts: 0,
      locked: false,
      idempotent: false,
      message: 'Order confirmed successfully',
    };
  }

  /* ── 4. CANCEL HANDLING ── */
  async cancel(
    orderId: string,
    actorId: string,
    actorRole: 'customer' | 'helper' | 'system',
    reason?: string
  ): Promise<any> {
    const order = await bookingRepo.getBooking(orderId);
    if (!order) throw new Error('Order not found');

    const currentStatus = this.normalizeStatus(order.status);

    // Idempotent
    if (currentStatus === ORDER_STATES.CANCELLED) return order;

    // Validate actor
    if (actorRole === 'customer' && order.customer_id !== actorId) {
      throw new Error('Only the customer can cancel this order');
    }
    if (actorRole === 'helper' && order.helper_id !== actorId) {
      throw new Error('Only the assigned helper can cancel this order');
    }

    // User cancels during SEARCHING: cancel all live offers, notify helpers, set CANCELLED
    if (currentStatus === ORDER_STATES.SEARCHING) {
      const affectedHelpers = await bookingRepo.cancelAllOffersForOrder(orderId);
      for (const hId of affectedHelpers) {
        await realtimeEvents.emitOrderCancelled({
          order_id: orderId,
          cancelled_by: actorId,
          cancelled_role: actorRole,
          reason,
          status: 'CANCELLED',
        });
      }

      const cancelledOrder = await this.transitionOrder(
        orderId,
        ORDER_STATES.CANCELLED,
        actorId,
        actorRole,
        {
          cancelled_at: new Date().toISOString(),
          cancelled_by: actorId,
          cancel_reason: reason || 'Customer cancelled',
        }
      );

      return cancelledOrder;
    }

    // Helper cancels after ACCEPTED: free helper, add to order exclusion list, tell user "finding another helper", restart dispatch
    if (actorRole === 'helper' && currentStatus === ORDER_STATES.ACCEPTED) {
      bookingRepo.clearPlaintextOtp(orderId);

      // Revert to SEARCHING for re-dispatch
      const reverted = await this.transitionOrder(
        orderId,
        ORDER_STATES.SEARCHING,
        actorId,
        'system',
        {
          helper_id: null,
          start_code: null,
          start_code_attempts: 0,
          dispatch_wave: 1,
        },
        { helper_released: actorId, reason }
      );

      // Notify customer: finding another helper
      await realtimeEvents.emitSearchingUpdate({
        order_id: orderId,
        customer_id: order.customer_id,
        wave: 1,
        radius_km: DISPATCH_CONFIG.RADIUS_STEPS_KM[0],
      });

      return { ...reverted, re_dispatched: true, excluded_helper: actorId };
    }

    // Customer cancels after ACCEPTED
    const cancelled = await this.transitionOrder(
      orderId,
      ORDER_STATES.CANCELLED,
      actorId,
      actorRole,
      {
        cancelled_at: new Date().toISOString(),
        cancelled_by: actorId,
        cancel_reason: reason || 'Cancelled by ' + actorRole,
      }
    );

    await this.cleanupOnComplete(orderId);

    // Notify the other party
    await realtimeEvents.emitOrderCancelled({
      order_id: orderId,
      cancelled_by: actorId,
      cancelled_role: actorRole,
      reason,
      status: 'CANCELLED',
    });

    return cancelled;
  }

  /* ── 5. NO_HELPER_FOUND ── */
  async setNoHelperFound(orderId: string, reason?: string): Promise<any> {
    const order = await bookingRepo.getBooking(orderId);
    if (!order) throw new Error('Order not found');

    const currentStatus = this.normalizeStatus(order.status);
    if (currentStatus === ORDER_STATES.NO_HELPER_FOUND) return order;
    if (currentStatus !== ORDER_STATES.SEARCHING) return order;

    await bookingRepo.cancelAllOffersForOrder(orderId);

    const updated = await this.transitionOrder(
      orderId,
      ORDER_STATES.NO_HELPER_FOUND,
      'system',
      'system',
      { cancel_reason: reason || 'No helpers available' },
      { reason }
    );

    await realtimeEvents.emitNoHelperFound({
      order_id: orderId,
      customer_id: order.customer_id,
      reason: reason || 'No helpers available within maximum radius and ETA cap',
      status: 'NO_HELPER_FOUND',
    });

    return updated;
  }

  /* ── 6. ACTIVE ORDER ENDPOINTS QUERY ── */

  /**
   * Return the active order with its full state for a user.
   * If status is ACCEPTED, includes the OTP (sent only to customer client).
   */
  async getActiveOrderForUser(userId: string): Promise<any | null> {
    const order = await bookingRepo.findActiveForUser(userId);
    if (!order) return null;

    const norm = this.normalizeStatus(order.status);
    // Active states: SEARCHING, ACCEPTED, CONFIRMED (and in_progress)
    if (![ORDER_STATES.SEARCHING, ORDER_STATES.ACCEPTED, ORDER_STATES.CONFIRMED, 'in_progress', 'on_the_way'].includes(norm)) {
      return null;
    }

    const subState = await this.deriveSubState(order);
    const plaintextOtp = norm === ORDER_STATES.ACCEPTED ? bookingRepo.getPlaintextOtp(order.id) : null;

    let helperInfo: any = null;
    if (order.helper_id) {
      const helper = await helperRepo.getHelper(order.helper_id);
      const live = await liveLocationRepo.getLiveLocation(order.id);
      helperInfo = {
        id: order.helper_id,
        name: helper?.full_name || 'Helper',
        phone: helper?.phone_e164,
        lat: live?.lat || helper?.last_lat,
        lng: live?.lng || helper?.last_lng,
        rating: helper?.rating_avg || 4.9,
      };
    }

    const { start_code, ...safeOrder } = order;
    return {
      ...safeOrder,
      status: norm,
      sub_state: subState,
      otp: plaintextOtp, // only sent to user client
      helper: helperInfo,
      helper_name: helperInfo?.name,
    };
  }

  /**
   * Return the active order with its full state for a helper.
   * NEVER returns OTP!
   */
  async getActiveOrderForHelper(helperId: string): Promise<any | null> {
    const order = await bookingRepo.findActiveForHelper(helperId);
    if (!order) return null;

    const norm = this.normalizeStatus(order.status);
    if (![ORDER_STATES.ACCEPTED, ORDER_STATES.CONFIRMED, 'in_progress', 'on_the_way'].includes(norm)) {
      return null;
    }

    const subState = await this.deriveSubState(order);
    const live = await liveLocationRepo.getLiveLocation(order.id);

    const { start_code, ...safeOrder } = order;
    return {
      ...safeOrder,
      status: norm,
      sub_state: subState,
      // OTP is NEVER included
      live_location: live,
    };
  }

  /* ── 7. SWEEPER: EXPIRE STALE SEARCHING ORDERS ON STARTUP / TICK ── */
  async sweepStaleOrders(): Promise<{ expiredOffers: number; expiredOrders: number; sweptOffersCount?: number; sweptOrdersCount?: number }> {
    const expiredOffers = await bookingRepo.findExpiredOffers();
    let expiredOfferCount = 0;
    for (const off of expiredOffers) {
      await bookingRepo.updateOfferStatus(off.id, 'EXPIRED');
      await realtimeEvents.emitOrderOfferExpired({
        order_id: off.order_id,
        helper_id: off.helper_id,
      });
      expiredOfferCount++;
    }

    // Expire stale searching bookings older than MAX_SEARCH_SECONDS (120s)
    const cutoff = new Date(Date.now() - DISPATCH_CONFIG.MAX_SEARCH_SECONDS * 1000);
    let expiredOrderCount = 0;

    // Check in-memory store
    const g = globalThis as any;
    const memBookings = (g.__swepyBookings as Map<string, any>) || new Map();
    for (const b of memBookings.values()) {
      if (this.normalizeStatus(b.status) === ORDER_STATES.SEARCHING) {
        const created = new Date(b.created_at);
        if (created < cutoff) {
          await this.setNoHelperFound(b.id, 'Search timeout reached (120 seconds)');
          expiredOrderCount++;
        }
      }
    }

    try {
      const rows = await sql`
        SELECT id FROM bookings
        WHERE status IN ('SEARCHING', 'searching')
          AND created_at < ${cutoff}
      `;
      for (const row of rows) {
        await this.setNoHelperFound(row.id, 'Search timeout reached (120 seconds)');
        expiredOrderCount++;
      }
    } catch {
      // DB offline
    }

    return {
      expiredOffers: expiredOfferCount,
      expiredOrders: expiredOrderCount,
      sweptOffersCount: expiredOfferCount,
      sweptOrdersCount: expiredOrderCount,
    };
  }

  async getCustomerActiveOrder(userId: string): Promise<any | null> {
    return this.getActiveOrderForUser(userId);
  }

  async getHelperActiveOrder(helperId: string): Promise<any | null> {
    return this.getActiveOrderForHelper(helperId);
  }

  /* ── Legacy / compatibility endpoints ── */
  async startTrip(bookingId: string, helperId: string): Promise<any> {
    const order = await bookingRepo.getBooking(bookingId);
    if (!order) throw new Error('Booking not found');
    if (order.helper_id && order.helper_id !== helperId) {
      throw new Error('Only the assigned helper can start the trip');
    }
    return order;
  }

  async listHistoryForUser(userId: string, limit: number = 50): Promise<any[]> {
    if (process.env.USE_IN_MEMORY_DB !== 'true') {
      try {
        return await sql`
          SELECT * FROM bookings
          WHERE customer_id = ${userId}
            AND status IN ('completed', 'cancelled', 'expired', 'CONFIRMED', 'NO_HELPER_FOUND')
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;
      } catch {}
    }
    const g = globalThis as any;
    const mem = (g.__swepyBookings as Map<string, any>) || new Map();
    return Array.from(mem.values())
      .filter((b: any) => b.customer_id === userId)
      .slice(0, limit);
  }

  async listHistoryForHelper(helperId: string, limit: number = 50): Promise<any[]> {
    if (process.env.USE_IN_MEMORY_DB !== 'true') {
      try {
        return await sql`
          SELECT * FROM bookings
          WHERE helper_id = ${helperId}
            AND status IN ('completed', 'cancelled', 'expired', 'CONFIRMED', 'NO_HELPER_FOUND')
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;
      } catch {}
    }
    const g = globalThis as any;
    const mem = (g.__swepyBookings as Map<string, any>) || new Map();
    return Array.from(mem.values())
      .filter((b: any) => b.helper_id === helperId)
      .slice(0, limit);
  }

  /* ── Cleanup ── */
  async cleanupOnComplete(orderId: string): Promise<void> {
    await liveLocationRepo.deleteLiveLocation(orderId).catch(() => {});
    await liveLocationRepo.deleteRoute(orderId).catch(() => {});
  }
}

/* ── Realtime push helper ── */
/**
 * Push a realtime event to connected clients via the demo_messages table.
 * Both apps poll GET /api/messages to receive these.
 */
export async function pushRealtimeEvent(payload: any): Promise<void> {
  const id = uuidv7();
  if (process.env.USE_IN_MEMORY_DB !== 'true') {
    try {
      await sql`
        INSERT INTO demo_messages (id, payload)
        VALUES (${id}, ${sql.json(payload)})
      `;
    } catch {
      console.warn("[Realtime] Failed to push event:", payload);
    }
  }
}

export const bookingService = new BookingService();
