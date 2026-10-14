export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { bookingService, pushRealtimeEvent } from '@/server/services/booking.service';
import { z } from 'zod';

const schema = z.object({
  actorId: z.string().min(1),
  actorRole: z.enum(['customer', 'helper']),
  reason: z.string().optional(),
});

/**
 * POST /api/bookings/[id]/cancel — cancel a booking.
 * Customer can cancel from searching / accepted / on_the_way.
 * Helper can cancel from accepted (→ back to searching) or on_the_way.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { actorId, actorRole, reason } = schema.parse(body);

    const booking = await bookingService.cancel(id, actorId, actorRole, reason);

    // Determine the event to push
    const eventType = booking.status === 'searching'
      ? 'booking_release'  // helper released, back to searching
      : 'booking_cancel';  // fully cancelled

    await pushRealtimeEvent({
      type: eventType,
      booking_id: id,
      status: booking.status,
      ts: Date.now(),
      sender: actorId,
      ...(eventType === 'booking_release' ? { helper_id: actorId } : {}),
    });

    // Clean up live location if cancelled
    if (booking.status === 'cancelled') {
      await bookingService.cleanupOnComplete(id);
    }

    return NextResponse.json({ success: true, booking });
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404
      : err.message.includes('Only the') ? 403
      : err.message.includes('Invalid transition') ? 409
      : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
