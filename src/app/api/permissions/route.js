import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import { getAllPermissions, createPermission } from '@/lib/services/permissionService';

export async function GET() {
  const { error, status } = await requirePermission('users', 'read');
  if (error) return NextResponse.json({ error }, { status });

  try {
    const result = await getAllPermissions();
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
    const result = await createPermission(body);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}