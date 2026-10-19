import { sql } from '../db/client';
import { uuidv7 } from '../lib/id';
import { hmacHash } from '../lib/crypto';
import { ORDER_STATES, OFFER_STATUSES } from '../config/dispatch.config';

// Global in-memory cache for development/testing when external DB is offline
const g = globalThis as any;
if (!g.__swepyBookings) g.__swepyBookings = new Map<string, any>();
if (!g.__swepyOffers) g.__swepyOffers = new Map<string, any>();
if (!g.__swepyOrderEvents) g.__swepyOrderEvents = [];
if (!g.__swepyPlaintextOtps) g.__swepyPlaintextOtps = new Map<string, string>();

export interface OfferRecord {
  id: string;
  order_id: string;
  helper_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  wave: number;
  radius_km: number;
  eta_minutes: number;
  offered_at: string;
  expires_at: string;
  responded_at?: string | null;
  reject_reason?: string | null;
  distance_m?: number;
}

export interface OrderEventRecord {
  id: string;
  order_id: string;
  from_state: string | null;
  to_state: string;
  actor: string;
  timestamp: string;
  payload?: any;
}

export class BookingRepository {
  private memBookings = g.__swepyBookings as Map<string, any>;
  private memOffers = g.__swepyOffers as Map<string, OfferRecord>;
  private memOrderEvents = g.__swepyOrderEvents as OrderEventRecord[];
  private memPlaintextOtps = g.__swepyPlaintextOtps as Map<string, string>;

  clear(): void {
    this.memBookings.clear();
    this.memOffers.clear();
    this.memOrderEvents.length = 0;
    this.memPlaintextOtps.clear();
  }

  // --- Bookings ---

