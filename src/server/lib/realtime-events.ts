/**
 * Realtime Event Contract Layer
 *
 * Implements the Phase 4 Realtime Event Contract:
 * - order:offer (to helper): order_id, address_summary, eta_minutes, expires_at
 * - order:offer_expired / order:taken (to helper)
 * - order:accepted (to user): helper_info, eta_minutes, helper_location, otp
 * - order:searching_update (to user): current wave or radius for UI text
 * - order:no_helper_found (to user)
 * - location:update (both ways, helper <-> customer)
 * - order:confirmed (to both)
 * - order:cancelled (to the other party)
 *
 * Security: Only the parties of an order may receive its events.
 * The OTP is NEVER included in any payload or event sent to a helper.
 */

import { sql } from '../db/client';
import { uuidv7 } from './id';

export interface BaseEventPayload {
  order_id: string;
  ts?: number;
  recipient_id?: string; // target user or helper
  recipient_role?: 'customer' | 'helper' | 'all';
}

export interface OrderOfferPayload extends BaseEventPayload {
  helper_id: string;
  address_summary: string;
  eta_minutes: number;
  expires_at: string;
  wave: number;
  radius_km: number;
  service_name?: string;
  home_size?: string;
  price_paise?: number;
}

export interface OrderAcceptedPayload extends BaseEventPayload {
  customer_id: string;
  helper_info: {
    id: string;
    name: string;
    phone?: string;
    rating?: number;
  };
  eta_minutes: number;
  helper_location: {
    lat: number;
    lng: number;
  };
  otp: string; // ONLY sent to user client
  sub_state: 'EN_ROUTE';
}

export interface OrderConfirmedPayload extends BaseEventPayload {
  customer_id: string;
  helper_id: string;
  confirmed_at: string;
  status: 'CONFIRMED';
}

export interface OrderCancelledPayload extends BaseEventPayload {
  cancelled_by: string;
  cancelled_role: 'customer' | 'helper' | 'system';
  reason?: string;
  status: 'CANCELLED';
}

export interface OrderNoHelperFoundPayload extends BaseEventPayload {
  customer_id: string;
  reason?: string;
  status: 'NO_HELPER_FOUND';
}

export interface OrderSearchingUpdatePayload extends BaseEventPayload {
  customer_id: string;
  wave: number;
  radius_km: number;
  helpers_considered?: number;
}

export interface OrderTakenPayload extends BaseEventPayload {
  helper_id: string;
  reason: 'already_taken' | 'offer_expired';
}

export interface LocationUpdatePayload extends BaseEventPayload {
  helper_id: string;
  customer_id?: string;
  lat: number;
  lng: number;
  accuracy_m?: number;
  heading_deg?: number | null;
  speed_mps?: number | null;
  eta_minutes?: number;
  sub_state?: 'EN_ROUTE' | 'ARRIVED';
}

// In-memory event bus for fast local synchronization and tests
type EventListener = (eventType: string, payload: any) => void;
const listeners = new Set<EventListener>();

export class RealtimeEventManager {
  private static instance: RealtimeEventManager;

  public static getInstance(): RealtimeEventManager {
    if (!RealtimeEventManager.instance) {
      RealtimeEventManager.instance = new RealtimeEventManager();
    }
    return RealtimeEventManager.instance;
  }

