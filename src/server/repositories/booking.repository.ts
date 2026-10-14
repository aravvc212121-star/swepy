import { sql } from '../db/client';
import { uuidv7, generateStartCode } from '../lib/id';
import { hmacHash } from '../lib/crypto';

export class BookingRepository {
  async createBooking(data: any): Promise<any> {
    const id = uuidv7();
    const bookingNumber = `SW${Date.now().toString(36).toUpperCase()}`;
    const addrSnapshot = data.addressSnapshot || {
      lat: data.lat || 0,
      lng: data.lng || 0,
      city_id: data.cityId || null,
    };
    const rows = await sql`
      INSERT INTO bookings (
        id, booking_number, customer_id, address_id, address_snapshot,
        service_package_id, service_code, home_size,
        price_paise, total_paise, idempotency_key
      ) VALUES (
        ${id}, ${bookingNumber}, ${data.customerId}, ${data.addressId || null},
        ${sql.json(addrSnapshot)},
        ${data.servicePackageId || null}, ${data.serviceCode || null},
        ${data.homeSize || null},
        ${data.pricePaise || 0}, ${data.pricePaise || 0}, ${data.idempotencyKey || null}
      )
      RETURNING *
    `;
    return rows[0];
  }

  async getBooking(id: string): Promise<any> {
    const rows = await sql`SELECT * FROM bookings WHERE id = ${id}`;
    return rows[0] || null;
  }

  async getBookingForUpdate(id: string): Promise<any> {
    const rows = await sql`SELECT * FROM bookings WHERE id = ${id} FOR UPDATE`;
    return rows[0] || null;
  }

  async updateBookingStatus(id: string, status: string, helperId?: string): Promise<any> {
    const rows = await sql`
      UPDATE bookings 
      SET status = ${status}, 
          helper_id = COALESCE(${helperId ?? null}, helper_id),
          assigned_at = CASE WHEN ${status} = 'accepted' THEN NOW() ELSE assigned_at END,
          started_at = CASE WHEN ${status} = 'on_the_way' THEN NOW() ELSE started_at END,
          completed_at = CASE WHEN ${status} = 'completed' THEN NOW() ELSE completed_at END,
          cancelled_at = CASE WHEN ${status} = 'cancelled' THEN NOW() ELSE cancelled_at END,
          version = version + 1,
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return rows[0];
  }

  async appendBookingEvent(bookingId: string, eventType: string, fromStatus: string, toStatus: string, actorId: string, actorRole: string, payload: any): Promise<void> {
    const id = uuidv7();
    await sql`
      INSERT INTO booking_events (id, booking_id, event_type, from_status, to_status, actor_user_id, actor_role, payload)
      VALUES (${id}, ${bookingId}, ${eventType}, ${fromStatus}, ${toStatus}, ${actorId}, ${actorRole}, ${payload ? sql.json(payload) : null})
    `;
  }

  async appendOutboxEvent(aggregateType: string, aggregateId: string, eventType: string, payload: any): Promise<void> {
    const id = uuidv7();
    await sql`
      INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload)
      VALUES (${id}, ${aggregateType}, ${aggregateId}, ${eventType}, ${payload ? sql.json(payload) : null})
    `;
  }

  async findPendingOffers(bookingId: string): Promise<any[]> {
    return sql`SELECT * FROM booking_offers WHERE booking_id = ${bookingId} AND status = 'pending'`;
  }

  async createOffers(bookingId: string, wave: number, helperIds: string[]): Promise<void> {
    if (helperIds.length === 0) return;
    
    // Batch insert
    for (const helperId of helperIds) {
      const id = uuidv7();
      await sql`
        INSERT INTO booking_offers (id, booking_id, helper_id, wave, status, expires_at)
        VALUES (${id}, ${bookingId}, ${helperId}, ${wave}, 'pending', NOW() + INTERVAL '45 seconds')
        ON CONFLICT (booking_id, helper_id) DO NOTHING
      `;
    }
  }

  async acceptOffer(bookingId: string, helperId: string): Promise<void> {
    await sql.begin(async (tx) => {
      // 1. Mark this offer as accepted
      const updated = await tx`
        UPDATE booking_offers
        SET status = 'accepted', responded_at = NOW()
        WHERE booking_id = ${bookingId} AND helper_id = ${helperId} AND status = 'pending' AND expires_at > NOW()
        RETURNING id
      `;
      
      if (updated.length === 0) {
        throw new Error('Offer expired or already taken');
      }

      // 2. Cancel all other pending offers for this booking
      await tx`
        UPDATE booking_offers
        SET status = 'cancelled'
        WHERE booking_id = ${bookingId} AND helper_id != ${helperId} AND status = 'pending'
      `;

      // 3. Generate start code and hash it
      const startCode = generateStartCode();
      const startCodeHash = hmacHash(startCode);

      // 4. Update booking — use 'accepted' (not 'assigned') to match frontend
      await tx`
        UPDATE bookings
        SET status = 'accepted', helper_id = ${helperId}, assigned_at = NOW(),
            start_code = ${startCodeHash}, start_code_attempts = 0,
            version = version + 1, updated_at = NOW()
        WHERE id = ${bookingId} AND status = 'searching'
      `;

      // 5. Audit log
      const eventId = uuidv7();
      await tx`
        INSERT INTO booking_events (id, booking_id, event_type, from_status, to_status, actor_user_id, actor_role)
        VALUES (${eventId}, ${bookingId}, 'helper_accepted', 'searching', 'accepted', ${helperId}, 'helper')
      `;

      // 6. Outbox
      const outboxId = uuidv7();
      await tx`
        INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload)
        VALUES (${outboxId}, 'booking', ${bookingId}, 'booking_accepted', ${sql.json({ helperId })})
      `;
    });
  }

  async rejectOffer(bookingId: string, helperId: string, reason?: string): Promise<void> {
    await sql`
      UPDATE booking_offers
      SET status = 'rejected', responded_at = NOW(), reject_reason = ${reason || null}
      WHERE booking_id = ${bookingId} AND helper_id = ${helperId} AND status = 'pending'
    `;
  }

  /** Find active booking for a user (searching, accepted, on_the_way) */
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

  /** Find active tracking booking for user (accepted, on_the_way only) */
  async findTrackingForUser(userId: string): Promise<any | null> {
    const rows = await sql`
      SELECT * FROM bookings
      WHERE customer_id = ${userId}
        AND status IN ('accepted', 'on_the_way')
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return rows[0] || null;
  }

  /** Find active booking for helper */
  async findActiveForHelper(helperId: string): Promise<any | null> {
    const rows = await sql`
      SELECT * FROM bookings
      WHERE helper_id = ${helperId}
        AND status IN ('accepted', 'on_the_way')
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return rows[0] || null;
  }
}
