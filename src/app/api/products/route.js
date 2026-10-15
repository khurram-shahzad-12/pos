// app/api/products/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';

export async function GET() {
  await dbConnect();
  const products = await Product.find({}).sort({ createdAt: -1 }).lean();
  return NextResponse.json(products);
}

export async function POST(request) {
  await dbConnect();
  const body = await request.json();

  // Basic validation
  if (!body.barcode || !body.name || body.price === undefined) {
    return NextResponse.json(
      { error: 'Barcode, name, and price are required.' },
      { status: 400 }
    );
  }

  try {
    const product = await Product.create(body);
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    if (err.code === 11000) {
      return NextResponse.json(
        { error: 'A product with this barcode already exists.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: err.message || 'Failed to create product' },
      { status: 500 }
    );
  }
}