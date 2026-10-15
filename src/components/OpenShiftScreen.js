'use client';
import { useState, useEffect } from 'react';
import { useTill } from '@/components/TillProvider';

export default function OpenShiftScreen({ onOpened, suggestedFloat }) {
  const tillId = useTill();
  const [openingFloat, setOpeningFloat] = useState('');
  const [suggestion, setSuggestion] = useState(suggestedFloat ?? 0);
  const [loadingSuggestion, setLoadingSuggestion] = useState(suggestedFloat == null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // If the parent didn't pass a suggestedFloat, fetch it ourselves
  useEffect(() => {
    if (!tillId) return;
    if (suggestedFloat != null) {
      // Parent already provided it
      setSuggestion(suggestedFloat);
      setOpeningFloat(suggestedFloat > 0 ? suggestedFloat.toFixed(2) : '');
      setLoadingSuggestion(false);
      return;
    }

    let cancelled = false;
    fetch(`/api/shifts/suggested-float?tillId=${encodeURIComponent(tillId)}`, {
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const amt = Number(d?.suggestedOpeningFloat) || 0;
        setSuggestion(amt);
        setOpeningFloat(amt > 0 ? amt.toFixed(2) : '');
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingSuggestion(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tillId, suggestedFloat]);

  const handleOpen = async () => {
    if (openingFloat === '') {
      setError('Enter the cash counted in the drawer');
      return;
    }
    const float = parseFloat(openingFloat);
    if (!Number.isFinite(float) || float < 0) {
      setError('Opening float must be a non-negative number');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/shifts/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tillId, openingFloat: float }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to open shift');
      onOpened(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Open Shift
            </h1>
            <p className="text-slate-500 text-sm">
              Till <span className="font-mono font-semibold">{tillId}</span>
            </p>
          </div>

          <p className="text-slate-600 text-center mb-6">
            Count the cash in the drawer before you start. This becomes the
            opening float for this shift.
          </p>

          {error && (
            <div className="bg-red-500 text-white px-4 py-3 rounded-xl mb-4 text-sm font-semibold">
              {error}
            </div>
          )}

          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Opening Float (£) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={openingFloat}
            onChange={(e) => setOpeningFloat(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleOpen()}
            placeholder={loadingSuggestion ? 'Loading…' : '0.00'}
            autoFocus
            className="w-full px-4 py-4 text-2xl text-center font-bold rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
          />

          {suggestion > 0 && (
            <p className="text-xs text-slate-500 mt-2">
              Carried over from previous shift:{' '}
              <span className="font-semibold">£{suggestion.toFixed(2)}</span>.
              Adjust if the drawer contains a different amount.
            </p>
          )}

          <button
            onClick={handleOpen}
            disabled={saving || openingFloat === '' || loadingSuggestion}
            className="w-full py-4 mt-6 bg-green-600 text-white text-lg font-bold rounded-xl hover:bg-green-500 active:scale-95 disabled:opacity-50 transition min-h-[60px]"
          >
            {saving ? 'Opening Shift…' : 'Start Shift'}
          </button>
        </div>
      </div>
    </div>
  );
}