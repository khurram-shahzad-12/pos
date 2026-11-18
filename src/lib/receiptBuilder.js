// const ESC = '\x1B';
// const GS = '\x1D';

// function centre(text, width = 42) {
//   const t = text.trim();
//   if (t.length >= width) return t;
//   const pad = Math.floor((width - t.length) / 2);
//   return ' '.repeat(pad) + t;
// }

// function lineLR(left, right, width = 42) {
//   const l = left.trim();
//   const r = right.trim();
//   const gap = Math.max(1, width - l.length - r.length);
//   return l + ' '.repeat(gap) + r;
// }

// export function buildReceipt(sale, settings, options = {}) {
//   const { isRefund = false } = options;
//   const W = 42;
//   const lines = [];

//   lines.push(ESC + '@');
//   lines.push(ESC + 'a' + '\x00');

//   lines.push(ESC + 'a' + '\x01');
//   lines.push(ESC + '!' + '\x10');
//   lines.push((settings.storeName || 'STORE') + '\n');
//   lines.push(ESC + '!' + '\x00');

//   if (settings.storeAddress) {
//     lines.push(settings.storeAddress + '\n');
//   }
//   if (settings.vatNumber) {
//     lines.push('VAT: ' + settings.vatNumber + '\n');
//   }
//   lines.push('\n');

//   if (isRefund) {
//     lines.push(ESC + '!' + '\x10');
//     lines.push('*** REFUND ***\n');
//     lines.push(ESC + '!' + '\x00');
//     lines.push('\n');
//   }

//   lines.push(ESC + 'a' + '\x00');
//   lines.push('Receipt: ' + sale.receiptNumber + '\n');
//   const dt = new Date(sale.createdAt);
//   lines.push(
//     'Date:    ' +
//     dt.toLocaleString('en-GB', {
//       day: '2-digit',
//       month: '2-digit',
//       year: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit',
//     }) +
//     '\n'
//   );
//   lines.push('Cashier: ' + (sale.cashierName || 'Till') + '\n');
//   lines.push('Till:    #' + (sale.tillNumber || '1') + '\n');
//   lines.push('-'.repeat(W) + '\n');

//   for (const item of sale.items) {
//     const code = item.vatCode || 'S';
//     const nameLine = item.name + ' [' + code + ']';
//     lines.push(nameLine + '\n');
//     let desc;
//     let lineTotal;
//     if (item.pricingType === 'weight') {
//       const weight = item.weight ?? 0;
//       const unit = item.unit || 'kg';
//       desc = `  ${weight.toFixed(3)}${unit} @ £${item.price.toFixed(2)}/${unit}`;
//       lineTotal = item.price * weight;
//     } else {
//       desc = `  ${item.qty} x £${item.price.toFixed(2)}`;
//       lineTotal = item.price * item.qty;
//     }
//     lines.push(lineLR(desc, '£' + lineTotal.toFixed(2), W) + '\n');
//   }
//   lines.push('-'.repeat(W) + '\n');
//   lines.push(
//     lineLR('Subtotal (excl VAT)', '£' + sale.subtotal.toFixed(2), W) + '\n'
//   );

//   if (sale.vatBreakdown && sale.vatBreakdown.length > 0) {
//     for (const v of sale.vatBreakdown) {
//       lines.push(
//         lineLR(
//           `VAT @ ${v.code} (${v.rate}%)`,
//           '£' + v.vatAmount.toFixed(2),
//           W
//         ) + '\n'
//       );
//     }
//   } else {
//     lines.push(lineLR('VAT', '£' + sale.tax.toFixed(2), W) + '\n');
//   }

//   lines.push('-'.repeat(W) + '\n');
//   lines.push(ESC + '!' + '\x10'); // Double height
//   lines.push(lineLR('TOTAL', '£' + sale.total.toFixed(2), W) + '\n');
//   lines.push(ESC + '!' + '\x00'); // Reset

