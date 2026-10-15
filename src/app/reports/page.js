'use client';

import { useState, useEffect } from 'react';
import TopBar from '@/components/TopBar';
import ProtectedRoute from '@/components/ProtectedRoute';

function ReportsAnalytics() {
  const [tab, setTab] = useState('analytics');

  // Range for Analytics tab
  const [range, setRange] = useState('today');

  // Z Reports tab filters
  const today = new Date().toISOString().slice(0, 10);
  const [zDate, setZDate] = useState(today);
  const [zTillFilter, setZTillFilter] = useState('');

  const ranges = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Last 7 Days' },
    { key: 'month', label: 'Last 30 Days' },
    { key: 'year', label: 'Last Year' },
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <TopBar title="Reports & Analytics" />

      {/* Single row: filters on the left, tabs on the right */}
      <div className="px-4 pt-4 flex flex-wrap items-center justify-between gap-3">
        {/* LEFT — filters depend on the active tab */}
        <div className="flex flex-wrap items-center gap-3">
          {tab === 'analytics' &&
            ranges.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-5 py-3 rounded-xl font-semibold transition min-h-[44px] ${
                  range === r.key
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-slate-700 hover:bg-slate-200'
                }`}
              >
                {r.label}
              </button>
            ))}

          {tab === 'zreports' && (
            <>
              <input
                type="date"
                value={zDate}
                onChange={(e) => setZDate(e.target.value)}
                className="px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none bg-white min-h-[44px]"
              />
              <button
                onClick={() => setZDate(today)}
                className="px-4 py-3 rounded-xl bg-white text-slate-700 hover:bg-slate-200 font-semibold min-h-[44px]"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 1);
                  setZDate(d.toISOString().slice(0, 10));
                }}
                className="px-4 py-3 rounded-xl bg-white text-slate-700 hover:bg-slate-200 font-semibold min-h-[44px]"
              >
                Yesterday
              </button>
            </>
          )}
        </div>

        {/* RIGHT — tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab('analytics')}
            className={`px-5 py-3 rounded-xl font-semibold transition min-h-[44px] ${
              tab === 'analytics'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setTab('zreports')}
            className={`px-5 py-3 rounded-xl font-semibold transition min-h-[44px] ${
              tab === 'zreports'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            Z Reports
          </button>
        </div>
      </div>

      {tab === 'analytics' ? (
        <AnalyticsTab range={range} />
      ) : (
        <ZReportsTab date={zDate} setDate={setZDate} tillFilter={zTillFilter} setTillFilter={setZTillFilter} />
      )}
    </div>
  );
}

function AnalyticsTab({ range }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports?range=${range}`, {
        credentials: 'include',
      });
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const maxRevenue = data?.salesByDay?.length
    ? Math.max(...data.salesByDay.map((d) => d.revenue), 1)
    : 1;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {error && (
        <div className="bg-red-500 text-white px-6 py-3 text-center font-semibold">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            Loading reports...
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            No data available
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-md p-6">
                <p className="text-sm opacity-90">Total Revenue</p>
                <p className="text-3xl font-bold mt-1">
                  £{data.summary.totalRevenue.toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-sm text-slate-500">Transactions</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {data.summary.transactionCount}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-sm text-slate-500">Avg. Transaction</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  £{data.summary.averageTransaction.toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-sm text-slate-500">VAT Collected</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  £{data.summary.totalTax.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-600">
                    Cash Revenue
                  </p>
                  <span className="text-2xl font-bold text-blue-600">
                    £{data.summary.cashRevenue.toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{
                      width: `${
                        data.summary.totalRevenue > 0
                          ? (data.summary.cashRevenue /
                              data.summary.totalRevenue) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-600">
                    Card Revenue
                  </p>
                  <span className="text-2xl font-bold text-purple-600">
                    £{data.summary.cardRevenue.toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div
                    className="bg-purple-600 h-3 rounded-full transition-all"
                    style={{
                      width: `${
                        data.summary.totalRevenue > 0
                          ? (data.summary.cardRevenue /
                              data.summary.totalRevenue) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Sales Trend Chart */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Sales Trend
              </h2>
              {data.salesByDay.length === 0 ? (
                <p className="text-slate-400 text-center py-8">
                  No sales data for this period
                </p>
              ) : (
                <div className="flex items-end gap-2 h-48">
                  {data.salesByDay.map((day) => (
                    <div
                      key={day._id}
                      className="flex-1 flex flex-col items-center gap-1 group"
                    >
                      <span className="text-xs font-semibold text-slate-600 opacity-0 group-hover:opacity-100 transition">
                        £{day.revenue.toFixed(0)}
                      </span>
                      <div
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg hover:from-blue-600 hover:to-blue-500 transition-all"
                        style={{
                          height: `${(day.revenue / maxRevenue) * 100}%`,
                          minHeight: '4px',
                        }}
                      />
                      <span className="text-xs text-slate-500 truncate">
                        {day._id.slice(5)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Top 10 Best Sellers
              </h2>
              {data.topProducts.length === 0 ? (
                <p className="text-slate-400 text-center py-8">
                  No product sales for this period
                </p>
              ) : (
                <div className="space-y-3">
                  {data.topProducts.map((product, index) => {
                    const maxQty = data.topProducts[0].totalQty || 1;
                    return (
                      <div
                        key={product._id}
                        className="flex items-center gap-4"
                      >
                        <span className="w-8 text-center font-bold text-slate-400">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="font-semibold text-slate-800">
                              {product._id}
                            </span>
                            <span className="text-sm text-slate-500">
                              {product.totalQty} sold · £
                              {product.totalRevenue.toFixed(2)}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all"
                              style={{
                                width: `${(product.totalQty / maxQty) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sales by Hour (Today only) */}
            {range === 'today' && data.salesByHour.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">
                  Sales by Hour (Today)
                </h2>
                <div className="grid grid-cols-12 gap-1">
                  {Array.from({ length: 24 }).map((_, hour) => {
                    const hourData = data.salesByHour.find(
                      (h) => h._id === hour
                    );
                    const revenue = hourData?.revenue || 0;
                    const maxHourRevenue = Math.max(
                      ...data.salesByHour.map((h) => h.revenue),
                      1
                    );
                    return (
                      <div
                        key={hour}
                        className="flex flex-col items-center gap-1 group"
                        title={`${hour}:00 - £${revenue.toFixed(2)}`}
                      >
                        <div className="w-full h-24 bg-slate-100 rounded flex items-end">
                          <div
                            className="w-full bg-blue-500 rounded transition-all"
                            style={{
                              height: `${(revenue / maxHourRevenue) * 100}%`,
                              minHeight: revenue > 0 ? '4px' : '0',
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-400">
                          {hour}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ZReportsTab({ date, setDate, tillFilter, setTillFilter }) {
  const today = new Date().toISOString().slice(0, 10);
  const [tills, setTills] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/tills', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setTills(Array.isArray(d) ? d : []))
      .catch(() => setTills([]));
  }, []);

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, tillFilter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (tillFilter) params.append('tillId', tillFilter);
      const res = await fetch(`/api/zreport/list?${params.toString()}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setData(json);
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => `£${(Number(n) || 0).toFixed(2)}`;
  const fmtTime = (iso) =>
    new Date(iso).toLocaleString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {error && (
        <div className="bg-red-500 text-white px-6 py-3 text-center font-semibold">
          {error}
        </div>
      )}

      {/* Till picker + refresh on its own row */}
      <div className="px-4 pt-2 pb-2 flex flex-wrap gap-3 items-center">
        <select
          value={tillFilter}
          onChange={(e) => setTillFilter(e.target.value)}
          className="px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none bg-white min-h-[44px]"
        >
          <option value="">All Tills</option>
          {tills.map((t) => (
            <option key={t._id} value={t._id}>
              {t.code}
              {t.name ? ` · ${t.name}` : ''}
            </option>
          ))}
        </select>
        <button
          onClick={fetchReports}
          className="px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-500 font-semibold min-h-[44px]"
        >
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            Loading Z reports...
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            No data
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Combined Totals {date ? `— ${date}` : ''}
                {tillFilter && (
                  <span className="text-sm font-normal text-slate-500 ml-2">
                    (
                    {tills.find((t) => t._id === tillFilter)?.code ||
                      'selected till'}
                    )
                  </span>
                )}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCell
                  label="Gross Sales"
                  value={fmt(data.summary.grossSales)}
                />
                <SummaryCell
                  label="Net Revenue"
                  value={fmt(data.summary.netRevenue)}
                  green
                />
                <SummaryCell label="VAT" value={fmt(data.summary.totalVat)} />
                <SummaryCell
                  label="Transactions"
                  value={data.summary.transactionsCount}
                />
                <SummaryCell
                  label="Cash Sales"
                  value={fmt(data.summary.cashSales)}
                  blue
                />
                <SummaryCell
                  label="Card Sales"
                  value={fmt(data.summary.cardSales)}
                  purple
                />
                <SummaryCell
                  label="Cash Refunds"
                  value={`-${fmt(data.summary.cashRefunds)}`}
                  red
                />
                <SummaryCell
                  label="Card Refunds"
                  value={`-${fmt(data.summary.cardRefunds)}`}
                  red
                />
                <SummaryCell
                  label="Expected in Drawer"
                  value={fmt(data.summary.expectedCash)}
                />
                <SummaryCell
                  label="Actual Counted"
                  value={fmt(data.summary.actualCash)}
                />
                <SummaryCell
                  label="Taken Out"
                  value={fmt(data.summary.takenOut)}
                />
                <SummaryCell
                  label="Left for Next Shift"
                  value={fmt(data.summary.leftForNextShift)}
                />
                <SummaryCell
                  label={
                    data.summary.variance === 0
                      ? 'Balanced'
                      : data.summary.variance > 0
                      ? 'Overage'
                      : 'Shortage'
                  }
                  value={fmt(data.summary.variance)}
                  red={data.summary.variance < 0}
                />
              </div>

              {data.summary.vatBreakdown.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-bold text-slate-700 mb-2">
                    VAT Breakdown
                  </h3>
                  <div className="space-y-1">
                    {data.summary.vatBreakdown.map((v) => (
                      <div
                        key={v.code}
                        className="flex justify-between text-sm w-2/6"
                      >
                        <span className="text-slate-600">
                          VAT @ {v.code} ({v.rate}%) on {fmt(v.taxableAmount)}
                        </span>
                        <span className="font-semibold pl-10">{fmt(v.vatAmount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                      Report #
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                      Till
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                      Period
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">
                      Gross
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">
                      Refunds
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">
                      Net
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">
                      VAT
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">
                      Cash
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">
                      Card
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">
                      Expected
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">
                      Variance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.reports.length === 0 ? (
                    <tr>
                      <td
                        colSpan={11}
                        className="px-4 py-8 text-center text-slate-400"
                      >
                        No Z reports on {date || 'this date'}
                      </td>
                    </tr>
                  ) : (
                    data.reports.map((r) => (
                      <tr
                        key={r._id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 font-mono text-sm">
                          {r.reportNumber}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm">
                          {r.tillCode || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {fmtTime(r.periodStart)} — {fmtTime(r.periodEnd)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {fmt(r.grossSales)}
                        </td>
                        <td className="px-4 py-3 text-right text-red-600">
                          -{fmt(r.refundsTotal)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-700">
                          {fmt(r.netRevenue)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {fmt(r.totalVat)}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-700">
                          {fmt(r.cashSales)}
                        </td>
                        <td className="px-4 py-3 text-right text-purple-700">
                          {fmt(r.cardSales)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {fmt(r.expectedCash)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold ${
                            r.variance < 0
                              ? 'text-red-600'
                              : r.variance > 0
                              ? 'text-blue-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {r.variance >= 0 ? '+' : ''}
                          {fmt(r.variance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCell({ label, value, green, blue, purple, red }) {
  const colorCls = green
    ? 'text-green-600'
    : blue
    ? 'text-blue-600'
    : purple
    ? 'text-purple-600'
    : red
    ? 'text-red-600'
    : 'text-slate-900';
  return (
    <div className="border border-slate-200 rounded-lg p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-xl font-bold ${colorCls}`}>{value}</p>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ProtectedRoute requiredPermissions={['read:reports']}>
      <ReportsAnalytics />
    </ProtectedRoute>
  );
}