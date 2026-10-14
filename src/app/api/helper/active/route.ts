export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { bookingService } from '@/server/services/booking.service';
import { cookies } from 'next/headers';
import { authService } from '../../auth/_init';

/**
 * GET /api/helper/active — returns the active job for the authenticated helper.
 * Active = status IN ('accepted', 'on_the_way').
 */
export async function GET(req: NextRequest) {
  try {
    let helperId: string | null = null;

    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('swepy_session')?.value;
      if (token) {
        const user = await authService.validateSession(token);
        if (user.role === 'helper') helperId = user.id;
      }
    } catch { /* ignore */ }

    if (!helperId) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const user = await authService.validateSession(authHeader.substring(7));
          if (user.role === 'helper') helperId = user.id;
        } catch { /* ignore */ }
      }
    }

    // Dev fallback
    if (!helperId) {
      helperId = req.headers.get('x-helper-id');
    }

    if (!helperId) {
      return NextResponse.json({ error: 'Unauthorized: Helper role required' }, { status: 401 });
    }

    const booking = await bookingService.getActiveForHelper(helperId);

    if (!booking) {
      return NextResponse.json({ active: null });
    }

    // Strip start_code — helper must NEVER see the OTP
    const { start_code, ...safeBooking } = booking;

    return NextResponse.json({ active: safeBooking });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