//   lines.push('\n');
//   if (sale.paymentMethod === 'cash' && sale.amountReceived != null) {
//     lines.push(
//       lineLR(
//         'Cash',
//         '£' + Number(sale.amountReceived).toFixed(2),
//         W
//       ) + '\n'
//     );
//     lines.push(
//       lineLR(
//         'Paid (' + sale.paymentMethod.toUpperCase() + ')',
//         '£' + sale.total.toFixed(2),
//         W
//       ) + '\n'
//     );
//     if (sale.changeGiven != null && Number(sale.changeGiven) > 0) {
//       lines.push(
//         lineLR(
//           'Change (Return)',
//           '£' + Number(sale.changeGiven).toFixed(2),
//           W
//         ) + '\n'
//       );
//     }
//   }
//   lines.push('\n');
//   lines.push(ESC + 'a' + '\x01'); // Centre
//   if (settings.receiptFooter) {
//     lines.push(settings.receiptFooter + '\n');
//   }
//   lines.push('\n\n\n');

//   lines.push(GS + 'V' + '\x42' + '\x00');

//   return lines.join('');
// }

// export function buildOpenDrawer() {
//   return ESC + 'p' + '\x00' + '\x19' + '\xFA';
// }


import { ReceiptBuilder } from 'pos-hardware-bridge';

export function buildReceipt(sale, settings, options = {}) {
  const { isRefund = false } = options;
  const bill = new ReceiptBuilder();
  bill.center(String(settings.storeName || 'STORE'));
  if (settings.storeAddress) {
    bill.center(String(settings.storeAddress));
  }
  if (settings.vatNumber) {
    bill.center('VAT: ' + String(settings.vatNumber));
  }
  bill.feed(1);
  if (isRefund) {
    bill.center('*** REFUND ***');
    bill.feed(1);
  }
  bill.row('Receipt:', String(sale.receiptNumber || ''));

  const dt = new Date(sale.createdAt);
  const dateStr = dt.toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  bill.row('Date:', String(dateStr));
  bill.row('Cashier:', String(sale.cashierName || 'Till'));
  bill.row('Till:', '#' + String(sale.tillNumber || '1'));
  bill.rule();

  // 4. Line Items
  for (const item of sale.items) {
    const code = item.vatCode || 'S';
    bill.text(String(item.name) + ' [' + String(code) + ']');

    let qtyStr = '';
    let unitPriceStr = '';
    let totalStr = '';

    if (item.pricingType === 'weight') {
      const weight = item.weight ?? 0;
      const unit = item.unit || 'kg';
      qtyStr = `${weight.toFixed(3)} ${unit}`;
      unitPriceStr = `£${item.price.toFixed(2)}/${unit}`;
      totalStr = '£' + (item.price * weight).toFixed(2);
    } else {
      qtyStr = `${item.qty}`;
      unitPriceStr = `£${item.price.toFixed(2)}`;
      totalStr = '£' + (item.price * item.qty).toFixed(2);
    }

    bill.row(`  ${qtyStr} x ${unitPriceStr}`, String(totalStr));
  }

  bill.rule();
  bill.row('Subtotal (excl VAT)', '£' + Number(sale.subtotal || 0).toFixed(2));

  if (sale.vatBreakdown && sale.vatBreakdown.length > 0) {
    for (const v of sale.vatBreakdown) {
      bill.row(`VAT @ ${v.code} (${v.rate}%)`, '£' + Number(v.vatAmount || 0).toFixed(2));
    }
  } else {
    bill.row('VAT', '£' + Number(sale.tax || 0).toFixed(2));
  }

  bill.rule();

  // Total
  bill.total('TOTAL', '£' + Number(sale.total || 0).toFixed(2));
  bill.feed(1);
  if (sale.paymentMethod === 'cash' && sale.amountReceived != null) {
    bill.row('Cash', '£' + Number(sale.amountReceived).toFixed(2));
    bill.row('Paid (' + String(sale.paymentMethod).toUpperCase() + ')', '£' + Number(sale.total || 0).toFixed(2));

    if (sale.changeGiven != null && Number(sale.changeGiven) > 0) {
      bill.row('Change (Return)', '£' + Number(sale.changeGiven).toFixed(2));
    }
  }

  bill.feed(1);
  bill.center(String(settings.receiptFooter || 'Thank you for your visit!'));
  bill.feed(3);
  return bill.build();
}

export function buildOpenDrawer() {
  return null;
}