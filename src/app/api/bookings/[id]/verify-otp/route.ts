export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { bookingService, pushRealtimeEvent } from '@/server/services/booking.service';
import { z } from 'zod';

const schema = z.object({
  helperId: z.string().min(1),
  code: z.string().length(4),
});

/**
 * POST /api/bookings/[id]/verify-otp — helper submits the 4-digit OTP.
 * Only valid in on_the_way. Wrong code = error + attempt count.
 * Lock after 5 wrong tries for 3 minutes.
 * Correct code = complete the order in ONE transaction.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { helperId, code } = schema.parse(body);

    const result = await bookingService.verifyOtp(id, helperId, code);

    if (result.locked) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Locked for 3 minutes.', attemptsLeft: 0, locked: true },
        { status: 429 },
      );
    }

    if (!result.valid) {
      return NextResponse.json(
        { error: 'Invalid OTP', attemptsLeft: result.attemptsLeft, locked: false },
        { status: 400 },
      );
    }

    // OTP correct — booking is now completed
    // Clean up live location data
    await bookingService.cleanupOnComplete(id);

    // Push completed event to both apps
    await pushRealtimeEvent({
      type: 'job_status',
      booking_id: id,
      status: 'completed',
      ts: Date.now(),
      sender: helperId,
    });

    return NextResponse.json({ success: true, status: 'completed', booking: result.booking });
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404
      : err.message.includes('Only the assigned') ? 403
      : err.message.includes('only allowed') ? 409
      : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
