// src/lib/services/sales.js
import dbConnect from '@/lib/db';
import Sale from '@/models/Sale';
import Product from '@/models/Product';
import Till from '@/models/Till';
import Counter from '@/models/Counter';
import { getOpenShift } from '@/lib/services/shiftService';

function stockDeltaOf(item) {
  return item.pricingType === 'weight' ? (item.weight ?? 0) : item.qty;
}

export async function getAllSales({ date, method, tillId, receipt, limit = 100 } = {}) {
  await dbConnect();

  const query = {};

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    query.createdAt = { $gte: start, $lte: end };
  }

  if (method) query.paymentMethod = method;
  if (tillId) query.tillId = tillId;
  if (receipt && receipt.trim()) {
    const escaped = receipt.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.receiptNumber = { $regex: escaped, $options: 'i' };
  }

  const sales = await Sale.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return { success: true, sales };
}

/**
 * Get a single sale by ID.
 */
export async function getSaleById(id) {
  await dbConnect();
  const sale = await Sale.findById(id).lean();
  if (!sale) throw new Error('Sale not found');
  return { success: true, sale };
}

export async function createSale({ body, user }) {
  await dbConnect();

  // ── 1. Validate client input ─────────────────────────────────
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }
  if (!body.tillId) {
    throw new Error('tillId is required');
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new Error('Sale must have at least one item');
  }
  if (!['cash', 'card'].includes(body.paymentMethod)) {
    throw new Error('Invalid payment method');
  }
  if (typeof body.total !== 'number' || body.total < 0) {
    throw new Error('Invalid total');
  }

  // ── 2. Resolve till ──────────────────────────────────────────
  const till = await Till.findById(body.tillId).lean();
  if (!till) throw new Error('Till not found');

  // ── 3. Resolve open shift ────────────────────────────────────
  const shift = await getOpenShift(body.tillId);
  if (!shift) {
    throw new Error('No open shift on this till. Open a shift first.');
  }

  // ── 4. Atomic receipt number ─────────────────────────────────
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { _id: `sale-${year}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  const receiptNumber = `R${year}${String(counter.seq).padStart(6, '0')}`;

  // ── 5. Cashier name snapshot ─────────────────────────────────
  const cashierName = user?.getDisplayName
    ? user.getDisplayName()
    : `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Unknown';

  // ── 6. Persist the sale with a whitelist of fields ───────────
  const sale = await Sale.create({
    items: body.items.map((it) => ({
      productId: it._id,
      name: it.name,
      barcode: it.barcode,
      price: it.price,
      qty: it.qty ?? 1,
      weight: it.weight ?? null,
      pricingType: it.pricingType ?? 'unit',
      unit: it.unit ?? 'each',
      vatCode: it.vatCode ?? 'S',
      vatRate: it.vatRate ?? 20,
    })),
    subtotal: body.subtotal,
    tax: body.tax,
    total: body.total,
    vatBreakdown: body.vatBreakdown ?? [],
    paymentMethod: body.paymentMethod,
    stripePaymentIntentId: body.stripePaymentIntentId,

    // Server-derived — the client cannot override these
    tillId: till._id,
    tillCode: till.code,
    shiftId: shift._id,
    cashierId: user._id,
    cashierName,
    paymentStatus: 'paid',
    receiptNumber,
  });

  // ── 7. Decrement stock (best-effort, non-blocking on failure) ─
  for (const item of body.items) {
    if (item.productId) {
      try {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: -stockDeltaOf(item) },
        });
      } catch (err) {
        console.error(
          'Stock decrement failed for',
          item.productId,
          err.message
        );
      }
    }
  }

  return sale;
}

