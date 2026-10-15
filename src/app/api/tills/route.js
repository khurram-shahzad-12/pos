import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Till from '@/models/Till';
import { requirePermission } from '@/lib/auth';

// GET /api/tills — list all tills
export async function GET() {
  const { error, status } = await requirePermission('settings', 'read');
  if (error) return NextResponse.json({ error }, { status });

  await dbConnect();

  const tills = await Till.find({})
    .sort({ code: 1 })
    .lean();

  return NextResponse.json(tills);   // raw array
}

// POST /api/tills — create a till
export async function POST(request) {
  const { error, status } = await requirePermission('settings', 'update');
  if (error) return NextResponse.json({ error }, { status });

  await dbConnect();
  const body = await request.json();

  if (!body.name || !body.code) {
    return NextResponse.json(
      { error: 'name and code are required' },
      { status: 400 }
    );
  }

  try {
    const till = await Till.create({
      name: body.name.trim(),
      code: body.code.trim().toUpperCase(),
      location: body.location || '',
      printerIp: body.printerIp || '',
      printerPort: body.printerPort || '9100',
      stripeReaderId: body.stripeReaderId || '',
      stripeLocationId: body.stripeLocationId || '',
      active: body.active !== false,
    });
    return NextResponse.json(till, { status: 201 });
  } catch (err) {
    if (err.code === 11000) {
      return NextResponse.json(
        { error: 'A till with that code already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}