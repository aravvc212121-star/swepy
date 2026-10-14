/**
 * BookingService — single source of truth for order state machine.
 *
 * State machine:
 *   searching → accepted → on_the_way → completed
 *   searching / accepted / on_the_way → cancelled
 *   searching → expired
 *
 * Every transition is validated: correct actor, correct current status, atomic.
 */

import { sql } from "../db/client";
import { uuidv7, generateStartCode } from "../lib/id";
import { hmacHash } from "../lib/crypto";
import { liveLocationRepo } from "../repositories/live-location.repository";

/* ── Status values (matching frontend) ── */
export type OrderStatus =
  | "searching"
  | "accepted"
  | "on_the_way"
  | "completed"
  | "cancelled"
  | "expired";

/* ── Allowed transitions: from → { to: allowedActorRoles[] } ── */
const TRANSITIONS: Record<string, Record<string, string[]>> = {
  searching: {
    accepted: ["helper"],
    cancelled: ["customer", "system"],
    expired: ["system"],
  },
  accepted: {
    on_the_way: ["helper"],
    cancelled: ["customer", "helper"],
    searching: ["system"], // helper released, put back to searching
  },
  on_the_way: {
    completed: ["system"], // only via OTP verification
    cancelled: ["customer", "helper"],
  },
  completed: {},
  cancelled: {},
  expired: {},
};

const ACTIVE_STATUSES = ["searching", "accepted", "on_the_way"];
const TRACKING_STATUSES = ["accepted", "on_the_way"]; // what the tracking page shows
const SHARING_STATUSES = ["accepted", "on_the_way"]; // when location sharing is on
const TERMINAL_STATUSES = ["completed", "cancelled", "expired"];
const MAX_OTP_ATTEMPTS = 5;
const OTP_LOCKOUT_MS = 3 * 60 * 1000; // 3 minutes

export class BookingService {
  /* ── CREATE BOOKING ── */
  async createBooking(data: {
    customerId: string;
    addressId?: string;
    addressSnapshot?: any;
    servicePackageId?: string;
    serviceCode?: string;
    homeSize?: string;
    durationMin?: number;
    pricePaise?: number;
    lat: number;
    lng: number;
    customerNotes?: string;
    idempotencyKey?: string;
    cityId?: string;
  }): Promise<any> {
    // Idempotency: if same key exists, return that booking
    if (data.idempotencyKey) {
      const existing = await sql`
        SELECT * FROM bookings
        WHERE idempotency_key = ${data.idempotencyKey}
        LIMIT 1
      `;
      if (existing.length > 0) return existing[0];
    }

    // One active order per user: return existing if any
    const active = await this.findActiveForUser(data.customerId);
    if (active) return active;

    const id = uuidv7();
    const bookingNumber = `SW${Date.now().toString(36).toUpperCase()}`;
    const addrSnapshot = data.addressSnapshot || {
      lat: data.lat,
      lng: data.lng,
      city_id: data.cityId || null,
    };

    const rows = await sql`
      INSERT INTO bookings (
        id, booking_number, customer_id, address_id, address_snapshot,
        service_package_id, service_code, home_size, duration_min,
        price_paise, total_paise, status, idempotency_key, customer_notes
      ) VALUES (
        ${id}, ${bookingNumber}, ${data.customerId},
        ${data.addressId || null}, ${sql.json(addrSnapshot)},
        ${data.servicePackageId || null}, ${data.serviceCode || null},
        ${data.homeSize || null}, ${data.durationMin || null},
        ${data.pricePaise || 0}, ${data.pricePaise || 0},
        'searching', ${data.idempotencyKey || null},
        ${data.customerNotes || null}
      )
      RETURNING *
    `;

    await this._appendEvent(
      id, "booking_created", null, "searching",
      data.customerId, "customer", null,
    );

    return rows[0];
  }

