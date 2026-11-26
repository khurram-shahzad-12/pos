const ESC = '\x1B';
const GS = '\x1D';

const CODE_PAGE = 0x00; 
const POUND_BYTE = 0x9C;  

export function buildReceipt(sale, settings, options = {}) {
  const { isRefund = false } = options;
  const W = 48;
  let text = '';

  const truncate = (str, len) => str.length > len ? str.substring(0, len) + '...' : str;

  const center = (str) => {
    const padding = Math.max(0, Math.floor((W - str.length) / 2));
    text += ' '.repeat(padding) + str + '\n';
  };

  const row = (left, right) => {
    const maxLeftLen = W - right.length - 1;
    const safeLeft = left.length > maxLeftLen ? truncate(left, maxLeftLen) : left;
    const space = Math.max(1, W - safeLeft.length - right.length);
    text += safeLeft + ' '.repeat(space) + right + '\n';
  };

  const rule = () => {
    text += '-'.repeat(W) + '\n';
  };

  // 1. Initialize printer and select code page
  text += ESC + '@';
  text += ESC + 't' + String.fromCharCode(CODE_PAGE); // CHANGED

  // 2. Header
  text += ESC + 'a' + '\x01';
  text += ESC + '!' + '\x10';
  text += String(settings.storeName || 'STORE') + '\n';
  text += ESC + '!' + '\x00';

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
  text += ESC + 'a' + '\x00';
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
    text += truncate(String(item.name), W - 6) + ' [' + String(code) + ']\n'; // CHANGED: scales with W

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

  text += ESC + '!' + '\x10';
  row('TOTAL', '£' + Number(sale.total || 0).toFixed(2));
  text += ESC + '!' + '\x00';
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
  text += ESC + 'a' + '\x01';
  center(String(settings.receiptFooter || 'Thank you for your shopping!'));
  text += '\n\n\n';

  text += GS + 'V' + '\x42' + '\x00';

  return text;
}

// NEW: converts the string to raw bytes, mapping £ to the correct byte
export function encodeReceipt(text) {
  const out = [];
  for (const ch of text) {
    const c = ch.codePointAt(0);
    if (c < 0x80) out.push(c);
    else if (ch === '£') out.push(POUND_BYTE);
    else {
      const plain = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      out.push(plain.length === 1 && plain.charCodeAt(0) < 0x80 ? plain.charCodeAt(0) : 0x3F);
    }
  }
  return new Uint8Array(out);
}

// CHANGED: returns bytes (the old string contained \xFA, which the encoder would break)
export function buildOpenDrawer() {
  return new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);
}

// NEW: temporary helper. Prints £ under several code pages so you can pick the right one
export function codePageTest() {
  const bytes = [0x1B, 0x40];
  for (const n of [0, 2, 3, 16, 19]) {
    bytes.push(0x1B, 0x74, n);
    for (const c of `Table ${n}: `) bytes.push(c.charCodeAt(0));
    bytes.push(0x9C, 0x20, 0xA3, 0x0A);
  }
  bytes.push(0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x42, 0x00);
  return new Uint8Array(bytes);
}