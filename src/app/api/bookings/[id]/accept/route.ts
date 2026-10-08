import { NextRequest, NextResponse } from 'next/server';
import { BookingRepository } from '@/server/repositories/booking.repository';
import { DispatchService } from '@/server/services/dispatch.service';
import { HelperRepository } from '@/server/repositories/helper.repository';
import type { RealtimeGateway } from '@/server/lib/interfaces';
import { z } from 'zod';

class NoopRealtime implements RealtimeGateway {
  async publish(channel: string, event: string, payload: unknown) {}
}

const bookingRepo = new BookingRepository();
const helperRepo = new HelperRepository();
const realtime = new NoopRealtime();
const dispatchService = new DispatchService(bookingRepo, helperRepo, realtime);

const schema = z.object({
  helperId: z.string(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { helperId } = schema.parse(body);

    await dispatchService.acceptOffer(id, helperId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
