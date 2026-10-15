// app/api/reports/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Sale from '@/models/Sale';

export async function GET(request) {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || 'today'; // today | week | month | year

  // Calculate date boundaries
  const now = new Date();
  let startDate = new Date();

  if (range === 'today') {
    startDate.setHours(0, 0, 0, 0);
  } else if (range === 'week') {
    startDate.setDate(now.getDate() - 7);
  } else if (range === 'month') {
    startDate.setMonth(now.getMonth() - 1);
  } else if (range === 'year') {
    startDate.setFullYear(now.getFullYear() - 1);
  }

  const matchStage = {
    createdAt: { $gte: startDate },
    paymentStatus: 'paid',
  };

  // 1. Overall totals
  const totals = await Sale.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$total' },
        totalTax: { $sum: '$tax' },
        totalSubtotal: { $sum: '$subtotal' },
        transactionCount: { $sum: 1 },
        cashRevenue: {
          $sum: {
            $cond: [{ $eq: ['$paymentMethod', 'cash'] }, '$total', 0],
          },
        },
        cardRevenue: {
          $sum: {
            $cond: [{ $eq: ['$paymentMethod', 'card'] }, '$total', 0],
          },
        },
      },
    },
  ]);

  // 2. Top selling products
  const topProducts = await Sale.aggregate([
    { $match: matchStage },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.name',
        totalQty: { $sum: '$items.qty' },
        totalRevenue: {
          $sum: { $multiply: ['$items.qty', '$items.price'] },
        },
      },
    },
    { $sort: { totalQty: -1 } },
    { $limit: 10 },
  ]);

  // 3. Sales by day (for chart)
  const salesByDay = await Sale.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        revenue: { $sum: '$total' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // 4. Sales by hour (today only)
  const salesByHour = await Sale.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { $hour: '$createdAt' },
        revenue: { $sum: '$total' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const summary = totals[0] || {
    totalRevenue: 0,
    totalTax: 0,
    totalSubtotal: 0,
    transactionCount: 0,
    cashRevenue: 0,
    cardRevenue: 0,
  };

  const averageTransaction =
    summary.transactionCount > 0
      ? summary.totalRevenue / summary.transactionCount
      : 0;

  return NextResponse.json({
    range,
    summary: {
      ...summary,
      averageTransaction,
    },
    topProducts,
    salesByDay,
    salesByHour,
  });
}