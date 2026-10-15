// src/app/sales/page.jsx
'use client';

import { useState, useEffect, useRef } from 'react';
import TopBar from '@/components/TopBar';
import { useAuth } from '@/lib/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useOptionalTill } from '@/components/TillProvider';

function SalesHistory() {
  const { hasPermission } = useAuth();
  const canRefund = hasPermission('update:sales');

  const [sales, setSales] = useState([]);
  const [tills, setTills] = useState([]);
  const [refundModalSale, setRefundModalSale] = useState(null);
  const [refundForm, setRefundForm] = useState({});
  const [refundMethod, setRefundMethod] = useState('cash');
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [receiptSearch, setReceiptSearch] = useState('');
  const [refundTillId, setRefundTillId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dateFilter, setDateFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [tillFilter, setTillFilter] = useState('');

  const [selectedSale, setSelectedSale] = useState(null);
  const searchDebounceRef = useRef(null);
  const currentTillId = useOptionalTill();

  useEffect(() => {
    fetch('/api/tills', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setTills(Array.isArray(data) ? data : []))
      .catch(() => setTills([]));
  }, []);

  useEffect(() => {
    fetchSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, methodFilter, tillFilter]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (dateFilter) params.append('date', dateFilter);
      if (methodFilter) params.append('method', methodFilter);
      if (tillFilter) params.append('tillId', tillFilter);
      if (receiptSearch.trim()) params.append('receipt', receiptSearch.trim());
      const res = await fetch(`/api/sales?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await res.json();
      setSales(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  // Counts for display
  const originalsCount = sales.filter((s) => !s.refundOfSaleId).length;
  const refundDocsCount = sales.filter((s) => s.refundOfSaleId).length;
  const fullyRefundedCount = sales.filter(
    (s) => s.paymentStatus === 'refunded' && !s.refundOfSaleId
  ).length;
  const partiallyRefundedCount = sales.filter(
    (s) => s.paymentStatus === 'partially_refunded'
  ).length;

  // Net totals — sum every row; refund docs are negative
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const cashTotal = sales
    .filter((s) => s.paymentMethod === 'cash')
    .reduce((sum, s) => sum + s.total, 0);
  const cardTotal = sales
    .filter((s) => s.paymentMethod === 'card')
    .reduce((sum, s) => sum + s.total, 0);

  // Per-till breakdown (only meaningful when "All Tills" is selected)
  const perTillTotals = sales.reduce((acc, s) => {
    const key = s.tillCode || 'Unknown';
    if (!acc[key]) acc[key] = { count: 0, total: 0 };
    acc[key].count += 1;
    acc[key].total += s.total;
    return acc;
  }, {});

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasFilters = dateFilter || methodFilter || tillFilter || receiptSearch;
  const handlePartialRefund = async () => {
    const lines = Object.entries(refundForm)
      .filter(([, val]) => val !== '' && Number(val) > 0)
      .map(([idx, val]) => {
        const index = Number(idx);
        const item = refundModalSale.items[index];
        const isWeight = item.pricingType === 'weight';
        return {
          itemIndex: index,
          productId: item.productId,
          ...(isWeight ? { weight: Number(val) } : { qty: Number(val) }),
        };
      });

    if (lines.length === 0) {
      alert('Enter a quantity for at least one item');
      return;
    }

    setRefunding(true);
    try {
      const res = await fetch(`/api/sales/${refundModalSale._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          refundLines: lines,
          refundMethod,
          reason: refundReason,
          refundTillId: currentTillId || refundTillId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refund failed');

      // Print refund receipt
      fetch('/api/print/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          saleId: data.refundSale._id,
          openDrawer: refundMethod === 'cash',
          isRefund: true,
        }),
      }).catch(() => { });

      setRefundModalSale(null);
      setRefundForm({});
      setRefundReason('');
      fetchSales();
      setSelectedSale(null);
    } catch (err) {
      alert('Refund failed: ' + err.message);
    } finally {
      setRefunding(false);
    }
  };
  const badgeFor = (sale) => {
    if (sale.paymentStatus === 'refunded') {
      return { label: 'REFUNDED', cls: 'bg-red-100 text-red-700' };
    }
    if (sale.paymentStatus === 'partially_refunded') {
      return { label: 'PARTIAL REFUND', cls: 'bg-amber-100 text-amber-800' };
    }
    return {
      label: sale.paymentMethod.toUpperCase(),
      cls: sale.paymentMethod === 'cash'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-purple-100 text-purple-700',
    };
  };

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchSales();
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiptSearch]);

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <TopBar
        title="Sales History"
        actions={
          <button
            onClick={fetchSales}
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition min-h-[44px] font-semibold"
          >
            Refresh
          </button>
        }
      />

      {error && (
        <div className="bg-red-500 text-white px-6 py-3 text-center font-semibold">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-sm text-slate-500">Total Sales</p>
          <p className="text-2xl font-bold text-slate-900">
            {originalsCount}
            {fullyRefundedCount > 0 && (
              <span className="ml-2 text-sm font-normal text-red-600">
                ({fullyRefundedCount} refunded)
              </span>
            )}
            {partiallyRefundedCount > 0 && (
              <span className="ml-2 text-sm font-normal text-amber-600">
                ({partiallyRefundedCount} partial)
              </span>
            )}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-sm text-slate-500">Net Revenue</p>
          <p className="text-2xl font-bold text-green-600">
            £{totalRevenue.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-sm text-slate-500">Cash</p>
          <p className="text-2xl font-bold text-blue-600">
            £{cashTotal.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-sm text-slate-500">Card</p>
          <p className="text-2xl font-bold text-purple-600">
            £{cardTotal.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Per-till breakdown — only when showing all tills */}
      {tillFilter === '' && Object.keys(perTillTotals).length > 1 && (
        <div className="px-4 pb-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-600 mb-3">
              Sales by Till
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(perTillTotals).map(([code, { count, total }]) => (
                <div
                  key={code}
                  className="border border-slate-200 rounded-lg p-3"
                >
                  <p className="font-mono text-sm text-slate-500">{code}</p>
                  <p className="text-lg font-bold text-slate-900">
                    £{total.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500">{count} sales</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-4 pb-4 flex flex-wrap gap-3">
        <input
          type="text"
          value={receiptSearch}
          onChange={(e) => setReceiptSearch(e.target.value)}
          placeholder="Search receipt #"
          className="px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none bg-white min-h-[44px] font-mono w-56"
        />
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none bg-white min-h-[44px]"
        />
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
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none bg-white min-h-[44px]"
        >
          <option value="">All Payment Methods</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => {
              setDateFilter('');
              setMethodFilter('');
              setTillFilter('');
              setReceiptSearch('');
            }}
            className="px-4 py-3 bg-slate-200 rounded-xl hover:bg-slate-300 transition font-semibold min-h-[44px]"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Sales Table */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            Loading sales...
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <p className="text-xl mb-2">No sales found</p>
            <p className="text-sm">{receiptSearch
              ? `No receipts matching "${receiptSearch}"`
              : 'Complete a sale at the till to see it here'}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                    Receipt
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                    Till
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                    Date & Time
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                    Cashier
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                    Items
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                    Payment
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">
                    Total
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => {
                  const badge = badgeFor(sale);
                  return (
                    <tr
                      key={sale._id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition"
                    >
                      <td className="px-4 py-3 font-mono text-sm text-slate-600">
                        {sale.receiptNumber}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-slate-600">
                        {sale.tillCode ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(sale.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {sale.cashierName || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {sale.items.reduce((sum, i) => sum + i.qty, 0)} items
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        <span
                          className={
                            sale.paymentStatus === 'refunded' ? 'line-through text-red-600' : sale.paymentStatus === 'partially_refunded' ? 'text-amber-700' : 'text-slate-900'
                          }
                        >
                          £{sale.total.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedSale(sale)}
                          className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm font-semibold min-h-[40px]"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedSale && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedSale(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">
                  Receipt {selectedSale.receiptNumber}
                </h2>
                <button
                  onClick={() => setSelectedSale(null)}
                  className="w-10 h-10 bg-slate-100 rounded-lg font-bold hover:bg-slate-200 transition"
                >
                  ×
                </button>
              </div>

              <p className="text-sm text-slate-500 mb-1">
                {formatDate(selectedSale.createdAt)}
              </p>
              <p className="text-sm text-slate-500 mb-4">
                Till{' '}
                <span className="font-mono">
                  {selectedSale.tillCode ?? '—'}
                </span>
                {selectedSale.cashierName && (
                  <> · {selectedSale.cashierName}</>
                )}
              </p>

              <div className="border-t border-b border-slate-200 py-3 space-y-2">
                {selectedSale.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {item.name}
                        {item.vatCode && (
                          <span className="ml-2 text-xs text-slate-400 font-mono">
                            [{item.vatCode}]
                          </span>
                        )}
                      </p>
                      <p className="text-slate-500">
                        {item.pricingType === 'weight' ? `${(item.weight ?? 0).toFixed(3)}${item.unit || 'kg'} @ £${item.price.toFixed(2)}/${item.unit || 'kg'}` : `${item.qty} × £${item.price.toFixed(2)}`}
                      </p>
                    </div>
                    <p className="font-semibold text-slate-800">
                      £
                      {(
                        item.pricingType === 'weight'
                          ? item.price * (item.weight ?? 0)
                          : item.price * item.qty
                      ).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-3 space-y-1">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal (excl VAT)</span>
                  <span>£{selectedSale.subtotal.toFixed(2)}</span>
                </div>

                {selectedSale.vatBreakdown &&
                  selectedSale.vatBreakdown.length > 0 ? (
                  selectedSale.vatBreakdown.map((line) => (
                    <div
                      key={line.code}
                      className="flex justify-between text-sm text-slate-600"
                    >
                      <span>
                        VAT @ {line.code} ({line.rate}%)
                      </span>
                      <span>£{line.vatAmount.toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>VAT</span>
                    <span>£{selectedSale.tax.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-xl font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total</span>
                  <span>£{selectedSale.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2">
                  <span className="text-slate-500">Payment</span>
                  <span className="font-semibold uppercase">
                    {selectedSale.paymentMethod}
                  </span>
                </div>
              </div>

              {selectedSale.paymentStatus === 'refunded' ? (
                <div className="mt-4 p-3 bg-red-50 border-2 border-red-200 rounded-xl">
                  <p className="text-sm font-bold text-red-700">REFUNDED</p>
                  <p className="text-xs text-red-600 mt-1">
                    {selectedSale.refundedAt &&
                      new Date(selectedSale.refundedAt).toLocaleString('en-GB')}
                    {selectedSale.refundedByName &&
                      ` · by ${selectedSale.refundedByName}`}
                  </p>
                  {selectedSale.refundReason && (
                    <p className="text-xs text-red-600 mt-1">
                      Reason: {selectedSale.refundReason}
                    </p>
                  )}
                </div>
              ) : (
                canRefund && (
                  <button
                    onClick={() => {
                      setRefundModalSale(selectedSale);
                      setRefundMethod(selectedSale.paymentMethod);
                      setRefundTillId(currentTillId || selectedSale.tillId);
                      setRefundForm({});
                      setRefundReason('');
                    }}
                    className="w-full mt-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 min-h-[44px]"
                  >
                    Refund...
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
      {refundModalSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                Refund {refundModalSale.receiptNumber}
              </h2>
              <p className="text-sm text-slate-500">
                Select quantities to refund
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {refundModalSale.items.map((item, idx) => {
                const origAmount =
                  item.pricingType === 'weight' ? (item.weight ?? 0) : item.qty;
                const alreadyRefunded = item.qtyRefunded || 0;
                const remaining = origAmount - alreadyRefunded;
                const key = String(idx);
                const isWeight = item.pricingType === 'weight';

                return (
                  <div key={key} className="bg-slate-50 rounded-xl p-3">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-slate-500 mb-2">
                      {isWeight
                        ? `${remaining.toFixed(3)}${item.unit} remaining of ${origAmount.toFixed(3)}${item.unit}`
                        : `${remaining} remaining of ${item.qty}`}
                      {alreadyRefunded > 0 && (
                        <span className="ml-2 text-amber-600">
                          ({alreadyRefunded} already refunded)
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2">
                      <label className="text-sm">
                        Refund {isWeight ? 'weight' : 'qty'}:
                      </label>
                      <input
                        type="number"
                        step={isWeight ? '0.001' : '1'}
                        min="0"
                        max={remaining}
                        value={refundForm[key] ?? ''}
                        onChange={(e) =>
                          setRefundForm((p) => ({ ...p, [key]: e.target.value }))
                        }
                        className="w-28 px-3 py-2 rounded-lg border-2 border-slate-300 text-center"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setRefundForm((p) => ({ ...p, [key]: String(remaining) }))
                        }
                        className="text-xs px-2 py-1 bg-slate-200 rounded"
                      >
                        All
                      </button>
                    </div>
                  </div>
                );
              })}

              <div>
                <label className="block text-sm font-semibold mb-2">Refund method</label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Reason (optional)</label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300"
                />
              </div>
            {!currentTillId && (
              <div>
                <label className="block text-sm font-semibold mb-2">Refund to till</label>
                <select
                  value={refundTillId}
                  onChange={(e) => setRefundTillId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300"
                  >
                  <option value="">— Select a till —</option>
                  {tills.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.code}
                      {t.name ? ` · ${t.name}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Choose which till's shift this refund is recorded against.
                </p>
              </div>
            )}
            </div>
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={() => {
                  setRefundModalSale(null);
                  setRefundForm({});
                  setRefundReason('');
                }}
                className="flex-1 py-3 bg-slate-200 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handlePartialRefund}
                disabled={refunding || (!currentTillId && !refundTillId)}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl disabled:opacity-50"
              >
                {refunding ? 'Processing…' : 'Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SalesPage() {
  return (
    <ProtectedRoute requiredPermissions={['read:sales']}>
      <SalesHistory />
    </ProtectedRoute>
  );
}