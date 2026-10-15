'use client';

import { useState, useEffect } from 'react';
import { useTill } from '@/components/TillProvider';
import { usePosTopBar } from '@/lib/context/PosTopBarContext';
import OpenShiftScreen from '@/components/OpenShiftScreen';

function ZReportPage() {
  const tillId = useTill();
  const { setConfig } = usePosTopBar();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actualCash, setActualCash] = useState('');
  const [takenOut, setTakenOut] = useState('');
  const [left, setLeft] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedReport, setSavedReport] = useState(null);
  const [storeTz, setStoreTz] = useState('Europe/London');
  const [showOpenShift, setShowOpenShift] = useState(false);

  useEffect(() => {
    fetch('/api/settings', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s?.timeZone && setStoreTz(s.timeZone))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tillId]);

  const fetchPreview = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(
        `/api/zreport/preview?tillId=${encodeURIComponent(tillId)}`,
        { credentials: 'include' }
      );
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

  useEffect(() => {
    setConfig({
      title: 'Z Report — Daily Cash-Up',
      actions: (
        <button
          onClick={fetchPreview}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition min-h-[44px] font-semibold"
        >
          Refresh
        </button>
      ),
    });
    return () => setConfig({ title: 'Cash & Carry POS', actions: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setConfig]);

  const variance =
    data && actualCash !== ''
      ? Math.round((parseFloat(actualCash) - data.expectedCash) * 100) / 100
      : 0;

  const mismatch =
    takenOut !== '' &&
    left !== '' &&
    actualCash !== '' &&
    Math.abs(
      parseFloat(takenOut) + parseFloat(left) - parseFloat(actualCash)
    ) > 0.005;

  // ── Handlers ────────────────────────────────────────────────
  const handleActualCashChange = (value) => {
    setActualCash(value);

    const a = parseFloat(value);
    if (!Number.isNaN(a)) {
      // Suggest a split: leave the previous float in the drawer, take the rest out.
      const suggested = data?.suggestedOpeningFloat ?? 0;
      const keepAmt = Math.min(suggested, a);
      setLeft(keepAmt.toFixed(2));
      setTakenOut(Math.max(0, a - keepAmt).toFixed(2));
    } else {
      setLeft('');
      setTakenOut('');
    }
  };

  const handleTakenOutChange = (value) => {
    setTakenOut(value);
    const a = parseFloat(actualCash);
    const t = parseFloat(value);
    if (!Number.isNaN(a) && !Number.isNaN(t)) {
      setLeft(Math.max(0, a - t).toFixed(2));
    }
  };

  const handleLeftChange = (value) => {
    setLeft(value);
    const a = parseFloat(actualCash);
    const l = parseFloat(value);
    if (!Number.isNaN(a) && !Number.isNaN(l)) {
      setTakenOut(Math.max(0, a - l).toFixed(2));
    }
  };

  const handleSaveReport = async () => {
    if (actualCash === '') {
      setError('Enter the actual cash counted in the drawer');
      return;
    }
    const actual = parseFloat(actualCash);
    if (!Number.isFinite(actual) || actual < 0) {
      setError('Actual cash must be a non-negative number');
      return;
    }
    if (takenOut === '' || left === '') {
      setError('Enter both cash taken out and cash left in drawer');
      return;
    }
    if (mismatch) {
      setError('Cash taken out + cash left must equal actual cash counted');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/zreport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tillId,
          actualCash: actual,
          takenOut: parseFloat(takenOut) || 0,
          left: parseFloat(left) || 0,
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');

      setSavedReport(json);

      fetch('/api/print/zreport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reportId: json._id }),
      }).catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDone = () => {
    setSavedReport(null);
    setData(null);
    setActualCash('');
    setTakenOut('');
    setLeft('');
    setNotes('');
    // fetchPreview();
    setShowOpenShift(true);
  };

  const fmt = (n) => `£${(n || 0).toFixed(2)}`;
  const fmtTime = (iso) =>
    new Date(iso).toLocaleString('en-GB', { timeZone: storeTz });

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-100 text-slate-400">
        Loading today&apos;s totals…
      </div>
    );
  }

  // ── No open shift ──────────────────────────────────────────
if (!data && !savedReport) {
  // When the cashier chose to start a shift, show the full-screen form.
  // Rendered directly (not via ShiftGuard) so it works immediately
  // after a Z report closes the current shift.
  if (showOpenShift) {
    return (
      <OpenShiftScreen
        onOpened={() => {
          setShowOpenShift(false);
          fetchPreview();
        }}
      />
    );
  }

  return (
    <div className="h-full flex items-center justify-center p-6 bg-slate-100">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-amber-600"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-2.99l-6.93-12a2 2 0 00-3.48 0l-6.93 12A2 2 0 005.07 19z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          No open shift
        </h2>
        <p className="text-slate-500 mb-6">
          {error || 'Start a new shift to continue.'}
        </p>
        <button
          onClick={() => setShowOpenShift(true)}
          className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 min-h-[60px]"
        >
          Start New Shift
        </button>
      </div>
    </div>
  );
}

  // ── Saved confirmation ─────────────────────────────────────
  if (savedReport) {
    return (
      <div className="h-full overflow-y-auto p-6 bg-slate-100">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-12 h-12 text-green-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Z Report Saved
          </h2>
          <p className="text-slate-500 mb-6">
            Report #{savedReport.reportNumber}
          </p>

          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left space-y-1">
            <Row label="Expected Cash" value={fmt(savedReport.expectedCash)} />
            <Row label="Actual Cash" value={fmt(savedReport.actualCash)} />
            <Row label="Taken Out" value={fmt(savedReport.takenOut)} />
            <Row
              label="Left for Next Shift"
              value={fmt(savedReport.leftForNextShift)}
              bold
            />
            <Row
              label={
                savedReport.variance === 0
                  ? 'Balanced'
                  : savedReport.variance > 0
                  ? 'Overage'
                  : 'Shortage'
              }
              value={`${savedReport.variance >= 0 ? '+' : ''}${fmt(
                savedReport.variance
              )}`}
              bold
              red={savedReport.variance < 0}
            />
          </div>

          <button
            onClick={handleDone}
            className="w-full py-4 bg-blue-600 text-white text-lg font-bold rounded-xl hover:bg-blue-500 min-h-[60px]"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ── Main cash-up form ──────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto bg-slate-100">
      {error && (
        <div className="bg-red-500 text-white px-6 py-3 text-center font-semibold">
          {error}
        </div>
      )}

      <div className="p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Period */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Report Period
            </h2>
            <p className="text-sm text-slate-600">
              From: <span className="font-mono">{fmtTime(data.periodStart)}</span>
            </p>
            <p className="text-sm text-slate-600">
              To: <span className="font-mono">{fmtTime(data.periodEnd)}</span>
            </p>
          </div>

          {/* Sales Summary */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              Sales Summary
            </h2>
            <div className="space-y-2">
              <Row label="Gross Sales" value={fmt(data.grossSales)} />
              <Row
                label={`Transactions (${data.transactionsCount})`}
                value={`£${data.transactionsCount > 0
                  ? (data.grossSales / data.transactionsCount).toFixed(2)
                  : '0.00'} avg`}
              />
              <Row
                label={`Refunds (${data.refundsCount})`}
                value={'-' + fmt(data.refundsTotal)}
                red
              />
              <Row label="Net Revenue" value={fmt(data.netRevenue)} bold border />
            </div>
          </div>

          {/* VAT Breakdown */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              VAT Collected
            </h2>
            <div className="space-y-2">
              {data.vatBreakdown.length === 0 && (
                <p className="text-slate-400 text-sm">No VAT recorded</p>
              )}
              {data.vatBreakdown.map((v) => (
                <Row
                  key={v.code}
                  label={`VAT @ ${v.code} (${v.rate}%) on ${fmt(v.taxableAmount)}`}
                  value={fmt(v.vatAmount)}
                />
              ))}
              <Row label="Total VAT" value={fmt(data.totalVat)} bold border />
            </div>
          </div>

          {/* Payment Split */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              Payment Split
            </h2>
            <div className="space-y-2">
              <Row label="Cash Sales" value={fmt(data.cashSales)} />
              <Row label="Card Sales" value={fmt(data.cardSales)} />
              {data.cashRefunds > 0 && (
                <Row
                  label="Cash Refunds"
                  value={'-' + fmt(data.cashRefunds)}
                  red
                />
              )}
              {data.cardRefunds > 0 && (
                <Row
                  label="Card Refunds"
                  value={'-' + fmt(data.cardRefunds)}
                  red
                />
              )}
            </div>
          </div>

          {/* Cash Reconciliation */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              Cash Reconciliation
            </h2>
            <div className="space-y-2">
              <Row label="Opening Float" value={fmt(data.openingFloat)} />
              <Row label="+ Cash Sales" value={fmt(data.cashSales)} />
              <Row
                label="− Cash Refunds"
                value={'-' + fmt(data.cashRefunds)}
              />
              <Row
                label="Expected in Drawer"
                value={fmt(data.expectedCash)}
                bold
                border
              />

              <div className="pt-4 mt-4 border-t border-slate-200">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Actual Cash Counted (£) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={actualCash}
                  onChange={(e) => handleActualCashChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-4 text-2xl text-center font-bold rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {actualCash !== '' && (
                <div
                  className={`mt-4 p-4 rounded-xl text-center border-2 ${
                    variance === 0
                      ? 'bg-green-50 border-green-200'
                      : variance > 0
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-600">
                    {variance === 0
                      ? 'Balanced'
                      : variance > 0
                      ? 'Overage'
                      : 'Shortage'}
                  </p>
                  <p
                    className={`text-3xl font-bold ${
                      variance === 0
                        ? 'text-green-700'
                        : variance > 0
                        ? 'text-blue-700'
                        : 'text-red-700'
                    }`}
                  >
                    {variance >= 0 ? '+' : ''}£{variance.toFixed(2)}
                  </p>
                </div>
              )}

              <div className="pt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Cash Taken Out (£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={takenOut}
                    onChange={(e) => handleTakenOutChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 text-xl text-center font-bold rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Cash removed from the drawer (to safe / bank).
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Cash Left in Drawer (£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={left}
                    onChange={(e) => handleLeftChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 text-xl text-center font-bold rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Becomes the suggested opening float for the next shift.
                  </p>
                </div>
              </div>

              {/* Mismatch warning */}
              {mismatch && (
                <div className="mt-3 p-3 bg-amber-50 border-2 border-amber-200 rounded-xl text-center text-amber-700 text-sm font-semibold">
                  Taken out + Left must equal Actual Cash Counted (£
                  {parseFloat(actualCash).toFixed(2)})
                </div>
              )}

              {data.suggestedOpeningFloat > 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  Previous shift left{' '}
                  <span className="font-semibold">
                    {fmt(data.suggestedOpeningFloat)}
                  </span>{' '}
                  in the drawer — suggested opening float for next shift.
                </p>
              )}

              <div className="pt-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any notes about this shift…"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSaveReport}
            disabled={
              saving ||
              actualCash === '' ||
              takenOut === '' ||
              left === '' ||
              mismatch
            }
            className="w-full py-4 bg-green-600 text-white text-lg font-bold rounded-xl hover:bg-green-500 disabled:opacity-50 min-h-[60px]"
          >
            {saving ? 'Saving…' : 'Close Shift & Save Z Report'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, red, border }) {
  return (
    <div
      className={`flex justify-between ${
        border ? 'pt-2 border-t border-slate-200' : ''
      }`}
    >
      <span className={bold ? 'font-bold text-slate-900' : 'text-slate-600'}>
        {label}
      </span>
      <span
        className={`${red ? 'text-red-600' : 'text-slate-900'} ${
          bold ? 'font-bold text-lg' : 'font-semibold'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default ZReportPage;