  async createBooking(data: any): Promise<any> {
    const id = data.id || uuidv7();
    const bookingNumber = data.bookingNumber || `SW${Date.now().toString(36).toUpperCase()}`;
    const lat = data.lat ?? data.user_lat ?? 28.6139;
    const lng = data.lng ?? data.user_lng ?? 77.2090;
    const addrSnapshot = data.addressSnapshot || {
      lat,
      lng,
      city_id: data.cityId || null,
      address_short: data.address_short || data.addressShort || 'Location',
      address_full: data.address_full || data.addressFull || 'Full Address',
    };

    const bookingRecord = {
      id,
      booking_number: bookingNumber,
      customer_id: data.customerId || data.customer_id,
      helper_id: null,
      address_id: data.addressId || null,
      address_snapshot: addrSnapshot,
      lat,
      lng,
      user_lat: lat,
      user_lng: lng,
      service_package_id: data.servicePackageId || null,
      service_code: data.serviceCode || data.service_code || 'deep_cleaning',
      home_size: data.homeSize || data.home_size || '1BHK',
      duration_min: data.durationMin || 60,
      status: ORDER_STATES.SEARCHING,
      dispatch_wave: 1,
      price_paise: data.pricePaise || (data.price ? data.price * 100 : 0),
      total_paise: data.pricePaise || (data.price ? data.price * 100 : 0),
      currency: 'INR',
      payment_mode: 'pay_after_service',
      start_code: null,
      start_code_attempts: 0,
      eta_minutes: null,
      customer_notes: data.customerNotes || data.notes || null,
      idempotency_key: data.idempotencyKey || null,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save in memory
    this.memBookings.set(id, bookingRecord);

    // Save in DB if available
    if (process.env.USE_IN_MEMORY_DB !== 'true') {
      try {
        const rows = await sql`
          INSERT INTO bookings (
            id, booking_number, customer_id, address_id, address_snapshot,
            service_package_id, service_code, home_size, duration_min,
            price_paise, total_paise, status, idempotency_key, customer_notes
          ) VALUES (
            ${id}, ${bookingNumber}, ${bookingRecord.customer_id}, ${data.addressId || null},
            ${sql.json(addrSnapshot)},
            ${data.servicePackageId || null}, ${bookingRecord.service_code},
            ${bookingRecord.home_size}, ${bookingRecord.duration_min},
            ${bookingRecord.price_paise}, ${bookingRecord.total_paise},
            'SEARCHING', ${data.idempotencyKey || null},
            ${bookingRecord.customer_notes}
          )
          RETURNING *
        `;
        if (rows && rows[0]) return rows[0];
      } catch {
        // DB offline, return in-memory record
      }
    }

    return bookingRecord;
  }

  async getBooking(id: string): Promise<any | null> {
    if (process.env.USE_IN_MEMORY_DB !== 'true') {
      try {
        const rows = await sql`SELECT * FROM bookings WHERE id = ${id}`;
        if (rows.length > 0) return rows[0];
      } catch {
        // DB offline
      }
    }
    return this.memBookings.get(id) || null;
  }

  async getBookingForUpdate(id: string): Promise<any | null> {
    if (process.env.USE_IN_MEMORY_DB !== 'true') {
      try {
        const rows = await sql`SELECT * FROM bookings WHERE id = ${id} FOR UPDATE`;
        if (rows.length > 0) return rows[0];
      } catch {
        // DB offline
      }
    }
    return this.memBookings.get(id) || null;
  }

  async updateBookingStatus(
    id: string,
    status: string,
    helperId?: string | null,
    extraFields?: Record<string, any>
  ): Promise<any> {
    const existing = this.memBookings.get(id) || {};
    const updated = {
      ...existing,
      status,
      helper_id: helperId !== undefined ? helperId : existing.helper_id,
      updated_at: new Date().toISOString(),
      version: (existing.version || 1) + 1,
      ...extraFields,
    };
    this.memBookings.set(id, updated);

    try {
      const rows = await sql`
        UPDATE bookings 
        SET status = ${status}, 
            helper_id = COALESCE(${helperId ?? null}, helper_id),
            version = version + 1,
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      if (rows && rows[0]) return rows[0];
    } catch {
      // DB offline
    }

    return updated;
  }

  // --- Plaintext OTP Storage (Customer-only, transient) ---

  savePlaintextOtp(bookingId: string, otp: string): void {
    this.memPlaintextOtps.set(bookingId, otp);
  }

  getPlaintextOtp(bookingId: string): string | null {
    return this.memPlaintextOtps.get(bookingId) || null;
  }

  clearPlaintextOtp(bookingId: string): void {
    this.memPlaintextOtps.delete(bookingId);
  }

  // --- Offers ---

  async createOfferRecord(offer: {
    order_id: string;
    helper_id: string;
    wave: number;
    radius_km: number;
    eta_minutes: number;
    expires_at: string;
    distance_m?: number;
  }): Promise<OfferRecord> {
    const id = uuidv7();
    const record: OfferRecord = {
      id,
      order_id: offer.order_id,
      helper_id: offer.helper_id,
      status: 'PENDING',
      wave: offer.wave,
      radius_km: offer.radius_km,
      eta_minutes: offer.eta_minutes,
      offered_at: new Date().toISOString(),
      expires_at: offer.expires_at,
      distance_m: offer.distance_m || 0,
      responded_at: null,
      reject_reason: null,
    };

    this.memOffers.set(id, record);

    try {
      await sql`
        INSERT INTO booking_offers (
          id, booking_id, helper_id, wave, status, radius_km, eta_minutes, expires_at, distance_m
        ) VALUES (
          ${id}, ${offer.order_id}, ${offer.helper_id}, ${offer.wave},
          'pending', ${offer.radius_km}, ${offer.eta_minutes}, ${new Date(offer.expires_at)}, ${offer.distance_m || 0}
        )
      `;
    } catch {
      // DB offline
    }

    return record;
  }

  async createOffer(offer: any): Promise<OfferRecord> {
    return this.createOfferRecord({
      order_id: offer.order_id || offer.orderId || offer.booking_id || offer.bookingId,
      helper_id: offer.helper_id || offer.helperId,
      wave: offer.wave ?? offer.wave_number ?? 1,
      radius_km: offer.radius_km ?? offer.radiusKm ?? 2.0,
      eta_minutes: offer.eta_minutes ?? offer.etaMinutes ?? 5,
      expires_at: typeof offer.expires_at === 'string' ? offer.expires_at : offer.expires_at?.toISOString() || new Date(Date.now() + 20000).toISOString(),
      distance_m: offer.distance_m ?? offer.distanceM ?? 0,
    });
  }

  async findOffersByBookingId(orderId: string): Promise<OfferRecord[]> {
    return this.getOffersForOrder(orderId);
  }

  async findBookingById(id: string): Promise<any> {
    return this.getBooking(id);
  }

  async getOffersForOrder(orderId: string): Promise<OfferRecord[]> {
    const offers: OfferRecord[] = [];
    for (const off of this.memOffers.values()) {
      if (off.order_id === orderId) offers.push(off);
    }
    return offers;
  }

  async getPendingOfferForHelper(helperId: string): Promise<OfferRecord | null> {
    const now = Date.now();
    for (const off of this.memOffers.values()) {
      if (off.helper_id === helperId && off.status === 'PENDING') {
        if (new Date(off.expires_at).getTime() > now) {
          return off;
        } else {
          off.status = 'EXPIRED';
        }
      }
    }
    return null;
  }

  async findPendingOffers(orderId: string): Promise<OfferRecord[]> {
    const now = Date.now();
    const result: OfferRecord[] = [];
    for (const off of this.memOffers.values()) {
      if (off.order_id === orderId && off.status === 'PENDING') {
        if (new Date(off.expires_at).getTime() > now) {
          result.push(off);
        } else {
          off.status = 'EXPIRED';
        }
      }
    }
    return result;
  }

  async findExpiredOffers(): Promise<OfferRecord[]> {
    const now = Date.now();
    const expired: OfferRecord[] = [];
    for (const off of this.memOffers.values()) {
      if (off.status === 'PENDING' && new Date(off.expires_at).getTime() <= now) {
        off.status = 'EXPIRED';
        expired.push(off);
      }
    }
    return expired;
  }

  async updateOfferStatus(
    offerId: string,
    status: 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED',
    reason?: string
  ): Promise<void> {
    const off = this.memOffers.get(offerId);
    if (off) {
      off.status = status;
      off.responded_at = new Date().toISOString();
      if (reason) off.reject_reason = reason;
    }

    try {
      await sql`
        UPDATE booking_offers
        SET status = ${status.toLowerCase()}, responded_at = NOW(), reject_reason = ${reason || null}
        WHERE id = ${offerId}
      `;
    } catch {
      // DB offline
    }
  }

  async cancelOtherOffers(orderId: string, winningHelperId: string): Promise<string[]> {
    const cancelledHelperIds: string[] = [];
    for (const off of this.memOffers.values()) {
      if (off.order_id === orderId && off.helper_id !== winningHelperId && off.status === 'PENDING') {
        off.status = 'CANCELLED';
        off.responded_at = new Date().toISOString();
        cancelledHelperIds.push(off.helper_id);
      }
    }

    try {
      await sql`
        UPDATE booking_offers
        SET status = 'cancelled', responded_at = NOW()
        WHERE booking_id = ${orderId} AND helper_id != ${winningHelperId} AND status = 'pending'
      `;
    } catch {
      // DB offline
    }

    return cancelledHelperIds;
  }

  async cancelAllOffersForOrder(orderId: string): Promise<string[]> {
    const affectedHelperIds: string[] = [];
    for (const off of this.memOffers.values()) {
      if (off.order_id === orderId && off.status === 'PENDING') {
        off.status = 'CANCELLED';
        off.responded_at = new Date().toISOString();
        affectedHelperIds.push(off.helper_id);
      }
    }

    try {
      await sql`
        UPDATE booking_offers
        SET status = 'cancelled', responded_at = NOW()
        WHERE booking_id = ${orderId} AND status = 'pending'
      `;
    } catch {
      // DB offline
    }

    return affectedHelperIds;
  }

  // --- Order Events Audit Logging ---

  async appendOrderEvent(
    orderId: string,
    fromState: string | null,
    toState: string,
    actor: string,
    payload?: any
  ): Promise<OrderEventRecord> {
    const id = uuidv7();
    const eventRecord: OrderEventRecord = {
      id,
      order_id: orderId,
      from_state: fromState,
      to_state: toState,
      actor,
      timestamp: new Date().toISOString(),
      payload: payload || null,
    };

    this.memOrderEvents.push(eventRecord);

    try {
      await sql`
        INSERT INTO order_events (id, order_id, from_state, to_state, actor, payload)
        VALUES (${id}, ${orderId}, ${fromState}, ${toState}, ${actor}, ${payload ? sql.json(payload) : null})
      `;
    } catch {
      // DB offline
    }

    return eventRecord;
  }

  async getOrderEvents(orderId: string): Promise<OrderEventRecord[]> {
    try {
      const rows = await sql<OrderEventRecord[]>`
        SELECT * FROM order_events WHERE order_id = ${orderId} ORDER BY timestamp ASC
      `;
      if (rows && rows.length > 0) return rows;
    } catch {
      // DB offline
    }
    return this.memOrderEvents.filter(e => e.order_id === orderId);
  }

  // --- Active Queries ---

  async findActiveForUser(userId: string): Promise<any | null> {
    // Check in-memory first
    for (const b of this.memBookings.values()) {
      if (b.customer_id === userId) {
        const s = String(b.status).toUpperCase();
        if (s === 'SEARCHING' || s === 'ACCEPTED' || s === 'CONFIRMED' || s === 'ON_THE_WAY') {
          return b;
        }
      }
    }

    try {
      const rows = await sql`
        SELECT * FROM bookings
        WHERE customer_id = ${userId}
          AND status IN ('SEARCHING', 'searching', 'ACCEPTED', 'accepted', 'CONFIRMED', 'confirmed', 'on_the_way')
        ORDER BY created_at DESC
        LIMIT 1
      `;
      if (rows.length > 0) return rows[0];
    } catch {
      // DB offline
    }

    return null;
  }

  async findActiveForHelper(helperId: string): Promise<any | null> {
    for (const b of this.memBookings.values()) {
      if (b.helper_id === helperId) {
        const s = String(b.status).toUpperCase();
        if (s === 'ACCEPTED' || s === 'CONFIRMED' || s === 'ON_THE_WAY') {
          return b;
        }
      }
    }

    try {
      const rows = await sql`
        SELECT * FROM bookings
        WHERE helper_id = ${helperId}
          AND status IN ('ACCEPTED', 'accepted', 'CONFIRMED', 'confirmed', 'on_the_way')
        ORDER BY created_at DESC
        LIMIT 1
      `;
      if (rows.length > 0) return rows[0];
    } catch {
      // DB offline
    }

    return null;
  }
}

export const bookingRepo = new BookingRepository();
