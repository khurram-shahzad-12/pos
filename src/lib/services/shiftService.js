import dbConnect from '@/lib/db';
import Shift from '@/models/Shift';
import Sale from '@/models/Sale';

export async function getOpenShift(tillId) {
  await dbConnect();
  return Shift.findOne({ tillId, status: 'open' }).lean();
}

export async function openShift({ tillId, openingFloat, user }) {
  await dbConnect();

  const existing = await Shift.findOne({ tillId, status: 'open' });
  if (existing) {
    const err = new Error('This till already has an open shift');
    err.status = 409;
    err.shiftId = existing._id;
    throw err;
  }

  return Shift.create({
    tillId,
    openedAt: new Date(),
    openingFloat: Number(openingFloat),
    openedBy: user._id,
    status: 'open',
  });
}

export async function getShiftTotals(shiftId) {
  await dbConnect();
  const shift = await Shift.findById(shiftId).lean();
  if (!shift) throw new Error('Shift not found');

  const sales = await Sale.find({ shiftId }).lean();

  let grossSales = 0,
    transactionsCount = 0,
    refundsCount = 0,
    refundsTotal = 0;
  let cashSales = 0,
    cardSales = 0,
    cashRefunds = 0,
    cardRefunds = 0,
    totalVat = 0;
  const vatMap = {};

  // for (const sale of sales) {
  //   grossSales += sale.total;
  //   if (sale.paymentMethod === 'cash') cashSales += sale.total;
  //   if (sale.paymentMethod === 'card') cardSales += sale.total;

  //   if (sale.paymentStatus === 'refunded') {
  //     refundsCount++;
  //     refundsTotal += sale.total;
  //     if (sale.paymentMethod === 'cash') cashRefunds += sale.total;
  //     if (sale.paymentMethod === 'card') cardRefunds += sale.total;
  //     continue; // skip VAT accumulation for refunded sales
  //   }

  //   transactionsCount++;

  //   if (sale.vatBreakdown?.length) {
  //     for (const v of sale.vatBreakdown) {
  //       if (!vatMap[v.code]) {
  //         vatMap[v.code] = {
  //           code: v.code,
  //           rate: v.rate,
  //           taxableAmount: 0,
  //           vatAmount: 0,
  //         };
  //       }
  //       vatMap[v.code].taxableAmount += v.taxableAmount;
  //       vatMap[v.code].vatAmount += v.vatAmount;
  //       totalVat += v.vatAmount;
  //     }
  //   } else if (sale.tax) {
  //     if (!vatMap.S) {
  //       vatMap.S = { code: 'S', rate: 20, taxableAmount: 0, vatAmount: 0 };
  //     }
  //     vatMap.S.vatAmount += sale.tax;
  //     totalVat += sale.tax;
  //   }
  // }
  for (const sale of sales) {
  const isRefundDoc = sale.refundOfSaleId != null;

  if (isRefundDoc) {
    // Refund document — total is negative; count its absolute value
    refundsCount++;
    refundsTotal += Math.abs(sale.total);
    if (sale.paymentMethod === 'cash') cashRefunds += Math.abs(sale.total);
    if (sale.paymentMethod === 'card') cardRefunds += Math.abs(sale.total);
    continue; // no VAT accumulation — refunded VAT is on the original
  }

  // Original sale (paid, partially_refunded, or fully refunded)
  grossSales += sale.total;
  if (sale.paymentMethod === 'cash') cashSales += sale.total;
  if (sale.paymentMethod === 'card') cardSales += sale.total;
  transactionsCount++;

  if (sale.vatBreakdown?.length) {
    for (const v of sale.vatBreakdown) {
      if (!vatMap[v.code]) {
        vatMap[v.code] = {
          code: v.code,
          rate: v.rate,
          taxableAmount: 0,
          vatAmount: 0,
        };
      }
      vatMap[v.code].taxableAmount += v.taxableAmount;
      vatMap[v.code].vatAmount += v.vatAmount;
      totalVat += v.vatAmount;
    }
  } else if (sale.tax) {
    if (!vatMap.S) {
      vatMap.S = { code: 'S', rate: 20, taxableAmount: 0, vatAmount: 0 };
    }
    vatMap.S.vatAmount += sale.tax;
    totalVat += sale.tax;
  }
}

  const openingFloat = shift.openingFloat;
  const expectedCash = openingFloat + cashSales - cashRefunds;
  const netRevenue = grossSales - refundsTotal;

  // Suggested opening float for the *next* shift = the previous closed
  // shift's cashLeft on this till.
  const lastClosed = await Shift.findOne({
    tillId: shift.tillId,
    status: 'closed',
  })
    .sort({ closedAt: -1 })
    .lean();

  const suggestedOpeningFloat = lastClosed?.closingLeft ?? 0;

  return {
    shift,
    periodStart: shift.openedAt,
    periodEnd: new Date(),
    grossSales: round2(grossSales),
    transactionsCount,
    refundsCount,
    refundsTotal: round2(refundsTotal),
    netRevenue: round2(netRevenue),
    vatBreakdown: Object.values(vatMap).map((v) => ({
      code: v.code,
      rate: v.rate,
      taxableAmount: round2(v.taxableAmount),
      vatAmount: round2(v.vatAmount),
    })),
    totalVat: round2(totalVat),
    cashSales: round2(cashSales),
    cardSales: round2(cardSales),
    cashRefunds: round2(cashRefunds),
    cardRefunds: round2(cardRefunds),
    openingFloat: round2(openingFloat),
    expectedCash: round2(expectedCash),
    suggestedOpeningFloat: round2(suggestedOpeningFloat),
  };
}

export async function closeShift({
  shiftId,
  actualCash,
  takenOut = 0,
  left = 0,
  notes,
  user,
}) {
  await dbConnect();

  const shift = await Shift.findById(shiftId);
  if (!shift) throw new Error('Shift not found');
  if (shift.status === 'closed') throw new Error('Shift already closed');

  const totals = await getShiftTotals(shiftId);

  const actual = round2(Number(actualCash) || 0);
  const taken = round2(Number(takenOut) || 0);
  const kept = round2(Number(left) || 0);

  if (actual < 0 || taken < 0 || kept < 0) {
    throw new Error('Cash amounts must be non-negative');
  }
  if (Math.abs(taken + kept - actual) > 0.005) {
    throw new Error(
      'Cash taken out + cash left in drawer must equal actual cash counted'
    );
  }

  const variance = round2(actual - totals.expectedCash);

  shift.closedAt = new Date();
  shift.status = 'closed';
  shift.closingExpected = totals.expectedCash;
  shift.closingActual = actual;
  shift.closingTakenOut = taken;
  shift.closingLeft = kept;
  shift.variance = variance;
  shift.closedBy = user._id;
  shift.notes = notes || '';
  await shift.save();

  return { shift, totals, actual, variance, takenOut: taken, left: kept };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}