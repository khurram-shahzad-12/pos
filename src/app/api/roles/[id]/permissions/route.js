import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import { assignPermissionsToRole } from '@/lib/services/roleService';

export async function PUT(request, { params }) {
  const { error, status } = await requirePermission('users', 'update');
  if (error) return NextResponse.json({ error }, { status });

  try {
    const { id } = await params;
    const { permissions } = await request.json();
    const result = await assignPermissionsToRole(id, permissions);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}