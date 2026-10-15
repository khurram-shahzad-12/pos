import { NextResponse } from 'next/server';
import net from 'net';
import dbConnect from '@/lib/db';
import Setting from '@/models/Setting';
import Sale from '@/models/Sale';
import Till from '@/models/Till'
import { requirePermission } from '@/lib/auth';
import { buildReceipt, buildOpenDrawer } from '@/lib/receiptBuilder';

export async function POST(request) {
  const { user, error, status } = await requirePermission('sales', 'create');
  if (error) return NextResponse.json({ error }, { status });

  const body = await request.json();
  const { saleId, openDrawer = false, isRefund = false } = body;

  if (!saleId) {
    return NextResponse.json({ error: 'saleId is required' }, { status: 400 });
  }

  await dbConnect();

  const sale = await Sale.findById(saleId).lean();
  if (!sale) {
    return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
  }

  const till = await Till.findById(sale.tillId).lean();
  if (!till || !till.printerIp) {
    return NextResponse.json(
      { error: 'Printer not configured for this till' },
      { status: 400 }
    );
  }
  const settings = await Setting.findOne({ key: 'store' }).lean() || {};


  // Build the receipt bytes
  let payload = buildReceipt(sale, settings, { isRefund });

  // Optionally append drawer open command
  const drawerEnabled =
    till.cashDrawerEnabled ?? settings.cashDrawerEnabled ?? true;
  if (openDrawer && drawerEnabled) {
    payload += buildOpenDrawer();
  }


  // Send to the printer over TCP
  const result = await sendToPrinter(
    till.printerIp,
    till.printerPort,
    payload
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, receiptNumber: sale.receiptNumber });
}

function sendToPrinter(ip, port, payload) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let responded = false;

    client.setTimeout(5000);

    client.connect(parseInt(port), ip, () => {
      client.write(payload, 'binary', () => {
        client.end();
      });
    });

    client.on('close', () => {
      if (!responded) {
        responded = true;
        resolve({ success: true });
      }
    });

    client.on('error', (err) => {
      if (!responded) {
        responded = true;
        client.destroy();
        resolve({ success: false, error: err.message });
      }
    });

    client.on('timeout', () => {
      if (!responded) {
        responded = true;
        client.destroy();
        resolve({ success: false, error: 'Printer timeout' });
      }
    });
  });
}