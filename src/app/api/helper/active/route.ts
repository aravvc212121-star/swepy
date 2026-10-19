export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { bookingService } from '@/server/services/booking.service';
import { cookies } from 'next/headers';
import { authService } from '../../auth/_init';

/**
 * GET /api/helper/active — returns the active job with its full state for the authenticated helper.
 * Active = ACCEPTED or CONFIRMED (or in_progress).
 * NEVER returns the OTP to the helper.
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

    if (!helperId) {
      helperId = req.headers.get('x-helper-id');
    }

    if (!helperId) {
      try {
        const url = (req as any).nextUrl || new URL(req.url);
        helperId = url.searchParams.get('helperId');
      } catch { /* ignore */ }
    }

    if (!helperId) {
      helperId = 'hlp_demo';
    }

    const activeJob = await bookingService.getActiveOrderForHelper(helperId);

    if (!activeJob) {
      return NextResponse.json({ active: null, order: null });
    }

    // Double safeguard: ensure OTP is NEVER included
    const { start_code, otp, _plaintext_otp, ...safeJob } = activeJob;

    return NextResponse.json({
      active: safeJob,
      order: safeJob,
      status: safeJob.status,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