  /* ── ACCEPT (helper accepts offer) ── */
  async accept(bookingId: string, helperId: string): Promise<any> {
    return sql.begin(async (tx) => {
      // 1. Lock booking row
      const bookingRows = await tx`
        SELECT * FROM bookings WHERE id = ${bookingId} FOR UPDATE
      `;
      const booking = bookingRows[0];
      if (!booking) throw new Error("Booking not found");

      // Idempotent: if already accepted by this helper, return it
      if (booking.status === "accepted" && booking.helper_id === helperId) {
        return booking;
      }

      this._validateTransition(booking.status, "accepted", "helper");

      // 2. Check helper doesn't have another active booking
      const helperActive = await tx`
        SELECT id FROM bookings
        WHERE helper_id = ${helperId}
          AND status IN ('accepted', 'on_the_way')
        LIMIT 1
      `;
      if (helperActive.length > 0) {
        throw new Error("Helper already has an active booking");
      }

      // 3. Mark this offer as accepted (if offers table is used)
      try {
        await tx`
          UPDATE booking_offers
          SET status = 'accepted', responded_at = NOW()
          WHERE booking_id = ${bookingId}
            AND helper_id = ${helperId}
            AND status = 'pending'
        `;
        // Cancel other pending offers
        await tx`
          UPDATE booking_offers
          SET status = 'cancelled'
          WHERE booking_id = ${bookingId}
            AND helper_id != ${helperId}
            AND status = 'pending'
        `;
      } catch {
        // booking_offers table may not exist in dev
      }

      // 4. Generate OTP (4-digit start code)
      const startCode = generateStartCode();
      const startCodeHash = hmacHash(startCode);

      // 5. Update booking atomically
      const updated = await tx`
        UPDATE bookings
        SET status = 'accepted',
            helper_id = ${helperId},
            assigned_at = NOW(),
            start_code = ${startCodeHash},
            start_code_attempts = 0,
            version = version + 1,
            updated_at = NOW()
        WHERE id = ${bookingId}
          AND status = 'searching'
        RETURNING *
      `;

      if (updated.length === 0) {
        throw new Error("Booking already accepted by another helper (race condition)");
      }

      // 6. Audit event
      const eventId = uuidv7();
      await tx`
        INSERT INTO booking_events (id, booking_id, event_type, from_status, to_status, actor_user_id, actor_role)
        VALUES (${eventId}, ${bookingId}, 'helper_accepted', 'searching', 'accepted', ${helperId}, 'helper')
      `;

      // Return booking with plaintext OTP (for the API to decide who gets it)
      const result = updated[0];
      result._plaintext_otp = startCode; // transient, not stored
      return result;
    });
  }

  /* ── START TRIP (accepted → on_the_way) ── */
  async startTrip(bookingId: string, helperId: string): Promise<any> {
    return sql.begin(async (tx) => {
      const bookingRows = await tx`
        SELECT * FROM bookings WHERE id = ${bookingId} FOR UPDATE
      `;
      const booking = bookingRows[0];
      if (!booking) throw new Error("Booking not found");

      // Idempotent: already on_the_way by this helper
      if (booking.status === "on_the_way" && booking.helper_id === helperId) {
        return booking;
      }

      if (booking.helper_id !== helperId) {
        throw new Error("Only the assigned helper can start the trip");
      }

      this._validateTransition(booking.status, "on_the_way", "helper");

      const updated = await tx`
        UPDATE bookings
        SET status = 'on_the_way',
            started_at = NOW(),
            version = version + 1,
            updated_at = NOW()
        WHERE id = ${bookingId}
          AND status = 'accepted'
          AND helper_id = ${helperId}
        RETURNING *
      `;

      if (updated.length === 0) {
        throw new Error("Failed to start trip — booking state changed concurrently");
      }

      const eventId = uuidv7();
      await tx`
        INSERT INTO booking_events (id, booking_id, event_type, from_status, to_status, actor_user_id, actor_role)
        VALUES (${eventId}, ${bookingId}, 'trip_started', 'accepted', 'on_the_way', ${helperId}, 'helper')
      `;

      return updated[0];
    });
  }

