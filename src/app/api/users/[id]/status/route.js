import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import { toggleUserStatus } from '@/lib/services/userService';

export async function PATCH(request, { params }) {
  const { error, status } = await requirePermission('users', 'update');
  if (error) return NextResponse.json({ error }, { status });

  try {
    const { id } = await params;
    const { isActive } = await request.json();
    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isActive must be a boolean' },
        { status: 400 }
      );
    }
    const result = await toggleUserStatus(id, isActive);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}