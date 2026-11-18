import { NextResponse } from 'next/server';
import mongoose from 'mongoose'; // 👈 FIX: needed for isValidObjectId
import dbConnect from '@/lib/db';
import Till from '@/models/Till';
import { requirePermission } from '@/lib/auth';

// PUT /api/tills/:id — update a till
export async function PUT(request, { params }) {

  const { error, status } = await requirePermission('settings', 'update');
  if (error) return NextResponse.json({ error }, { status });

  await dbConnect();

  const { id } = await params; // ← await params (Next 15)

  // 👇 FIX: validate ObjectId before hitting Mongo
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid till' }, { status: 400 });
  }
  // 👆 FIX

  const body = await request.json();

  // Only allow updating safe fields — code is immutable after creation
  const update = {};
  for (const field of [
    'name',
    'location',
    'printerId',
    'stripeReaderId',
    'stripeLocationId',
    'active',
  ]) {
    if (body[field] !== undefined) update[field] = body[field];
  }
  // 👇 FIX: normalise printerId (fallback to 'receipt' if blank)
  if (typeof update.printerId === 'string') {
    update.printerId = update.printerId.trim() || 'receipt';
  }
  // 👆 FIX

  // Only update token if a non-empty one was supplied
  if (typeof body.bridgeToken === 'string' && body.bridgeToken.trim()) {
    update.bridgeToken = body.bridgeToken.trim();
  }

  // Trim name if present
  if (typeof update.name === 'string') update.name = update.name.trim();

  try {
    const till = await Till.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    )
      .select('+bridgeToken') // 👈 FIX: need token to compute hasBridgeToken
      .lean();

    if (!till) {
      return NextResponse.json({ error: 'Till not found' }, { status: 404 });
    }

    // 👇 FIX: never leak bridgeToken to the client
    const { bridgeToken, ...safe } = till;
    return NextResponse.json({ ...safe, hasBridgeToken: !!bridgeToken });
    // 👆 FIX
  } catch (err) {
    // 👇 FIX: handle duplicate-key (shouldn't happen since code is immutable, but be safe)
    if (err.code === 11000) {
      return NextResponse.json(
        { error: 'A till with that code already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// DELETE /api/tills/:id — delete a till
export async function DELETE(request, { params }) {
  const { error, status } = await requirePermission('settings', 'update');
  if (error) return NextResponse.json({ error }, { status });

  await dbConnect();

  const { id } = await params; // ← await params (Next 15)

  // 👇 FIX: validate ObjectId
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid till' }, { status: 400 });
  }
  // 👆 FIX

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