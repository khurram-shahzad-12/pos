import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import { register, getAllUsers } from '@/lib/services/userService';

export async function GET() {
  const { error, status } = await requirePermission('users', 'read');
  if (error) return NextResponse.json({ error }, { status });

  try {
    const result = await getAllUsers();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { error, status } = await requirePermission('users', 'create');
  if (error) return NextResponse.json({ error }, { status });

  try {
    const body = await request.json();
    const result = await register(body);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}