// src/lib/receiptBuilder.js

const ESC = '\x1B';
const GS = '\x1D';

function centre(text, width = 42) {
  const t = text.trim();
  if (t.length >= width) return t;
  const pad = Math.floor((width - t.length) / 2);
  return ' '.repeat(pad) + t;
}

/**
 * Left + right align on the same line.
 */
function lineLR(left, right, width = 42) {
  const l = left.trim();
  const r = right.trim();
  const gap = Math.max(1, width - l.length - r.length);
  return l + ' '.repeat(gap) + r;
}

export function buildReceipt(sale, settings, options = {}) {
  const {isRefund = false} = options;
  const W = 42;
  const lines = [];

  // ─── Initialize ───
  lines.push(ESC + '@');       // Reset printer
  lines.push(ESC + 'a' + '\x00'); // Left align (default)

  // ─── Header ───
  lines.push(ESC + 'a' + '\x01'); // Centre align
  lines.push(ESC + '!' + '\x10'); // Double height + width
  lines.push((settings.storeName || 'STORE') + '\n');
  lines.push(ESC + '!' + '\x00'); // Reset text size

  if (settings.storeAddress) {
    lines.push(settings.storeAddress + '\n');
  }
  if (settings.vatNumber) {
    lines.push('VAT: ' + settings.vatNumber + '\n');
  }
  lines.push('\n');

    if (isRefund) {
    lines.push(ESC + '!' + '\x10');
    lines.push('*** REFUND ***\n');
    lines.push(ESC + '!' + '\x00');
    lines.push('\n');
  }

  // ─── Sale meta ───
  lines.push(ESC + 'a' + '\x00'); // Left align
  lines.push('Receipt: ' + sale.receiptNumber + '\n');
  const dt = new Date(sale.createdAt);
  lines.push(
    'Date:    ' +
      dt.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) +
      '\n'
  );
  lines.push('Cashier: ' + (sale.cashierName || 'Till') + '\n');
  lines.push('Till:    #' + (sale.tillNumber || '1') + '\n');
  lines.push('-'.repeat(W) + '\n');

  // ─── Items ───
  for (const item of sale.items) {
    const code = item.vatCode || 'S';
    const nameLine = item.name + ' [' + code + ']';
    lines.push(nameLine + '\n');
    let desc;
    let lineTotal;
    if(item.pricingType === 'weight') {
      const weight = item.weight ?? 0;
      const unit = item.unit || 'kg';
      desc = `  ${weight.toFixed(3)}${unit} @ £${item.price.toFixed(2)}/${unit}`;
      lineTotal = item.price * weight;
    }else{
      desc = `  ${item.qty} x £${item.price.toFixed(2)}`;
      lineTotal = item.price * item.qty;
    }
   lines.push(lineLR(desc, '£' + lineTotal.toFixed(2), W) + '\n');
  }
  lines.push('-'.repeat(W) + '\n');

  // ─── Subtotal ───
  lines.push(
    lineLR('Subtotal (excl VAT)', '£' + sale.subtotal.toFixed(2), W) + '\n'
  );

  // ─── VAT breakdown ───
  if (sale.vatBreakdown && sale.vatBreakdown.length > 0) {
    for (const v of sale.vatBreakdown) {
      lines.push(
        lineLR(
          `VAT @ ${v.code} (${v.rate}%)`,
          '£' + v.vatAmount.toFixed(2),
          W
        ) + '\n'
      );
    }
  } else {
    lines.push(lineLR('VAT', '£' + sale.tax.toFixed(2), W) + '\n');
  }

  lines.push('-'.repeat(W) + '\n');

  // ─── Total ───
  lines.push(ESC + '!' + '\x10'); // Double height
  lines.push(lineLR('TOTAL', '£' + sale.total.toFixed(2), W) + '\n');
  lines.push(ESC + '!' + '\x00'); // Reset

  // ─── Payment ───
  lines.push('\n');
  lines.push(
    lineLR(
      'Paid (' + sale.paymentMethod.toUpperCase() + ')',
      '£' + sale.total.toFixed(2),
      W
    ) + '\n'
  );

  // ─── Footer ───
  lines.push('\n');
  lines.push(ESC + 'a' + '\x01'); // Centre
  if (settings.receiptFooter) {
    lines.push(settings.receiptFooter + '\n');
  }
  lines.push('\n\n\n');

  // ─── Cut paper ───
  lines.push(GS + 'V' + '\x42' + '\x00'); // Partial cut

  return lines.join('');
}

export function buildOpenDrawer() {
  // ESC p m t1 t2 — pulse pin 2 (drawer 1) for 100ms
  return ESC + 'p' + '\x00' + '\x19' + '\xFA';
}