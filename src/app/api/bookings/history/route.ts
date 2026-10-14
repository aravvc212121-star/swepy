export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { bookingService } from '@/server/services/booking.service';
import { cookies } from 'next/headers';
import { authService } from '../../auth/_init';

/**
 * GET /api/bookings/history — order history for the authenticated user.
 * Returns completed, cancelled, expired bookings, newest first.
 */
export async function GET(req: NextRequest) {
  try {
    let userId: string | null = null;
    let userRole: string = 'customer';

    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('swepy_session')?.value;
      if (token) {
        const user = await authService.validateSession(token);
        userId = user.id;
        userRole = user.role;
      }
    } catch { /* ignore */ }

    if (!userId) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const user = await authService.validateSession(authHeader.substring(7));
          userId = user.id;
          userRole = user.role;
        } catch { /* ignore */ }
      }
    }

    // Dev fallback
    if (!userId) {
      userId = req.headers.get('x-user-id');
      userRole = req.headers.get('x-user-role') || 'customer';
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = Math.min(100, parseInt(url.searchParams.get('limit') || '50', 10));

    let history: any[];
    if (userRole === 'helper') {
      history = await bookingService.listHistoryForHelper(userId, limit);
    } else {
      history = await bookingService.listHistoryForUser(userId, limit);
    }

    // Strip sensitive fields
    const safe = history.map(({ start_code, ...b }: any) => b);

    return NextResponse.json({ history: safe });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
