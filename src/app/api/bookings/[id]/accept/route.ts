import { NextRequest, NextResponse } from 'next/server';
import { bookingService, pushRealtimeEvent } from '@/server/services/booking.service';
import { z } from 'zod';

const schema = z.object({
  helperId: z.string(),
});

/**
 * POST /api/bookings/[id]/accept — helper accepts the booking offer.
 * Uses BookingService for atomic state machine enforcement:
 * - searching → accepted
 * - Two helpers can never accept the same order (transaction + conditional update)
 * - A helper with an active order cannot accept another
 * - Generates and hashes a 4-digit OTP
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { helperId } = schema.parse(body);

    const booking = await bookingService.accept(id, helperId);

    // Push realtime event so user app receives the accept notification
    // The _plaintext_otp is transient and NOT stored in DB (only the hash is stored)
    await pushRealtimeEvent({
      type: 'booking_assigned',
      booking_id: id,
      helper_id: helperId,
      helper_name: booking.helper_name || 'Helper',
      status: 'accepted',
      ts: Date.now(),
      sender: helperId,
      // NOTE: OTP is NOT included in this event — it's sent via the user's live endpoint only
    });

    // Return success. The plaintext OTP is only exposed via GET /api/bookings/[id]/live
    // to the authenticated customer, never to the helper.
    const { start_code, _plaintext_otp, ...safeBooking } = booking;

    return NextResponse.json({ success: true, booking: safeBooking });
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404
      : err.message.includes('already has an active') ? 409
      : err.message.includes('race condition') ? 409
      : err.message.includes('expired or already taken') ? 409
      : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
