import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import { openShift } from '@/lib/services/shiftService';

export async function POST(request) {
  const { user, error, status } = await requirePermission('shifts', 'create');
  if (error) return NextResponse.json({ error }, { status });

  const body = await request.json();

  if (!body.tillId || body.openingFloat == null) {
    return NextResponse.json(
      { error: 'tillId and openingFloat are required' },
      { status: 400 }
    );
  }

  const float = Number(body.openingFloat);
  if (!Number.isFinite(float) || float < 0) {
    return NextResponse.json(
      { error: 'openingFloat must be a non-negative number' },
      { status: 400 }
    );
  }

  try {
    const shift = await openShift({
      tillId: body.tillId,
      openingFloat: float,
      user,
    });
    return NextResponse.json(shift);
  } catch (err) {
    return NextResponse.json(
      { error: err.message, shiftId: err.shiftId },
      { status: err.status || 500 }
    );
  }
}