export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { BookingRepository } from '@/server/repositories/booking.repository';

const bookingRepo = new BookingRepository();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const booking = await bookingRepo.getBooking(id);
    
    if (!booking) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, booking });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
