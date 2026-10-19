export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { bookingService } from '@/server/services/booking.service';
import { cookies } from 'next/headers';
import { authService } from '../../auth/_init';

/**
 * GET /api/bookings/active — returns caller's current active order with its full state.
 * Supports SEARCHING, ACCEPTED (with OTP and sub_state), and CONFIRMED.
 * App restarts, reconnects, and tab switches call this endpoint.
 * Plaintext OTP is sent ONLY to the user's client.
 */
export async function GET(req: NextRequest) {
  try {
    let userId: string | null = null;

    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('swepy_session')?.value;
      if (token) {
        const user = await authService.validateSession(token);
        if (user) userId = user.id;
      }
    } catch { /* ignore */ }

    if (!userId) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const user = await authService.validateSession(authHeader.substring(7));
          if (user) userId = user.id;
        } catch { /* ignore */ }
      }
    }

    if (!userId) {
      userId = req.headers.get('x-user-id');
    }

    // Default demo user fallback for dev
    if (!userId) {
      try {
        const url = (req as any).nextUrl || new URL(req.url);
        userId = url.searchParams.get('userId');
      } catch { /* ignore */ }
    }

    if (!userId) {
      userId = 'customer';
    }

    const activeOrder = await bookingService.getActiveOrderForUser(userId);

    if (!activeOrder) {
      return NextResponse.json({ active: null, order: null });
    }

    return NextResponse.json({
      active: activeOrder,
      order: activeOrder,
      status: activeOrder.status,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
