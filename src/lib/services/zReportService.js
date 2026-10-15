import dbConnect from '@/lib/db';
import ZReport from '@/models/ZReport';
import { getShiftTotals, closeShift } from '@/lib/services/shiftService';
import { nextZReportNumber } from '@/lib/services/zReportNumber';

export async function calculateZReport(shiftId) {
  return getShiftTotals(shiftId);
}

export async function saveZReport({
  shiftId,
  actualCash,
  takenOut = 0,
  left = 0,
  notes,
  user,
}) {
  await dbConnect();

  const {
    shift,
    totals,
    actual,
    variance,
    takenOut: taken,
    left: kept,
  } = await closeShift({
    shiftId,
    actualCash,
    takenOut,
    left,
    notes,
    user,
  });

  const reportNumber = await nextZReportNumber(shift.tillId);

  const report = await ZReport.create({
    reportNumber,
    tillId: shift.tillId,
    shiftId: shift._id,
    periodStart: totals.periodStart,
    periodEnd: totals.periodEnd,
    grossSales: totals.grossSales,
    transactionsCount: totals.transactionsCount,
    refundsCount: totals.refundsCount,
    refundsTotal: totals.refundsTotal,
    netRevenue: totals.netRevenue,
    vatBreakdown: totals.vatBreakdown,
    totalVat: totals.totalVat,
    cashSales: totals.cashSales,
    cardSales: totals.cardSales,
    cashRefunds: totals.cashRefunds,
    cardRefunds: totals.cardRefunds,
    openingFloat: totals.openingFloat,
    expectedCash: totals.expectedCash,
    actualCash: actual,
    variance,
    takenOut: taken,
    leftForNextShift: kept,
    cashierId: user._id,
    cashierName: `${user.firstName} ${user.lastName}`,
    notes: notes || '',
  });

  shift.zReportId = report._id;
  await shift.save();

  return { success: true, report };
}