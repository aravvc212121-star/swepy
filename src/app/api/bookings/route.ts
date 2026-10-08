import { NextRequest, NextResponse } from 'next/server';
import { BookingRepository } from '@/server/repositories/booking.repository';
import { DispatchService } from '@/server/services/dispatch.service';
import { HelperRepository } from '@/server/repositories/helper.repository';
import type { RealtimeGateway } from '@/server/lib/interfaces';

class NoopRealtime implements RealtimeGateway {
  async publish(channel: string, event: string, payload: unknown) {
    console.log(`[Realtime] ${channel} -> ${event}`, payload);
  }
}

const bookingRepo = new BookingRepository();
const helperRepo = new HelperRepository();
const realtime = new NoopRealtime();
const dispatchService = new DispatchService(bookingRepo, helperRepo, realtime);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // In production, validate user session here

    const booking = await bookingRepo.createBooking(body);
    
    // Trigger dispatch asynchronously
    // In production, this would go to a JobQueue
    setTimeout(() => {
      dispatchService.dispatchWave(booking.id, body.lat || 0, body.lng || 0, body.cityId || 'city-1', 1).catch(console.error);
    }, 0);

    return NextResponse.json({ success: true, booking });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
