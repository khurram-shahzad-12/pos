import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Till from '@/models/Till';
import { requirePermission } from '@/lib/auth';

export async function GET(request, { params }) {
  // use a permission cashiers also have (the one your sales route checks)
  const { error, status } = await requirePermission('sales', 'create');
  if (error) return NextResponse.json({ error }, { status });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid till' }, { status: 400 }); 
  }

  await dbConnect();
  const till = await Till.findById(id).select('+bridgeToken printerId').lean();

  if (!till?.bridgeToken) {
    return NextResponse.json({ error: 'Printer not set up for this till' }, { status: 404 });
  }

  return NextResponse.json(
    { token: till.bridgeToken, printerId: till.printerId || 'receipt' },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}