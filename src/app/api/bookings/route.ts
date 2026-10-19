import { NextRequest, NextResponse } from 'next/server';
import { bookingService } from '@/server/services/booking.service';
import { dispatchService } from '@/server/services/dispatch.service';
import { cookies } from 'next/headers';
import { authService } from '../auth/_init';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Authenticate user if session cookie or header present
    let customerId = body.customerId || body.customer_id;
    if (!customerId) {
      try {
        const cookieStore = await cookies();
        const token = cookieStore.get('swepy_session')?.value;
        if (token) {
          const user = await authService.validateSession(token);
          if (user) customerId = user.id;
        }
      } catch { /* ignore */ }
    }
    if (!customerId) {
      customerId = req.headers.get('x-user-id') || 'customer_demo';
    }

    const booking = await bookingService.createBooking({
      ...body,
      customerId,
      lat: body.lat ?? (body.addressSnapshot?.lat ?? 28.6139),
      lng: body.lng ?? (body.addressSnapshot?.lng ?? 77.2090),
    });

    // Start smart wave dispatch asynchronously
    setTimeout(() => {
      dispatchService.startDispatch(booking.id).catch(console.error);
    }, 0);

    return NextResponse.json({ success: true, booking });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
