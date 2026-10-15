import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ZReport from '@/models/ZReport';
import { requirePermission } from '@/lib/auth';

export async function GET(request) {
  const { error, status } = await requirePermission('reports', 'read');
  if (error) return NextResponse.json({ error }, { status });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');     // "YYYY-MM-DD"
  const tillId = searchParams.get('tillId');

  await dbConnect();

  const query = {};
  if (date) {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59.999`);
    query.createdAt = { $gte: start, $lte: end };
  }
  if (tillId) query.tillId = tillId;

  const reports = await ZReport.find(query)
    .sort({ createdAt: -1 })
    .lean();

  // Aggregate totals across all reports in this filter
  const summary = reports.reduce(
    (acc, r) => {
      acc.grossSales += r.grossSales || 0;
      acc.netRevenue += r.netRevenue || 0;
      acc.totalVat += r.totalVat || 0;
      acc.cashSales += r.cashSales || 0;
      acc.cardSales += r.cardSales || 0;
      acc.cashRefunds += r.cashRefunds || 0;
      acc.cardRefunds += r.cardRefunds || 0;
      acc.refundsTotal += r.refundsTotal || 0;
      acc.expectedCash += r.expectedCash || 0;
      acc.actualCash += r.actualCash || 0;
      acc.takenOut += r.takenOut || 0;
      acc.leftForNextShift += r.leftForNextShift || 0;
      acc.variance += r.variance || 0;
      acc.transactionsCount += r.transactionsCount || 0;
      acc.refundsCount += r.refundsCount || 0;
      return acc;
    },
    {
      grossSales: 0, netRevenue: 0, totalVat: 0,
      cashSales: 0, cardSales: 0, cashRefunds: 0, cardRefunds: 0,
      refundsTotal: 0, expectedCash: 0, actualCash: 0,
      takenOut: 0, leftForNextShift: 0, variance: 0,
      transactionsCount: 0, refundsCount: 0,
    }
  );

  // Aggregate VAT breakdown per code across all reports
  const vatMap = {};
  for (const r of reports) {
    for (const v of r.vatBreakdown || []) {
      if (!vatMap[v.code]) vatMap[v.code] = { code: v.code, rate: v.rate, taxableAmount: 0, vatAmount: 0 };
      vatMap[v.code].taxableAmount += v.taxableAmount;
      vatMap[v.code].vatAmount += v.vatAmount;
    }
  }

  return NextResponse.json({
    reports,
    summary: { ...summary, vatBreakdown: Object.values(vatMap) },
  });
}