  /* ── VERIFY OTP (on_the_way → completed) ── */
  async verifyOtp(
    bookingId: string,
    helperId: string,
    code: string,
  ): Promise<{ booking: any; valid: boolean; attemptsLeft: number; locked: boolean }> {
    return sql.begin(async (tx) => {
      const bookingRows = await tx`
        SELECT * FROM bookings WHERE id = ${bookingId} FOR UPDATE
      `;
      const booking = bookingRows[0];
      if (!booking) throw new Error("Booking not found");

      if (booking.helper_id !== helperId) {
        throw new Error("Only the assigned helper can verify OTP");
      }

      if (booking.status !== "on_the_way") {
        throw new Error(`OTP verification only allowed in on_the_way status, current: ${booking.status}`);
      }

      // Check lockout
      const attempts = booking.start_code_attempts || 0;
      if (attempts >= MAX_OTP_ATTEMPTS) {
        // Check if lockout period has passed
        const lastAttemptEvent = await tx`
          SELECT created_at FROM booking_events
          WHERE booking_id = ${bookingId}
            AND event_type = 'otp_attempt_failed'
          ORDER BY created_at DESC
          LIMIT 1
        `;
        if (lastAttemptEvent.length > 0) {
          const lastAttemptTime = new Date(lastAttemptEvent[0].created_at).getTime();
          if (Date.now() - lastAttemptTime < OTP_LOCKOUT_MS) {
            return { booking, valid: false, attemptsLeft: 0, locked: true };
          }
          // Lockout expired, reset attempts
          await tx`
            UPDATE bookings SET start_code_attempts = 0 WHERE id = ${bookingId}
          `;
        }
      }

      // Verify the code
      const codeHash = hmacHash(code);
      if (booking.start_code !== codeHash) {
        // Wrong code
        const newAttempts = (booking.start_code_attempts || 0) + 1;
        await tx`
          UPDATE bookings
          SET start_code_attempts = ${newAttempts}, updated_at = NOW()
          WHERE id = ${bookingId}
        `;

        const failEventId = uuidv7();
        await tx`
          INSERT INTO booking_events (id, booking_id, event_type, from_status, to_status, actor_user_id, actor_role, payload)
          VALUES (${failEventId}, ${bookingId}, 'otp_attempt_failed', 'on_the_way', 'on_the_way', ${helperId}, 'helper',
            ${sql.json({ attempt: newAttempts })})
        `;

        return {
          booking,
          valid: false,
          attemptsLeft: Math.max(0, MAX_OTP_ATTEMPTS - newAttempts),
          locked: newAttempts >= MAX_OTP_ATTEMPTS,
        };
      }

      // ── Correct OTP → complete the order in ONE transaction ──
      const updated = await tx`
        UPDATE bookings
        SET status = 'completed',
            completed_at = NOW(),
            start_code = NULL,
            start_code_attempts = 0,
            version = version + 1,
            updated_at = NOW()
        WHERE id = ${bookingId}
          AND status = 'on_the_way'
        RETURNING *
      `;

      if (updated.length === 0) {
        throw new Error("Failed to complete booking — state changed concurrently");
      }

      // Audit
      const eventId = uuidv7();
      await tx`
        INSERT INTO booking_events (id, booking_id, event_type, from_status, to_status, actor_user_id, actor_role)
        VALUES (${eventId}, ${bookingId}, 'otp_verified', 'on_the_way', 'completed', ${helperId}, 'helper')
      `;

      return { booking: updated[0], valid: true, attemptsLeft: 0, locked: false };
    });
  }

