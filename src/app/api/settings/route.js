import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Setting from '@/models/Setting';
import { requirePermission } from '@/lib/auth';

export async function GET() {
  const { error, status } = await requirePermission('settings', 'read');
  if (error) return NextResponse.json({ error }, { status });

  await dbConnect();
  let setting = await Setting.findOne({ key: 'store' }).lean();

  if (!setting) {
    // Return defaults if never saved
    setting = {
      key: 'store',
      storeName: 'Cash & Carry',
      storeAddress: '',
      vatNumber: '',
      currency: 'GBP',
      receiptFooter: 'Thank you for your shopping!',
      printerIp: '192.168.1.100',
      printerPort: '9100',
      stripeReaderId: '',
      stripeLocationId: '',
      cashDrawerEnabled: true,
      autoPrintReceipt: true,
      timeZone:'Europe/London'
    };
  }

  return NextResponse.json(setting);
}

const ALLOWED_FIELDS = [
  'storeName',
  'storeAddress',
  'vatNumber',
  'currency',
  'receiptFooter',
  'printerIp',
  'printerPort',
  'stripeReaderId',
  'stripeLocationId',
  'cashDrawerEnabled',
  'autoPrintReceipt',
  'timeZone'
];

export async function PUT(request) {
  const { error, status } = await requirePermission('settings', 'update');
  if (error) return NextResponse.json({ error }, { status });

  await dbConnect();
  const body = await request.json();

  const update = {};
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) update[field] = body[field];
  }

  if (update.openingFloat !== undefined) {
    const n = Number(update.openingFloat);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json(
        { error: 'openingFloat must be a non-negative number' },
        { status: 400 }
      );
    }
    update.openingFloat = n;
  }
  if (update.timeZone !== undefined) {
  try {
    Intl.DateTimeFormat('en-GB', { timeZone: update.timeZone });
  } catch {
    return NextResponse.json(
      { error: 'Invalid timeZone — use an IANA name like "Europe/London"' },
      { status: 400 }
    );
  }
}
  const setting = await Setting.findOneAndUpdate(
    { key: 'store' },
    { $set: update },
    { returnDocument: 'after', upsert: true, runValidators: true }
  ).lean();

  return NextResponse.json(setting);
}