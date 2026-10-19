/**
 * Smart Dispatch Service
 *
 * Implements Phase 2 Smart Dispatch:
 * - 2.1 Helper Eligibility check (5 criteria)
 * - 2.2 ETA calculation via canonical estimateEtaMinutes()
 * - 2.3 Radius expansion in waves: [2.0, 2.5, 3.5, 5.0] km, top 3, 20s TTL, 25min cap
 * - 2.4 Offer records persistence with sweeper recovery
 * - 2.5 Race-safe accept
 * - 2.6 Reject and cancel handling
 */

import { bookingRepo, OfferRecord } from '../repositories/booking.repository';
import { helperRepo, HelperRecord } from '../repositories/helper.repository';
import { bookingService } from './booking.service';
import { realtimeEvents } from '../lib/realtime-events';
import { haversineMeters, estimateEtaMinutes } from '../lib/geo';
import {
  DISPATCH_CONFIG,
  ORDER_STATES,
} from '../config/dispatch.config';

export class DispatchService {
  // Excluded helper tracking: order_id -> Set of helper_ids (rejected, timed out, or cancelled)
  private orderExclusions = new Map<string, Set<string>>();

  // Active search start timestamps: order_id -> timestamp ms
  private orderSearchStart = new Map<string, number>();

  // Active wave timers: order_id -> NodeJS.Timeout
  private waveTimers = new Map<string, ReturnType<typeof setTimeout>>();

  /**
   * 2.1 Helper eligibility check. A helper is eligible only if ALL are true:
   * 1. online and available
   * 2. no active order
   * 3. no pending offer from another order (at most one live offer at a time)
   * 4. last location update is fresh (at most 30 seconds old)
   * 5. not already rejected, timed out on, or excluded for this order
   */
  async isHelperEligible(helper: HelperRecord, orderId: string): Promise<boolean> {
    // 1. Online and active
    if (!helper.is_online || helper.status !== 'active') {
      return false;
    }

    // 2. No active order
    const hasActive = await helperRepo.hasActiveBooking(helper.user_id);
    if (hasActive) {
      return false;
    }

    // 3. No pending offer from another order (helper holds at most ONE live offer at a time)
    const existingOffer = await bookingRepo.getPendingOfferForHelper(helper.user_id);
    if (existingOffer && existingOffer.order_id !== orderId) {
      return false;
    }

    // 4. Last location update is fresh (at most 30 seconds old)
    if (!helper.last_lat || !helper.last_lng || !helper.last_location_at) {
      return false;
    }
    const locationAgeMs = Date.now() - new Date(helper.last_location_at).getTime();
    if (locationAgeMs > DISPATCH_CONFIG.HELPER_LOCATION_STALE_SECONDS * 1000) {
      return false;
    }

    // 5. Not already rejected, timed out on, or excluded for this order
    const exclusions = this.orderExclusions.get(orderId);
    if (exclusions && exclusions.has(helper.user_id)) {
      return false;
    }

    return true;
  }

  /**
   * Exclude a helper for an order
   */
  excludeHelper(orderId: string, helperId: string): void {
    if (!this.orderExclusions.has(orderId)) {
      this.orderExclusions.set(orderId, new Set());
    }
    this.orderExclusions.get(orderId)!.add(helperId);
  }

  async getEligibleHelpers(orderId: string, radiusKm: number): Promise<Array<any>> {
    const order = await bookingRepo.getBooking(orderId);
    if (!order) return [];

    const userLat = order.address_snapshot?.lat || order.lat || 28.6139;
    const userLng = order.address_snapshot?.lng || order.lng || 77.2090;

    const allHelpers = await helperRepo.getOnlineHelpersInCity(order.address_snapshot?.city_id);
    const eligible: Array<any> = [];

    for (const helper of allHelpers) {
      const isEligible = await this.isHelperEligible(helper, orderId);
      if (!isEligible) continue;

      const hLat = helper.last_lat!;
      const hLng = helper.last_lng!;

      const distanceM = haversineMeters({ lat: userLat, lng: userLng }, { lat: hLat, lng: hLng });
      if (distanceM > radiusKm * 1000) continue;

      const etaMinutes = estimateEtaMinutes(
        { lat: hLat, lng: hLng },
        { lat: userLat, lng: userLng },
        DISPATCH_CONFIG.SPEED_KMPH,
        DISPATCH_CONFIG.ROAD_DETOUR_FACTOR
      );

      if (etaMinutes > DISPATCH_CONFIG.MAX_ETA_MINUTES) continue;

      eligible.push({
        ...helper,
        id: helper.user_id,
        distanceM,
        etaMinutes,
      });
    }

    return eligible;
  }

