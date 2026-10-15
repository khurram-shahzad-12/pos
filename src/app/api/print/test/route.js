// src/app/api/print/test/route.js
import { NextResponse } from 'next/server';
import net from 'net';
import dbConnect from '@/lib/db';
import Setting from '@/models/Setting';
import { requirePermission } from '@/lib/auth';

export async function POST() {
  // Only users with settings permission can trigger test prints
  const { error, status } = await requirePermission('settings', 'update');
  if (error) return NextResponse.json({ error }, { status });

  await dbConnect();
  const settings = await Setting.findOne({ key: 'store' }).lean();

  if (!settings) {
    return NextResponse.json(
      { error: 'Settings not found. Save your printer settings first.' },
      { status: 400 }
    );
  }

  const { printerIp, printerPort } = settings;

  if (!printerIp || !printerPort) {
    return NextResponse.json(
      { error: 'Printer IP or port not configured in settings.' },
      { status: 400 }
    );
  }

  // Build the ESC/POS test receipt
  const ESC = '\x1B';
  const receipt =
    ESC + '@' +                          // Initialize printer
    ESC + 'a' + '\x01' +                 // Center align
    'TEST RECEIPT\n' +
    '================================\n' +
    'Printer is working!\n' +
    new Date().toLocaleString('en-GB') + '\n' +
    '================================\n' +
    '\n\n\n' +
    ESC + 'd' + '\x03';                  // Feed 3 lines + cut

  // Send the bytes over TCP to the network printer
  const result = await new Promise((resolve) => {
    const client = new net.Socket();
    let responded = false;

    client.setTimeout(5000);

    client.connect(parseInt(printerPort), printerIp, () => {
      client.write(receipt, 'binary', () => {
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
        resolve({ success: false, error: 'Connection timeout' });
      }
    });
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Test receipt sent' });
}