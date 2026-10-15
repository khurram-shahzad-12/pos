import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import { updatePermission, deletePermission } from '@/lib/services/permissionService';

export async function PUT(request, { params }) {
  const { error, status } = await requirePermission('users', 'update');
  if (error) return NextResponse.json({ error }, { status });

  try {
    const { id } = await params;
    const body = await request.json();
    const result = await updatePermission(id, body);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { error, status } = await requirePermission('users', 'delete');
  if (error) return NextResponse.json({ error }, { status });

  try {
    const { id } = await params;
    const result = await deletePermission(id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}