import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import { getAllRoles, createRole } from '@/lib/services/roleService';

export async function GET() {
  const { error, status } = await requirePermission('users', 'read');
  if (error) return NextResponse.json({ error }, { status });

  try {
    const result = await getAllRoles();
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
    const result = await createRole(body);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}