  /**
   * Start dispatching an order from wave 1 (radius step 0: 2.0 km)
   */
  async startDispatch(orderId: string): Promise<any> {
    this.orderSearchStart.set(orderId, Date.now());
    return await this.dispatchWave(orderId, 1);
  }

  /**
   * 2.3 Dispatch Wave Algorithm:
   * 1. Start with radius step (2.0 km, 2.5 km, 3.5 km, 5.0 km)
   * 2. Bounding-box prefilter first, then exact Haversine distance
   * 3. Sort by ETA ascending via estimateEtaMinutes()
   * 4. Filter out any candidate with ETA > MAX_ETA_MINUTES (25 min)
   * 5. Offer to top OFFERS_PER_WAVE (3) helpers simultaneously with OFFER_TTL_SECONDS (20s)
   * 6. If radius has 0 eligible helpers, jump to next radius immediately without waiting
   * 7. If all steps used or MAX_SEARCH_SECONDS (120s) passes: set NO_HELPER_FOUND
   */
  async dispatchWave(orderId: string, waveOrRadiusIdx: number = 1): Promise<{
    status: 'OFFERED' | 'NO_HELPER_FOUND' | 'TERMINATED';
    wave: number;
    radiusKm?: number;
    offersSent: number;
    offeredHelperIds: string[];
  }> {
    // Clear any previous wave timer for this order
    if (this.waveTimers.has(orderId)) {
      clearTimeout(this.waveTimers.get(orderId)!);
      this.waveTimers.delete(orderId);
    }

    const order = await bookingRepo.getBooking(orderId);
    if (!order) {
      return { status: 'TERMINATED', wave: 0, offersSent: 0, offeredHelperIds: [] };
    }

    const currentStatus = bookingService.normalizeStatus(order.status);
    if (currentStatus !== ORDER_STATES.SEARCHING) {
      if (currentStatus === ORDER_STATES.NO_HELPER_FOUND) {
        return { status: 'NO_HELPER_FOUND', wave: 0, offersSent: 0, offeredHelperIds: [] };
      }
      return { status: 'TERMINATED', wave: 0, offersSent: 0, offeredHelperIds: [] };
    }

    // Normalize wave: if waveOrRadiusIdx <= 1 -> wave 1, index 0
    const waveNumber = waveOrRadiusIdx <= 1 ? 1 : waveOrRadiusIdx;
    const radiusIdx = waveNumber - 1;

    // Check overall search timeout (MAX_SEARCH_SECONDS = 120)
    const startTime = this.orderSearchStart.get(orderId) || Date.now();
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    if (elapsedSeconds >= DISPATCH_CONFIG.MAX_SEARCH_SECONDS) {
      await bookingService.setNoHelperFound(orderId, 'Search timeout reached (120 seconds)');
      return { status: 'NO_HELPER_FOUND', wave: waveNumber, offersSent: 0, offeredHelperIds: [] };
    }

    // Check if all radius steps are exhausted
    if (radiusIdx >= DISPATCH_CONFIG.RADIUS_STEPS_KM.length) {
      await bookingService.setNoHelperFound(orderId, 'All search radius steps exhausted without helper accept');
      return { status: 'NO_HELPER_FOUND', wave: waveNumber, offersSent: 0, offeredHelperIds: [] };
    }

    const radiusKm = DISPATCH_CONFIG.RADIUS_STEPS_KM[radiusIdx];
    const userLat = order.address_snapshot?.lat || order.lat || 28.6139;
    const userLng = order.address_snapshot?.lng || order.lng || 77.2090;

    // Update searching status for user UI
    await realtimeEvents.emitSearchingUpdate({
      order_id: orderId,
      customer_id: order.customer_id,
      wave: waveNumber,
      radius_km: radiusKm,
    });

    // 1. Get all online helpers
    const allHelpers = await helperRepo.getOnlineHelpersInCity(order.address_snapshot?.city_id);

    // 2. Bounding box prefilter
    // 1 degree lat ≈ 111 km. 1 degree lng ≈ 111 * cos(lat) km.
    const deltaLat = radiusKm / 111.0;
    const cosLat = Math.cos((userLat * Math.PI) / 180);
    const deltaLng = radiusKm / (111.0 * Math.max(0.2, Math.abs(cosLat)));

    const minLat = userLat - deltaLat;
    const maxLat = userLat + deltaLat;
    const minLng = userLng - deltaLng;
    const maxLng = userLng + deltaLng;

    // 3. Exact distance + eligibility filter
    const candidateHelpers: Array<{
      helper: HelperRecord;
      distanceM: number;
      etaMinutes: number;
    }> = [];

    for (const helper of allHelpers) {
      const isEligible = await this.isHelperEligible(helper, orderId);
      if (!isEligible) continue;

      const hLat = helper.last_lat!;
      const hLng = helper.last_lng!;

      // Bounding box check
      if (hLat < minLat || hLat > maxLat || hLng < minLng || hLng > maxLng) {
        continue;
      }

      // Exact Haversine distance
      const distanceM = haversineMeters({ lat: userLat, lng: userLng }, { lat: hLat, lng: hLng });
      if (distanceM > radiusKm * 1000) {
        continue;
      }

      // 2.2 Canonical ETA estimate
      const etaMinutes = estimateEtaMinutes(
        { lat: hLat, lng: hLng },
        { lat: userLat, lng: userLng },
        DISPATCH_CONFIG.SPEED_KMPH,
        DISPATCH_CONFIG.ROAD_DETOUR_FACTOR
      );

      // Hard cap: never offer to helper whose ETA exceeds MAX_ETA_MINUTES (25)
      if (etaMinutes > DISPATCH_CONFIG.MAX_ETA_MINUTES) {
        continue;
      }

      candidateHelpers.push({ helper, distanceM, etaMinutes });
    }

    // 4. If radius has zero eligible helpers, jump to next radius immediately without waiting
    if (candidateHelpers.length === 0) {
      return await this.dispatchWave(orderId, waveNumber + 1);
    }

    // 5. Sort by ETA ascending
    candidateHelpers.sort((a, b) => a.etaMinutes - b.etaMinutes);

    // 6. Offer to top OFFERS_PER_WAVE (3) helpers at the same time
    const waveCandidates = candidateHelpers.slice(0, DISPATCH_CONFIG.OFFERS_PER_WAVE);
    const expiresAt = new Date(Date.now() + DISPATCH_CONFIG.OFFER_TTL_SECONDS * 1000).toISOString();

    for (const cand of waveCandidates) {
      const offer = await bookingRepo.createOfferRecord({
        order_id: orderId,
        helper_id: cand.helper.user_id,
        wave: waveNumber,
        radius_km: radiusKm,
        eta_minutes: cand.etaMinutes,
        expires_at: expiresAt,
        distance_m: cand.distanceM,
      });

      // Emit order:offer to helper
      await realtimeEvents.emitOrderOffer({
        order_id: orderId,
        helper_id: cand.helper.user_id,
        address_summary: order.address_snapshot?.address_short || order.address_snapshot?.locality || 'Customer Location',
        eta_minutes: cand.etaMinutes,
        expires_at: expiresAt,
        wave: waveNumber,
        radius_km: radiusKm,
        service_name: order.service_code || 'Home Cleaning',
        home_size: order.home_size || '1 BHK',
        price_paise: order.total_paise || order.price_paise,
      });
    }

    // 7. Schedule wave timeout timer (20s)
    const timer = setTimeout(async () => {
      await this.handleWaveTimeout(orderId, waveNumber);
    }, DISPATCH_CONFIG.OFFER_TTL_SECONDS * 1000);
    if (timer.unref) timer.unref();

    this.waveTimers.set(orderId, timer);

    return {
      status: 'OFFERED',
      wave: waveNumber,
      radiusKm,
      offersSent: waveCandidates.length,
      offeredHelperIds: waveCandidates.map(c => c.helper.user_id),
    };
  }