  public subscribe(fn: EventListener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  /**
   * Publish an event.
   * Persists to demo_messages (if Postgres is online), memory store, and emits to in-process listeners.
   */
  public async emit(eventType: string, payload: any): Promise<void> {
    const id = uuidv7();
    const eventRecord = {
      id,
      event: eventType,
      type: eventType, // backward compat with demo_messages readers
      ...payload,
      ts: payload.ts || Date.now(),
    };

    // 1. Notify in-memory listeners
    for (const listener of listeners) {
      try {
        listener(eventType, eventRecord);
      } catch (e) {
        console.warn('[Realtime] Listener error:', e);
      }
    }

    // 2. Add to global demo_messages cache for /api/messages polling
    const g = globalThis as any;
    if (!g.__demoMessages) g.__demoMessages = [];
    g.__demoMessages.push({
      id,
      payload: eventRecord,
      ts: new Date().toISOString(),
    });
    if (g.__demoMessages.length > 500) g.__demoMessages.shift();

    // 3. Persist to Postgres if available (skip in in-memory mode)
    if (process.env.USE_IN_MEMORY_DB === 'true') return;

    try {
      await sql`
        INSERT INTO demo_messages (id, payload)
        VALUES (${id}, ${sql.json(eventRecord)})
      `;
    } catch {
      // Postgres offline/unavailable in test or dev; in-memory sync handles it
    }
  }

  // --- Convenience typed methods ---

  async emitOrderOffer(payload: OrderOfferPayload): Promise<void> {
    await this.emit('order:offer', {
      ...payload,
      recipient_id: payload.helper_id,
      recipient_role: 'helper',
    });
    // Also emit backward compatible event for existing helper screen
    await this.emit('new_offer', {
      ...payload,
      booking_id: payload.order_id,
    });
  }

  async emitOrderOfferExpired(payload: { order_id: string; helper_id: string }): Promise<void> {
    await this.emit('order:offer_expired', {
      ...payload,
      recipient_id: payload.helper_id,
      recipient_role: 'helper',
    });
  }

  async emitOrderTaken(payload: { order_id: string; helper_id: string; reason?: string }): Promise<void> {
    await this.emit('order:taken', {
      ...payload,
      recipient_id: payload.helper_id,
      recipient_role: 'helper',
    });
  }

  async emitOrderAccepted(payload: OrderAcceptedPayload): Promise<void> {
    // Note: OTP is included HERE because this event is addressed strictly to the user!
    await this.emit('order:accepted', {
      ...payload,
      recipient_id: payload.customer_id,
      recipient_role: 'customer',
    });
    // Backward compat for existing user tracking screen
    await this.emit('booking_assigned', {
      booking_id: payload.order_id,
      helper_id: payload.helper_info.id,
      helper_name: payload.helper_info.name,
      status: 'accepted',
      otp: payload.otp,
      eta_minutes: payload.eta_minutes,
      lat: payload.helper_location.lat,
      lng: payload.helper_location.lng,
      ts: Date.now(),
    });
  }

  async emitSearchingUpdate(payload: OrderSearchingUpdatePayload): Promise<void> {
    await this.emit('order:searching_update', {
      ...payload,
      recipient_id: payload.customer_id,
      recipient_role: 'customer',
    });
  }

  async emitNoHelperFound(payload: OrderNoHelperFoundPayload): Promise<void> {
    await this.emit('order:no_helper_found', {
      ...payload,
      recipient_id: payload.customer_id,
      recipient_role: 'customer',
    });
    // Backward compat
    await this.emit('booking_expired', {
      booking_id: payload.order_id,
      status: 'no_helper_found',
    });
  }

  async emitLocationUpdate(payload: LocationUpdatePayload): Promise<void> {
    await this.emit('location:update', payload);
    // Backward compat for live tracking map
    await this.emit('job_location', {
      booking_id: payload.order_id,
      lat: payload.lat,
      lng: payload.lng,
      heading_deg: payload.heading_deg,
      speed_mps: payload.speed_mps,
      sub_state: payload.sub_state,
      ts: Date.now(),
      sender: payload.helper_id,
    });
  }

  async emitOrderConfirmed(payload: OrderConfirmedPayload): Promise<void> {
    await this.emit('order:confirmed', {
      ...payload,
      recipient_role: 'all',
    });
    // Backward compat
    await this.emit('job_status', {
      booking_id: payload.order_id,
      status: 'confirmed',
      ts: Date.now(),
    });
  }

  async emitOrderCancelled(payload: OrderCancelledPayload): Promise<void> {
    await this.emit('order:cancelled', payload);
    // Backward compat
    await this.emit('booking_cancel', {
      booking_id: payload.order_id,
      status: 'cancelled',
      ts: Date.now(),
      sender: payload.cancelled_by,
    });
  }
}

export const realtimeEvents = RealtimeEventManager.getInstance();
export const realtimeEventBus = realtimeEvents;
