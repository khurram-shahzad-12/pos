// import { NextResponse } from 'next/server';
// import net from 'net';
// import dbConnect from '@/lib/db';
// import Setting from '@/models/Setting';
// import Till from '@/models/Till';
// import { requirePermission } from '@/lib/auth';

// export async function POST(request) {
//   // Only users with settings permission can trigger test prints
//   const { error, status } = await requirePermission('settings', 'update');
//   if (error) return NextResponse.json({ error }, { status });

//   await dbConnect();

//   // Accept optional tillId in body so the UI can pick which printer to test
//   let body = {};
//   try {
//     body = await request.json();
//   } catch {
//     // no body is fine — fall back to default till
//   }
//   const { tillId } = body;

//   // Resolve the till whose printer we'll test
//   let till;
//   if (tillId) {
//     till = await Till.findById(tillId).lean();
//   } else {
//     // No till specified — pick the first active till that has a printer configured
//     till = await Till.findOne({
//       active: true,
//       printerIp: { $exists: true, $ne: '' },
//     }).lean();
//   }

//   if (!till) {
//     return NextResponse.json(
//       { error: 'No till with a configured printer found.' },
//       { status: 400 }
//     );
//   }

//   const { printerIp, printerPort } = till;

//   if (!printerIp || !printerPort) {
//     return NextResponse.json(
//       { error: `Printer IP or port not configured on till "${till.name || till.code}".` },
//       { status: 400 }
//     );
//   }

//   // Build the ESC/POS test receipt
//   const ESC = '\x1B';
//   const receipt =
//     ESC + '@' +                          // Initialize printer
//     ESC + 'a' + '\x01' +                 // Center align
//     'TEST RECEIPT\n' +
//     '================================\n' +
//     'Printer is working!\n' +
//     `Till: ${till.name || till.code}\n` +
//     `Target: ${printerIp}:${printerPort}\n` +
//     new Date().toLocaleString('en-GB') + '\n' +
//     '================================\n' +
//     '\n\n\n' +
//     ESC + 'd' + '\x03';                  // Feed 3 lines + cut

//   // Send the bytes over TCP to the network printer
//   const result = await new Promise((resolve) => {
//     const client = new net.Socket();
//     let responded = false;

//     client.setTimeout(5000);

//     client.connect(parseInt(printerPort), printerIp, () => {
//       client.write(receipt, 'binary', () => {
//         client.end();
//       });
//     });

//     client.on('close', () => {
//       if (!responded) {
//         responded = true;
//         resolve({ success: true });
//       }
//     });

//     client.on('error', (err) => {
//       if (!responded) {
//         responded = true;
//         client.destroy();
//         resolve({ success: false, error: err.message });
//       }
//     });

//     client.on('timeout', () => {
//       if (!responded) {
//         responded = true;
//         client.destroy();
//         resolve({ success: false, error: 'Connection timeout' });
//       }
//     });
//   });

//   if (!result.success) {
//     return NextResponse.json({ error: result.error }, { status: 500 });
//   }

//   return NextResponse.json({
//     success: true,
//     message: `Test receipt sent to ${till.name || till.code} (${printerIp}:${printerPort})`,
//   });
// }





import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Till from '@/models/Till';
import { requirePermission } from '@/lib/auth';

export async function POST(request) {
  const { error, status } = await requirePermission('settings', 'update');
  if (error) return NextResponse.json({ error }, { status });

  await dbConnect();

  let body = {};
  try { body = await request.json(); } catch {}
  const { tillId } = body;

  let till;
  if (tillId) {
    till = await Till.findById(tillId).lean();
  } else {
    till = await Till.findOne({ active: true, printerName: { $exists: true, $ne: '' } }).lean();
  }

  if (!till || !till.printerName) {
    return NextResponse.json(
      { error: 'No till with a configured printer found.' },
      { status: 400 }
    );
  }

  const { printerName } = till;

  // Build the ESC/POS test receipt
  const ESC = '\x1B';
  const GS = '\x1D';
  
  const receipt =
    ESC + '@' +                          
    ESC + 'a' + '\x01' +                 
    'TEST RECEIPT\n' +
    '================================\n' +
    'Printer is working!\n' +
    `Till: ${till.name || till.code}\n` +
    `Target: ${printerName}\n` +
    new Date().toLocaleString('en-GB') + '\n' +
    '================================\n' +
    '\n\n\n' +                          
    GS + 'V' + '\x42' + '\x00' +         
    '\n\n\n' +                           // 👈 Extra feed lines
    '\x00\x00\x00\x00\x00';              // 👈 Null bytes to force driver flush

  const byteArray = Array.from(Buffer.from(receipt, 'binary'));

  return NextResponse.json({
    success: true,
    printerName: printerName,
    bytes: byteArray,
    message: `Test receipt ready for ${till.name || till.code} (${printerName})`,
  });
}