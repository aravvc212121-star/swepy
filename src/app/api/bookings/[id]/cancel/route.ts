export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { bookingService } from '@/server/services/booking.service';
import { dispatchService } from '@/server/services/dispatch.service';
import { z } from 'zod';

const schema = z.object({
  actorId: z.string().min(1),
  actorRole: z.enum(['customer', 'helper', 'system']),
  reason: z.string().optional(),
});

/**
 * POST /api/bookings/[id]/cancel — cancel a booking.
 * - Customer cancels during SEARCHING: cancel all live offers, notify helpers, set CANCELLED.
 * - Helper cancels after ACCEPTED: free helper, add to order exclusion list, tell user "finding another helper", restart dispatch from wave 1.
 * - Customer cancels after ACCEPTED: cancel order, notify helper, set CANCELLED.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { actorId, actorRole, reason } = schema.parse(body);

    if (actorRole === 'helper') {
      await dispatchService.handleHelperCancelledAfterAccept(id, actorId, reason);
      return NextResponse.json({ success: true, status: 'SEARCHING', message: 'Helper cancelled; searching for another helper' });
    }

    const booking = await dispatchService.handleUserCancelled(id, actorId, reason);
    return NextResponse.json({ success: true, booking, status: 'CANCELLED' });
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404
      : err.message.includes('Only the') ? 403
      : err.message.includes('Invalid') ? 409
      : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
