import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import { getOpenShift } from '@/lib/services/shiftService';
import { calculateZReport } from '@/lib/services/zReportService';

export async function GET(request) {
  const { error, status } = await requirePermission('reports', 'read');
  if (error) return NextResponse.json({ error }, { status });

  const tillId = new URL(request.url).searchParams.get('tillId');
  if (!tillId) {
    return NextResponse.json({ error: 'tillId is required' }, { status: 400 });
  }

  const shift = await getOpenShift(tillId);
  if (!shift) {
    return NextResponse.json(
      { error: 'No open shift on this till' },
      { status: 400 }
    );
  }

  try {
    const data = await calculateZReport(shift._id);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}