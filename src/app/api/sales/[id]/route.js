import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import { getSaleById, refundSale } from '@/lib/services/saleService';

export async function GET(request, { params }) {
  const { error, status } = await requirePermission('sales', 'read');
  if (error) return NextResponse.json({ error }, { status });

  try {
    const { id } = await params;
    const result = await getSaleById(id);
    return NextResponse.json(result.sale);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
}

export async function PATCH(request, { params }) {
  const { user, error, status } = await requirePermission('sales', 'update');
  if (error) return NextResponse.json({ error }, { status });

  const { id } = await params;
  const body = await request.json();

  try {
    const result = await refundSale({
      saleId: id,
      refundLines: body.refundLines || [],
      refundMethod: body.refundMethod || null,
      reason: body.reason || '',
      refundTillId: body.refundTillId || null, 
      user,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}