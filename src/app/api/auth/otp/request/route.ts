import { NextRequest, NextResponse } from 'next/server';
import { authService } from '../../_init';
import { z } from 'zod';

const schema = z.object({
  phone: z.string().min(10).max(15).regex(/^\+\d+/, "Must be E.164 format e.g. +919876543210"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone } = schema.parse(body);

    await authService.requestOtp(phone);
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
