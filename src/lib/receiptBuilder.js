// export function buildReceipt(sale, settings, options = {}) {
//   const { isRefund = false } = options;
//   let text = '';
//   const center = (str) => {
//     const width = 48;
//     const padding = Math.max(0, Math.floor((width - str.length) / 2));
//     text += ' '.repeat(padding) + str + '\n';
//   };

//   const row = (left, right) => {
//     const width = 48;
//     const space = Math.max(1, width - left.length - right.length);
//     text += left + ' '.repeat(space) + right + '\n';
//   };

//   const rule = () => {
//     text += '-'.repeat(48) + '\n';
//   };

//   center(String(settings.storeName || 'STORE'));
//   if (settings.storeAddress) center(String(settings.storeAddress));
//   if (settings.vatNumber) center('VAT: ' + String(settings.vatNumber));
//   text += '\n';

//   if (isRefund) {
//     center('*** REFUND ***');
//     text += '\n';
//   }

//   row('Receipt:', String(sale.receiptNumber || ''));

//   const dt = new Date(sale.createdAt);
//   const dateStr = dt.toLocaleString('en-GB', {
//     day: '2-digit', month: '2-digit', year: 'numeric',
//     hour: '2-digit', minute: '2-digit',
//   });

//   row('Date:', String(dateStr));
//   row('Cashier:', String(sale.cashierName || 'Till'));
//   row('Till:', '#' + String(sale.tillNumber || '1'));
//   rule();

//   for (const item of sale.items) {
//     const code = item.vatCode || 'S';
//     text += String(item.name) + ' [' + String(code) + ']\n';

//     let qtyStr = '';
//     let unitPriceStr = '';
//     let totalStr = '';

//     if (item.pricingType === 'weight') {
//       const weight = item.weight ?? 0;
//       const unit = item.unit || 'kg';
//       qtyStr = `${weight.toFixed(3)} ${unit}`;
//       unitPriceStr = `£${item.price.toFixed(2)}/${unit}`;
//       totalStr = '£' + (item.price * weight).toFixed(2);
//     } else {
//       qtyStr = `${item.qty}`;
//       unitPriceStr = `£${item.price.toFixed(2)}`;
//       totalStr = '£' + (item.price * item.qty).toFixed(2);
//     }
//     row(`  ${qtyStr} x ${unitPriceStr}`, String(totalStr));
//   }

//   rule();
//   row('Subtotal (excl VAT)', '£' + Number(sale.subtotal || 0).toFixed(2));

//   if (sale.vatBreakdown && sale.vatBreakdown.length > 0) {
//     for (const v of sale.vatBreakdown) {
//       row(`VAT @ ${v.code} (${v.rate}%)`, '£' + Number(v.vatAmount || 0).toFixed(2));
//     }
//   } else {
//     row('VAT', '£' + Number(sale.tax || 0).toFixed(2));
//   }
//   rule();

//   // Total
//   row('TOTAL', '£' + Number(sale.total || 0).toFixed(2));
//   text += '\n';

//   if (sale.paymentMethod === 'cash' && sale.amountReceived != null) {
//     row('Cash', '£' + Number(sale.amountReceived).toFixed(2));
//     row('Paid (' + String(sale.paymentMethod).toUpperCase() + ')', '£' + Number(sale.total || 0).toFixed(2));
//     if (sale.changeGiven != null && Number(sale.changeGiven) > 0) {
//       row('Change (Return)', '£' + Number(sale.changeGiven).toFixed(2));
//     }
//   }

//   text += '\n';
//   center(String(settings.receiptFooter || 'Thank you for your visit!'));
//   text += '\n\n\n';

//   return text;
// }

// export function buildOpenDrawer() {
//   return null;
// }




const ESC = '\x1B';
const GS = '\x1D';

