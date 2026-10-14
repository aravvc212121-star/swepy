export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { bookingService, pushRealtimeEvent } from '@/server/services/booking.service';
import { cookies } from 'next/headers';
import { authService } from '../../auth/_init';

/**
 * GET /api/bookings/active — returns the active tracking order for the authenticated user.
 * Active = status IN ('accepted', 'on_the_way'). Searching/completed/cancelled/expired = null.
 */
export async function GET(req: NextRequest) {
  try {
    let userId: string | null = null;

    // Auth: cookie or header
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('swepy_session')?.value;
      if (token) {
        const user = await authService.validateSession(token);
        userId = user.id;
      }
    } catch { /* ignore */ }

    if (!userId) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const user = await authService.validateSession(authHeader.substring(7));
          userId = user.id;
        } catch { /* ignore */ }
      }
    }

    // Dev fallback: x-user-id header
    if (!userId) {
      userId = req.headers.get('x-user-id');
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query: only accepted or on_the_way (not searching, not terminal)
    const booking = await bookingService.getActiveTrackingForUser(userId);

    if (!booking) {
      return NextResponse.json({ active: null });
    }

    // Return booking WITHOUT start_code (OTP) — it's only for the user's live endpoint
    const { start_code, ...safeBooking } = booking;

    return NextResponse.json({ active: safeBooking });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
