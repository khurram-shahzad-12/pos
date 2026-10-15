import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { login } from '@/lib/services/userService';

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await login(body);

    const cookieStore = await cookies();
    cookieStore.set('pos_token', result.token, {
      httpOnly: true,
    //   secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });
    cookieStore.set('pos_refresh', result.refreshToken, {
      httpOnly: true,
    //   secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}