  /**
   * Handle wave timeout: mark pending offers as EXPIRED and advance to next radius step
   */
  async handleWaveTimeout(orderId: string, currentWaveNumber: number): Promise<void> {
    const order = await bookingRepo.getBooking(orderId);
    if (!order) return;

    if (bookingService.normalizeStatus(order.status) !== ORDER_STATES.SEARCHING) {
      return; // Order resolved
    }

    // Expire remaining pending offers for this wave and exclude those helpers
    const pendingOffers = await bookingRepo.findPendingOffers(orderId);
    for (const off of pendingOffers) {
      await bookingRepo.updateOfferStatus(off.id, 'EXPIRED');
      this.excludeHelper(orderId, off.helper_id);
      await realtimeEvents.emitOrderOfferExpired({
        order_id: orderId,
        helper_id: off.helper_id,
      });
    }

    // Advance to next radius step
    await this.dispatchWave(orderId, currentWaveNumber + 1);
  }

  /**
   * 2.5 Race-Safe Accept
   * The first helper wins. Losers get clean "order already taken / offer expired" response.
   */
  async acceptOffer(orderId: string, helperId: string): Promise<{ success: boolean; order?: any; booking?: any; reason?: string; error?: string }> {
    try {
      const result = await bookingService.accept(orderId, helperId);

      // Clear search start & wave timer
      if (this.waveTimers.has(orderId)) {
        clearTimeout(this.waveTimers.get(orderId)!);
        this.waveTimers.delete(orderId);
      }
      this.orderSearchStart.delete(orderId);

      return { success: true, order: result.order, booking: result.order };
    } catch (err: any) {
      const reason = err.message?.includes('expired') ? 'OFFER_EXPIRED' : 'ORDER_ALREADY_TAKEN';
      return { success: false, reason, error: err.message || 'Order already taken / offer expired', booking: null };
    }
  }