export async function refundSale({ saleId, refundLines, refundMethod, reason, refundTillId, user }) {
  await dbConnect();

  // ── 1. Load original sale ────────────────────────────────
  const original = await Sale.findById(saleId);
  if (!original) throw new Error('Sale not found');
  if (original.paymentStatus === 'refunded') {
    throw new Error('Sale already fully refunded');
  }
  if (original.refundOfSaleId) {
    throw new Error('Cannot refund a refund');
  }
  if (!Array.isArray(refundLines) || refundLines.length === 0) {
    throw new Error('At least one item must be refunded');
  }

  // ── 2. Find the current open shift on the original's till ─
  // const currentShift = await getOpenShift(original.tillId);
  // if (!currentShift) {
  //   throw new Error('No open shift on this till. Open a shift to process a refund.');
  // }
  const targetTillId = refundTillId || original.tillId;
  const till = await Till.findById(targetTillId).lean();
  if (!till) throw new Error('Target till not found');
   const currentShift = await getOpenShift(targetTillId);
  if (!currentShift) {
    throw new Error(
      `No open shift on till ${till.code}. Open a shift there to process the refund.`
    );
  }
  // const till = await Till.findById(original.tillId).lean();
  // if (!till) throw new Error('Till not found');

  const refundedItems = [];
  for (const rl of refundLines) {
  const origItem =
    rl.itemIndex != null && original.items[rl.itemIndex]
      ? original.items[rl.itemIndex]
      : original.items.find(
          (it) => String(it.productId) === String(rl.productId)
        );
  if (!origItem) throw new Error(`Line not found: ${rl.productId ?? rl.itemIndex}`);

    const isWeight = origItem.pricingType === 'weight';
    const origAmount = isWeight ? origItem.weight : origItem.qty;
    const alreadyRefunded = origItem.qtyRefunded || 0;
    const remaining = origAmount - alreadyRefunded;
    const requested = isWeight ? rl.weight : rl.qty;

    if (!Number.isFinite(requested) || requested <= 0) {
      throw new Error('Refund quantity must be positive');
    }
    if (requested > remaining + 0.0001) {
      throw new Error(
        `Cannot refund ${requested} of ${origItem.name}. Only ${remaining} remaining.`
      );
    }

    refundedItems.push({
      origItem,
      requested,
      isWeight,
    });
  }

  // ── 4. Compute negative totals for the refund doc ────────
  let refundSubtotal = 0;
  const vatTotals = {};

  for (const { origItem, requested, isWeight } of refundedItems) {
    const lineAmount = isWeight
      ? origItem.price * requested
      : origItem.price * requested;
    refundSubtotal += lineAmount;

    const code = origItem.vatCode ?? 'S';
    const rate = origItem.vatRate ?? 0;
    if (!vatTotals[code]) vatTotals[code] = { rate, taxable: 0, vat: 0 };
    vatTotals[code].taxable += lineAmount;
    vatTotals[code].vat += (lineAmount * rate) / 100;
  }

  const refundTax = Object.values(vatTotals).reduce((s, v) => s + v.vat, 0);
  const refundTotal = refundSubtotal + refundTax;

  // ── 5. Refund receipt number ─────────────────────────────
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { _id: `refund-${year}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  const receiptNumber = `RF${year}${String(counter.seq).padStart(6, '0')}`;

  // ── 6. Cashier snapshot ─────────────────────────────────
  const cashierName =
    (user?.getDisplayName ? user.getDisplayName() : `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()) ||
    'Unknown';

  // ── 7. Create the refund document ───────────────────────
  const refundSale = await Sale.create({
    items: refundedItems.map(({ origItem, requested, isWeight }) => ({
      productId: origItem.productId,
      name: origItem.name,
      barcode: origItem.barcode,
      price: origItem.price,
      qty: isWeight ? 1 : requested,
      weight: isWeight ? requested : null,
      pricingType: origItem.pricingType,
      unit: origItem.unit,
      vatCode: origItem.vatCode,
      vatRate: origItem.vatRate,
    })),
    subtotal: -refundSubtotal,
    tax: -refundTax,
    total: -refundTotal,
    vatBreakdown: Object.entries(vatTotals).map(([code, v]) => ({
      code,
      rate: v.rate,
      taxableAmount: -v.taxable,
      vatAmount: -v.vat,
    })),
    paymentMethod: refundMethod || original.paymentMethod,
    paymentStatus: 'refunded',
    refundMethod: refundMethod || original.paymentMethod,
    refundReason: reason || '',
    refundOfSaleId: original._id,

    // Current shift context
    tillId: till._id,
    tillCode: till.code,
    shiftId: currentShift._id,
    cashierId: user._id,
    cashierName,
    receiptNumber,
  });

  for (const { origItem, requested } of refundedItems) {
  origItem.qtyRefunded = (origItem.qtyRefunded || 0) + requested;
}

  original.refundedBySaleIds.push(refundSale._id);

  // Status: fully refunded only when every line is fully refunded
  const fullyRefunded = original.items.every((it) => {
    const origAmount = it.pricingType === 'weight' ? (it.weight ?? 0) : it.qty;
    return (it.qtyRefunded || 0) >= origAmount - 0.0001;
  });
  original.paymentStatus = fullyRefunded ? 'refunded' : 'partially_refunded';

  await original.save();

  // ── 9. Restore stock for the refunded quantity only ─────
  const restoreErrors = [];
  for (const { origItem, requested, isWeight } of refundedItems) {
    if (!origItem.productId) continue;
    try {
      await Product.findByIdAndUpdate(origItem.productId, {
        $inc: { stock: isWeight ? requested : requested },
      });
    } catch (err) {
      restoreErrors.push({ productId: origItem.productId, error: err.message });
    }
  }

  return {
    success: true,
    refundSale,
    originalSale: original,
    restoreErrors: restoreErrors.length ? restoreErrors : undefined,
  };
}