  /* ── CANCEL ── */
  async cancel(
    bookingId: string,
    actorId: string,
    actorRole: "customer" | "helper" | "system",
    reason?: string,
  ): Promise<any> {
    return sql.begin(async (tx) => {
      const bookingRows = await tx`
        SELECT * FROM bookings WHERE id = ${bookingId} FOR UPDATE
      `;
      const booking = bookingRows[0];
      if (!booking) throw new Error("Booking not found");

      // Idempotent
      if (booking.status === "cancelled") return booking;

      // Validate actor
      if (actorRole === "customer" && booking.customer_id !== actorId) {
        throw new Error("Only the booking customer can cancel");
      }
      if (actorRole === "helper" && booking.helper_id !== actorId) {
        throw new Error("Only the assigned helper can cancel");
      }

      this._validateTransition(booking.status, "cancelled", actorRole);

      // If helper cancels before OTP step (status = accepted):
      // remove helper, OTP, live location and put back to searching
      if (actorRole === "helper" && booking.status === "accepted") {
        const updated = await tx`
          UPDATE bookings
          SET status = 'searching',
              helper_id = NULL,
              assigned_at = NULL,
              start_code = NULL,
              start_code_attempts = 0,
              cancel_reason = NULL,
              version = version + 1,
              updated_at = NOW()
          WHERE id = ${bookingId}
          RETURNING *
        `;

        const eventId = uuidv7();
        await tx`
          INSERT INTO booking_events (id, booking_id, event_type, from_status, to_status, actor_user_id, actor_role, payload)
          VALUES (${eventId}, ${bookingId}, 'helper_released', 'accepted', 'searching', ${actorId}, 'helper',
            ${sql.json({ reason: reason || "helper_cancelled" })})
        `;

        return updated[0];
      }

      // Otherwise: full cancel
      const updated = await tx`
        UPDATE bookings
        SET status = 'cancelled',
            cancelled_at = NOW(),
            cancelled_by = ${actorId},
            cancel_reason = ${reason || null},
            start_code = NULL,
            version = version + 1,
            updated_at = NOW()
        WHERE id = ${bookingId}
        RETURNING *
      `;

      const eventId = uuidv7();
      await tx`
        INSERT INTO booking_events (id, booking_id, event_type, from_status, to_status, actor_user_id, actor_role, payload)
        VALUES (${eventId}, ${bookingId}, 'booking_cancelled', ${booking.status}, 'cancelled', ${actorId}, ${actorRole},
          ${sql.json({ reason: reason || null })})
      `;

      return updated[0];
    });
  }

  /* ── EXPIRE (searching → expired) ── */
  async expire(bookingId: string): Promise<any> {
    return sql.begin(async (tx) => {
      const bookingRows = await tx`
        SELECT * FROM bookings WHERE id = ${bookingId} FOR UPDATE
      `;
      const booking = bookingRows[0];
      if (!booking) throw new Error("Booking not found");
      if (booking.status === "expired") return booking; // idempotent
      if (booking.status !== "searching") {
        throw new Error(`Cannot expire booking in ${booking.status} status`);
      }

      const updated = await tx`
        UPDATE bookings
        SET status = 'expired',
            version = version + 1,
            updated_at = NOW()
        WHERE id = ${bookingId}
          AND status = 'searching'
        RETURNING *
      `;

      const eventId = uuidv7();
      await tx`
        INSERT INTO booking_events (id, booking_id, event_type, from_status, to_status, actor_user_id, actor_role)
        VALUES (${eventId}, ${bookingId}, 'booking_expired', 'searching', 'expired', 'system', 'system')
      `;

      return updated[0];
    });
  }

  /* ── EXPIRE STALE SEARCHING BOOKINGS ── */
  async expireStaleSearching(timeoutMs: number = 120_000): Promise<number> {
    const cutoff = new Date(Date.now() - timeoutMs);
    const stale = await sql`
      SELECT id FROM bookings
      WHERE status = 'searching'
        AND created_at < ${cutoff}
    `;

    let count = 0;
    for (const row of stale) {
      try {
        await this.expire(row.id);
        count++;
      } catch {
        // Already expired or status changed
      }
    }
    return count;
  }

  /* ── QUERIES ── */

  /** Active tracking order for user: accepted or on_the_way only */
  async getActiveTrackingForUser(userId: string): Promise<any | null> {
    const rows = await sql`
      SELECT * FROM bookings
      WHERE customer_id = ${userId}
        AND status IN ('accepted', 'on_the_way')
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return rows[0] || null;
  }

  /** Any active order for user (includes searching) */
  async findActiveForUser(userId: string): Promise<any | null> {
    const rows = await sql`
      SELECT * FROM bookings
      WHERE customer_id = ${userId}
        AND status IN ('searching', 'accepted', 'on_the_way')
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return rows[0] || null;
  }

