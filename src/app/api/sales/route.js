import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import { createSale, getAllSales } from '@/lib/services/saleService';

export async function POST(request) {
  const { user, error, status } = await requirePermission('sales', 'create');
  if (error) return NextResponse.json({ error }, { status });

  try {
    const body = await request.json();
    const sale = await createSale({ body, user });
    return NextResponse.json(sale, { status: 201 });
  } catch (err) {
    console.error('Sale create failed:', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function GET(request) {
  const { error, status } = await requirePermission('sales', 'read');
  if (error) return NextResponse.json({ error }, { status });

  try {
    const { searchParams } = new URL(request.url);
    const result = await getAllSales({
      date: searchParams.get('date'),
      method: searchParams.get('method'),
      tillId: searchParams.get('tillId'),
      receipt: searchParams.get('receipt'),
    });
    return NextResponse.json(result.sales);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}