export function buildReceipt(sale, settings, options = {}) {
  const { isRefund = false } = options;
  const W = 42; // Changed from 48 to 42 for standard 80mm paper
  let text = '';

  // Helper to truncate long names so they don't push prices to the next line
  const truncate = (str, len) => str.length > len ? str.substring(0, len) + '...' : str;

  const center = (str) => {
    const padding = Math.max(0, Math.floor((W - str.length) / 2));
    text += ' '.repeat(padding) + str + '\n';
  };

  const row = (left, right) => {
    // If the combined text is longer than the paper width, truncate the left side
    const maxLeftLen = W - right.length - 1;
    const safeLeft = left.length > maxLeftLen ? truncate(left, maxLeftLen) : left;
    const space = Math.max(1, W - safeLeft.length - right.length);
    text += safeLeft + ' '.repeat(space) + right + '\n';
  };

  const rule = () => {
    text += '-'.repeat(W) + '\n';
  };

  // 1. Initialize printer and set UK Character Set (Code Page 1252) for £ symbol
  text += ESC + '@';        // Initialize
  text += ESC + 't' + '\x10'; // Select Code Page 1252 (Windows-1252)

  // 2. Header
  text += ESC + 'a' + '\x01'; // Center align
  text += ESC + '!' + '\x10'; // Double height
  text += String(settings.storeName || 'STORE') + '\n';
  text += ESC + '!' + '\x00'; // Reset text size
  
  if (settings.storeAddress) center(String(settings.storeAddress));
  if (settings.vatNumber) center('VAT: ' + String(settings.vatNumber));
  text += '\n';

  if (isRefund) {
    text += ESC + '!' + '\x10';
    center('*** REFUND ***');
    text += ESC + '!' + '\x00';
    text += '\n';
  }

  // 3. Sale Info
  text += ESC + 'a' + '\x00'; // Left align
  row('Receipt:', String(sale.receiptNumber || ''));
  const dt = new Date(sale.createdAt);
  const dateStr = dt.toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  row('Date:', String(dateStr));
  row('Cashier:', String(sale.cashierName || 'Till'));
  row('Till:', '#' + String(sale.tillNumber || '1'));
  rule();

  // 4. Items
  for (const item of sale.items) {
    const code = item.vatCode || 'S';
    // Truncate name to 40 chars to leave room for VAT code
    text += truncate(String(item.name), 40) + ' [' + String(code) + ']\n';

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
    row(`  ${qtyStr} x ${unitPriceStr}`, String(totalStr));
  }

  // 5. Totals
  rule();
  row('Subtotal (excl VAT)', '£' + Number(sale.subtotal || 0).toFixed(2));

  if (sale.vatBreakdown && sale.vatBreakdown.length > 0) {
    for (const v of sale.vatBreakdown) {
      row(`VAT @ ${v.code} (${v.rate}%)`, '£' + Number(v.vatAmount || 0).toFixed(2));
    }
  } else {
    row('VAT', '£' + Number(sale.tax || 0).toFixed(2));
  }
  rule();

  // Total
  text += ESC + '!' + '\x10'; // Double height for total
  row('TOTAL', '£' + Number(sale.total || 0).toFixed(2));
  text += ESC + '!' + '\x00'; // Reset
  text += '\n';

  // 6. Payment details
  if (sale.paymentMethod === 'cash' && sale.amountReceived != null) {
    row('Cash', '£' + Number(sale.amountReceived).toFixed(2));
    row('Paid (' + String(sale.paymentMethod).toUpperCase() + ')', '£' + Number(sale.total || 0).toFixed(2));
    if (sale.changeGiven != null && Number(sale.changeGiven) > 0) {
      row('Change (Return)', '£' + Number(sale.changeGiven).toFixed(2));
    }
  }

  // 7. Footer & Cut
  text += '\n';
  text += ESC + 'a' + '\x01'; // Center align
  center(String(settings.receiptFooter || 'Thank you for your shopping!'));
  text += '\n\n\n';

  text += GS + 'V' + '\x42' + '\x00'; // Cut paper

  return text;
}

export function buildOpenDrawer() {
  return ESC + 'p' + '\x00' + '\x19' + '\xFA';
}