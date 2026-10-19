export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { bookingService } from '@/server/services/booking.service';
import { z } from 'zod';

const schema = z.object({
  helperId: z.string().min(1),
  code: z.string().length(4),
});

/**
 * POST /api/bookings/[id]/verify-otp — helper submits the 4-digit OTP.
 * Requirements:
 * - Constant-time comparison on server. Only assigned helper can verify.
 * - Wrong OTP: return "Incorrect OTP" and count attempt.
 * - After 5 wrong attempts: lock verification for 5 minutes and notify user.
 * - Correct OTP: atomically set order to CONFIRMED, emit order:confirmed to BOTH.
 * - Submitting same correct OTP again is idempotent.
 * - Does NOT depend on distance or ARRIVED sub-state.
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
        { error: 'Incorrect OTP', message: result.message, attemptsLeft: 0, locked: true },
        { status: 429 },
      );
    }

    if (!result.valid) {
      return NextResponse.json(
        { error: 'Incorrect OTP', message: 'Incorrect OTP', attemptsLeft: result.attemptsLeft, locked: false },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      status: 'CONFIRMED',
      message: 'Order confirmed',
      order: result.order,
    });
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404
      : err.message.includes('Only the assigned') ? 403
      : err.message.includes('only allowed') ? 409
      : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