  /** Active order for helper: accepted or on_the_way */
  async getActiveForHelper(helperId: string): Promise<any | null> {
    const rows = await sql`
      SELECT * FROM bookings
      WHERE helper_id = ${helperId}
        AND status IN ('accepted', 'on_the_way')
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return rows[0] || null;
  }

  /** Active list for user: searching, accepted, on_the_way */
  async listActiveForUser(userId: string): Promise<any[]> {
    return sql`
      SELECT * FROM bookings
      WHERE customer_id = ${userId}
        AND status IN ('searching', 'accepted', 'on_the_way')
      ORDER BY created_at DESC
    `;
  }

  /** History list for user: completed, cancelled, expired — newest first */
  async listHistoryForUser(userId: string, limit: number = 50): Promise<any[]> {
    return sql`
      SELECT * FROM bookings
      WHERE customer_id = ${userId}
        AND status IN ('completed', 'cancelled', 'expired')
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  }

  /** Active jobs for helper */
  async listActiveForHelper(helperId: string): Promise<any[]> {
    return sql`
      SELECT * FROM bookings
      WHERE helper_id = ${helperId}
        AND status IN ('accepted', 'on_the_way')
      ORDER BY created_at DESC
    `;
  }

  /** History for helper */
  async listHistoryForHelper(helperId: string, limit: number = 50): Promise<any[]> {
    return sql`
      SELECT * FROM bookings
      WHERE helper_id = ${helperId}
        AND status IN ('completed', 'cancelled', 'expired')
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  }

  /** Get a single booking */
  async getBooking(id: string): Promise<any | null> {
    const rows = await sql`SELECT * FROM bookings WHERE id = ${id}`;
    return rows[0] || null;
  }

  /* ── CLEANUP (called on completion) ── */
  async cleanupOnComplete(bookingId: string): Promise<void> {
    await liveLocationRepo.deleteLiveLocation(bookingId);
    await liveLocationRepo.deleteRoute(bookingId);
  }

  /* ── INTERNAL HELPERS ── */

  private _validateTransition(
    currentStatus: string,
    nextStatus: string,
    actorRole: string,
  ): void {
    const allowed = TRANSITIONS[currentStatus];
    if (!allowed) {
      throw new Error(`Unknown current status: ${currentStatus}`);
    }
    const roles = allowed[nextStatus];
    if (!roles) {
      throw new Error(
        `Invalid transition: ${currentStatus} → ${nextStatus}`,
      );
    }
    if (!roles.includes(actorRole)) {
      throw new Error(
        `Actor '${actorRole}' cannot transition ${currentStatus} → ${nextStatus}. Allowed: ${roles.join(", ")}`,
      );
    }
  }

  private async _appendEvent(
    bookingId: string,
    eventType: string,
    fromStatus: string | null,
    toStatus: string,
    actorId: string,
    actorRole: string,
    payload: any,
  ): Promise<void> {
    const id = uuidv7();
    try {
      await sql`
        INSERT INTO booking_events (id, booking_id, event_type, from_status, to_status, actor_user_id, actor_role, payload)
        VALUES (${id}, ${bookingId}, ${eventType}, ${fromStatus}, ${toStatus}, ${actorId}, ${actorRole}, ${payload ? sql.json(payload) : null})
      `;
    } catch {
      // booking_events table may not exist in dev — log and continue
      console.warn(`[BookingService] Failed to write event ${eventType} for ${bookingId}`);
    }
  }
}

/* ── Realtime push helper ── */
/**
 * Push a realtime event to connected clients via the demo_messages table.
 * Both apps poll GET /api/messages to receive these.
 */
export async function pushRealtimeEvent(payload: any): Promise<void> {
  const id = uuidv7();
  try {
    await sql`
      INSERT INTO demo_messages (id, payload)
      VALUES (${id}, ${sql.json(payload)})
    `;
  } catch {
    console.warn("[Realtime] Failed to push event:", payload);
  }
}

/** Singleton */
export const bookingService = new BookingService();
