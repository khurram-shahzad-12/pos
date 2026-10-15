import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import { getOpenShift } from '@/lib/services/shiftService';
import { saveZReport } from '@/lib/services/zReportService';

export async function POST(request) {
  const { user, error, status } = await requirePermission('reports', 'write');
  if (error) return NextResponse.json({ error }, { status });

  const body = await request.json();

  if (!body.tillId || body.actualCash == null) {
    return NextResponse.json(
      { error: 'tillId and actualCash are required' },
      { status: 400 }
    );
  }

  const actual = Number(body.actualCash);
  if (!Number.isFinite(actual) || actual < 0) {
    return NextResponse.json(
      { error: 'actualCash must be a non-negative number' },
      { status: 400 }
    );
  }

  // ── NEW: extract and validate the cash split ──────────────
  const takenOut = Number(body.takenOut) || 0;
  const left = Number(body.left) || 0;

  if (takenOut < 0 || left < 0) {
    return NextResponse.json(
      { error: 'takenOut and left must be non-negative' },
      { status: 400 }
    );
  }

  if (Math.abs(takenOut + left - actual) > 0.005) {
    return NextResponse.json(
      {
        error:
          'Cash taken out + cash left in drawer must equal actual cash counted',
      },
      { status: 400 }
    );
  }
  // ──────────────────────────────────────────────────────────

  const shift = await getOpenShift(body.tillId);
  if (!shift) {
    return NextResponse.json(
      { error: 'No open shift on this till' },
      { status: 400 }
    );
  }

  try {
    const result = await saveZReport({
      shiftId: shift._id,
      actualCash: actual,
      takenOut,                                        // ← NEW
      left,                                            // ← NEW
      notes: body.notes || '',
      user,
    });
    return NextResponse.json(result.report);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 }); // ← 400, not 500
  }
}