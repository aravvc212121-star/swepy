import { NextRequest, NextResponse } from 'next/server';
import { authService } from '../../_init';
import { z } from 'zod';
import { cookies } from 'next/headers';

const schema = z.object({
  phone: z.string(),
  otp: z.string().length(6),
  role: z.enum(['customer', 'helper']).default('customer'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, otp, role } = schema.parse(body);

    const { token, user } = await authService.verifyOtp(phone, otp, role);

    const cookieStore = await cookies();
    cookieStore.set('swepy_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
