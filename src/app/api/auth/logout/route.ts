import { NextRequest, NextResponse } from 'next/server';
import { authService } from '../_init';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('swepy_session')?.value;

    if (token) {
      await authService.logout(token);
      cookieStore.delete('swepy_session');
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
