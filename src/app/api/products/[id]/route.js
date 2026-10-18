import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';

export async function GET(request, { params }) {
  await dbConnect();
  const { id } = await params;
  const product = await Product.findById(id).lean();
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  return NextResponse.json(product);
}

export async function PUT(request, { params }) {
  await dbConnect();
  const { id } = await params;
  const body = await request.json();
  try {
    const product = await Product.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).lean();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (err) {
    if (err.code === 11000) {
      return NextResponse.json(
        { error: 'Another product already uses this barcode.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: err.message || 'Update failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  await dbConnect();
  const { id } = await params;
  const product = await Product.findByIdAndDelete(id).lean();
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  return NextResponse.json({ message: 'Product deleted' });
}