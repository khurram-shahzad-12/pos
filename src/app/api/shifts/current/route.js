import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import { getOpenShift } from '@/lib/services/shiftService';

export async function GET(request) {
  const { error, status } = await requirePermission('shifts', 'read');
  if (error) return NextResponse.json({ error }, { status });

  const tillId = new URL(request.url).searchParams.get('tillId');
  if (!tillId) {
    return NextResponse.json({ error: 'tillId is required' }, { status: 400 });
  }

  const shift = await getOpenShift(tillId);
  return NextResponse.json(shift || null);
}