export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { bookingService, pushRealtimeEvent } from '@/server/services/booking.service';
import { z } from 'zod';

const schema = z.object({
  helperId: z.string().min(1),
});

/**
 * POST /api/bookings/[id]/start-trip — helper starts the trip (accepted → on_the_way).
 * Only the assigned helper can call this, only from 'accepted' status.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { helperId } = schema.parse(body);

    const booking = await bookingService.startTrip(id, helperId);

    // Push realtime event so user app sees status change
    await pushRealtimeEvent({
      type: 'job_status',
      booking_id: id,
      status: 'on_the_way',
      ts: Date.now(),
      sender: helperId,
    });

    return NextResponse.json({ success: true, booking });
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404
      : err.message.includes('Only the assigned') ? 403
      : err.message.includes('Invalid transition') ? 409
      : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
