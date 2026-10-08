import { sql } from '../db/client';
import { uuidv7, generateStartCode } from '../lib/id';

export class BookingRepository {
  async createBooking(data: any): Promise<any> {
    const id = uuidv7();
    const rows = await sql`
      INSERT INTO bookings (
        id, customer_id, address_id, service_package_id, 
        price_paise, total_paise, idempotency_key
      ) VALUES (
        ${id}, ${data.customerId}, ${data.addressId}, ${data.servicePackageId},
        ${data.pricePaise}, ${data.pricePaise}, ${data.idempotencyKey}
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
          assigned_at = CASE WHEN ${status} = 'assigned' THEN NOW() ELSE assigned_at END,
          version = version + 1
      WHERE id = ${id}
      RETURNING *
    `;
    return rows[0];
  }

  async appendBookingEvent(bookingId: string, eventType: string, fromStatus: string, toStatus: string, actorId: string, actorRole: string, payload: any): Promise<void> {
    const id = uuidv7();
    await sql`
      INSERT INTO booking_events (id, booking_id, event_type, from_status, to_status, actor_user_id, actor_role, payload)
      VALUES (${id}, ${bookingId}, ${eventType}, ${fromStatus}, ${toStatus}, ${actorId}, ${actorRole}, ${payload})
    `;
  }

  async appendOutboxEvent(aggregateType: string, aggregateId: string, eventType: string, payload: any): Promise<void> {
    const id = uuidv7();
    await sql`
      INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload)
      VALUES (${id}, ${aggregateType}, ${aggregateId}, ${eventType}, ${payload})
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

      // 3. Generate start code
      const startCode = generateStartCode();

      // 4. Update booking
      await tx`
        UPDATE bookings
        SET status = 'assigned', helper_id = ${helperId}, assigned_at = NOW(), start_code = ${startCode}, version = version + 1
        WHERE id = ${bookingId} AND status = 'searching'
      `;

      // 5. Audit log
      const eventId = uuidv7();
      await tx`
        INSERT INTO booking_events (id, booking_id, event_type, from_status, to_status, actor_user_id, actor_role)
        VALUES (${eventId}, ${bookingId}, 'helper_accepted', 'searching', 'assigned', ${helperId}, 'helper')
      `;

      // 6. Outbox
      const outboxId = uuidv7();
      await tx`
        INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload)
        VALUES (${outboxId}, 'booking', ${bookingId}, 'booking_assigned', ${JSON.stringify({ helperId })})
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
}
