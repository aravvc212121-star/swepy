import { NextRequest, NextResponse } from 'next/server';
import { dispatchService } from '@/server/services/dispatch.service';
import { z } from 'zod';

const schema = z.object({
  helperId: z.string(),
  reason: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { helperId, reason } = schema.parse(body);

    await dispatchService.rejectOffer(id, helperId, reason);

    return NextResponse.json({ success: true, rejected: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
