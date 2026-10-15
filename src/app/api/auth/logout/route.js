import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';
import { logout } from '@/lib/services/userService';

export async function POST() {
  const user = await getCurrentUser();
  if (user) await logout(user._id);

  const cookieStore = await cookies();
  cookieStore.delete('pos_token');
  cookieStore.delete('pos_refresh');

  return NextResponse.json({ success: true });
}