import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Shift from '@/models/Shift';
import { requirePermission } from '@/lib/auth';

export async function GET(request) {
  const { error, status } = await requirePermission('pos', 'use');
  if (error) return NextResponse.json({ error }, { status });

  const tillId = new URL(request.url).searchParams.get('tillId');
  if (!tillId) {
    return NextResponse.json({ error: 'tillId required' }, { status: 400 });
  }

  await dbConnect();

  // Most recently closed shift for this till
  const lastClosed = await Shift.findOne({ tillId, status: 'closed' })
    .sort({ closedAt: -1 })
    .lean();

  // If an open shift already exists, we can't open another — return it too
  const openShift = await Shift.findOne({ tillId, status: 'open' }).lean();

  return NextResponse.json({
    suggestedOpeningFloat: lastClosed?.closingLeft ?? 0,
    lastClosedAt: lastClosed?.closedAt ?? null,
    hasOpenShift: Boolean(openShift),
  });
}