  /**
   * 2.6 Reject Handling
   * Helper rejects: mark offer REJECTED, exclude helper, continue wave or jump to next step
   */
  async handleOfferRejection(orderId: string, helperId: string, reason?: string): Promise<void> {
    return this.rejectOffer(orderId, helperId, reason);
  }

  async rejectOffer(orderId: string, helperId: string, reason?: string): Promise<void> {
    const offers = await bookingRepo.getOffersForOrder(orderId);
    const helperOffer = offers.find(o => o.helper_id === helperId && o.status === 'PENDING');
    if (helperOffer) {
      await bookingRepo.updateOfferStatus(helperOffer.id, 'REJECTED', reason);
    }

    // Exclude helper from this order
    this.excludeHelper(orderId, helperId);

    // Check if any offers are still pending in this wave
    const pending = await bookingRepo.findPendingOffers(orderId);
    if (pending.length === 0) {
      // All offers in current wave rejected/expired
      const order = await bookingRepo.getBooking(orderId);
      if (order && bookingService.normalizeStatus(order.status) === ORDER_STATES.SEARCHING) {
        const nextWaveIdx = (helperOffer?.wave || 1); // move to next step
        await this.dispatchWave(orderId, nextWaveIdx);
      }
    }
  }

  /**
   * Helper cancels after ACCEPTED:
   * Free helper, exclude them, notify user, and restart dispatch from wave 1 (radius 2.0 km)
   */
  async handleHelperCancelledAfterAccept(orderId: string, helperId: string, reason?: string): Promise<void> {
    // 1. Cancel in bookingService (reverts to SEARCHING)
    const result = await bookingService.cancel(orderId, helperId, 'helper', reason);

    // 2. Add helper to exclusion list so they aren't re-offered
    this.excludeHelper(orderId, helperId);

    // 3. Restart dispatch from first radius step (2.0 km)
    await this.startDispatch(orderId);
  }

  /**
   * User cancels during SEARCHING:
   * Cancel all offers, notify helpers, transition to CANCELLED
   */
  async handleUserCancelled(orderId: string, userId: string, reason?: string): Promise<any> {
    if (this.waveTimers.has(orderId)) {
      clearTimeout(this.waveTimers.get(orderId)!);
      this.waveTimers.delete(orderId);
    }
    this.orderSearchStart.delete(orderId);

    return await bookingService.cancel(orderId, userId, 'customer', reason);
  }
}

export const dispatchService = new DispatchService();
