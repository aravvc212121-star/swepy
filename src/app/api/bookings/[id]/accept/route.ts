import { NextRequest, NextResponse } from 'next/server';
import { dispatchService } from '@/server/services/dispatch.service';
import { z } from 'zod';

const schema = z.object({
  helperId: z.string(),
  offerId: z.string().optional(),
});

/**
 * POST /api/bookings/[id]/accept — helper accepts the booking offer.
 * Race-safe accept: First helper wins. Losers get clean "order already taken / offer expired" response.
 * Never send OTP to helper.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { helperId } = schema.parse(body);

    const result = await dispatchService.acceptOffer(id, helperId);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'order already taken / offer expired',
        status: 'TAKEN',
      }, { status: 200 }); // Clear response, not a crash
    }

    // Strip start_code / OTP from helper response payload
    const { start_code, _plaintext_otp, ...safeOrder } = result.order || {};

    return NextResponse.json({
      success: true,
      status: 'ACCEPTED',
      order: safeOrder,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to accept offer',
    }, { status: 400 });
  }
}
