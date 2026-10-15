import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Till from '@/models/Till';
import { requirePermission } from '@/lib/auth';

// PUT /api/tills/:id — update a till
export async function PUT(request, { params }) {
  const { error, status } = await requirePermission('settings', 'update');
  if (error) return NextResponse.json({ error }, { status });

  await dbConnect();

  const { id } = await params;   // ← await params (Next 15)
  const body = await request.json();

  // Only allow updating safe fields — code is immutable after creation
  const update = {};
  for (const field of [
    'name',
    'location',
    'printerIp',
    'printerPort',
    'stripeReaderId',
    'stripeLocationId',
    'active',
  ]) {
    if (body[field] !== undefined) update[field] = body[field];
  }

  try {
    const till = await Till.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!till) {
      return NextResponse.json({ error: 'Till not found' }, { status: 404 });
    }
    return NextResponse.json(till);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// DELETE /api/tills/:id — delete a till
export async function DELETE(request, { params }) {
  const { error, status } = await requirePermission('settings', 'update');
  if (error) return NextResponse.json({ error }, { status });

  await dbConnect();

  const { id } = await params;   // ← await params (Next 15)

  try {
    const till = await Till.findByIdAndDelete(id).lean();

    if (!till) {
      return NextResponse.json({ error: 'Till not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}