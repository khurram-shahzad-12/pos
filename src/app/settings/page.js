'use client';
import { useState, useEffect } from 'react';
import TopBar from '@/components/TopBar';
import ProtectedRoute from '@/components/ProtectedRoute';

function SettingsPage() {
  const [settings, setSettings] = useState({
    storeName: 'Cash & Carry',
    storeAddress: '',
    vatNumber: '',
    currency: 'GBP',
    receiptFooter: 'Thank you for your shopping!',
    timeZone: 'Europe/London',
    cashDrawerEnabled: true,
    autoPrintReceipt: true,
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setSettings((prev) => ({ ...prev, ...data }));
      }
    } catch (err) {
      setError('Failed to load settings');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      setSettings((prev) => ({ ...prev, ...data }));
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <TopBar title="Settings" />

      {error && (
        <div className="bg-red-500 text-white px-6 py-3 text-center font-semibold">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500 text-white px-6 py-3 text-center font-semibold">
          {success}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSave} className="max-w-3xl mx-auto space-y-6">
          {/* Store Details */}
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              Store Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Store Name
                </label>
                <input
                  type="text"
                  name="storeName"
                  value={settings.storeName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Address
                </label>
                <textarea
                  name="storeAddress"
                  value={settings.storeAddress}
                  onChange={handleChange}
                  rows={3}
                  placeholder="123 High Street&#10;London&#10;SW1A 1AA"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    VAT Number
                  </label>
                  <input
                    type="text"
                    name="vatNumber"
                    value={settings.vatNumber}
                    onChange={handleChange}
                    placeholder="GB123456789"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Currency
                  </label>
                  <input
                    type="text"
                    name="currency"
                    value={settings.currency}
                    onChange={handleChange}
                    placeholder="GBP"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Receipt Footer Message
                </label>
                <input
                  type="text"
                  name="receiptFooter"
                  value={settings.receiptFooter}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Store Time Zone
                </label>
                <input
                  type="text"
                  name="timeZone"
                  value={settings.timeZone || 'Europe/London'}
                  onChange={handleChange}
                  placeholder="Europe/London"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none font-mono"
                />
                <p className="text-xs text-slate-500 mt-1">
                  IANA timezone (e.g. Europe/London). Controls daily report boundaries.
                </p>
              </div>
            </div>
          </section>

          {/* Hardware Defaults */}
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              Hardware Defaults
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Applies to all tills unless overridden.
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="cashDrawerEnabled"
                  checked={settings.cashDrawerEnabled}
                  onChange={handleChange}
                  className="w-5 h-5"
                />
                <span className="text-slate-700">
                  Open cash drawer automatically on cash payment
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="autoPrintReceipt"
                  checked={settings.autoPrintReceipt}
                  onChange={handleChange}
                  className="w-5 h-5"
                />
                <span className="text-slate-700">
                  Auto-print receipt after each sale
                </span>
              </label>
            </div>
          </section>

          {/* Save global settings */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-4 bg-green-600 text-white text-lg font-bold rounded-xl hover:bg-green-500 active:scale-95 transition disabled:opacity-50 min-h-[60px]"
            >
              {saving ? 'Saving...' : 'Save Store Settings'}
            </button>
          </div>
        </form>

        {/* Tills — separate from store settings, own add/edit/delete */}
        <TillsSection />
      </div>
    </div>
  );
}

export default function SettingsPageWrapper() {
  return (
    <ProtectedRoute requiredPermissions={['read:settings']}>
      <SettingsPage />
    </ProtectedRoute>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Tills section — list, add, edit, delete                    */
/* ──────────────────────────────────────────────────────────── */

function TillsSection() {
  const [tills, setTills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | {} (new) | till obj
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    fetch('/api/tills', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setTills(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load tills'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (till) => {
    if (!confirm(`Delete till ${till.code} — ${till.name}?`)) return;
    const res = await fetch(`/api/tills/${till._id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) load();
    else alert('Delete failed');
  };

  const handleTestPrinter = async (till) => {
    if (!till.printerIp) {
      alert('No printer IP set for this till');
      return;
    }
    const res = await fetch(`/api/print/test?tillId=${till._id}`, {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) alert('Test receipt sent!');
    else {
      const data = await res.json().catch(() => ({}));
      alert('Printer connection failed: ' + (data.error || 'unknown error'));
    }
  };

  return (
    <section className="max-w-3xl mx-auto mt-6 bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Tills</h2>
          <p className="text-sm text-slate-500">
            Each till has its own printer, Stripe reader and cash drawer.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing({})}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 min-h-[44px]"
        >
          + Add Till
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-red-700 text-sm font-semibold text-center mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-slate-400 text-center py-8">Loading tills…</p>
      ) : tills.length === 0 ? (
        <p className="text-slate-500 text-center py-8">
          No tills yet. Add one to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {tills.map((t) => (
            <div
              key={t._id}
              className="flex items-center justify-between bg-slate-50 rounded-xl p-4"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800">
                  <span className="font-mono">{t.code}</span> · {t.name}
                  {!t.active && (
                    <span className="ml-2 text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                      inactive
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  {t.printerIp ? `${t.printerIp}:${t.printerPort || '9100'}` : 'no printer set'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTestPrinter(t)}
                  disabled={!t.printerIp}
                  className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 disabled:opacity-40 min-h-[40px]"
                >
                  Test Receipt
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(t)}
                  className="px-3 py-2 bg-slate-200 rounded-lg font-semibold hover:bg-slate-300 min-h-[40px]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(t)}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 min-h-[40px]"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <TillEditModal
          till={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </section>
  );
}

function TillEditModal({ till, onClose, onSaved }) {
  const isNew = !till._id;
  const [form, setForm] = useState({
    name: till.name || '',
    code: till.code || '',
    location: till.location || '',
    printerIp: till.printerIp || '',
    printerPort: till.printerPort || '9100',
    stripeReaderId: till.stripeReaderId || '',
    stripeLocationId: till.stripeLocationId || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const url = isNew ? '/api/tills' : `/api/tills/${till._id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onSaved(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-900">
            {isNew ? 'Add Till' : `Edit ${till.code}`}
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Till Code *
              </label>
              <input
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="T1"
                disabled={!isNew}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none font-mono disabled:bg-slate-100"
              />
              {!isNew && (
                <p className="text-xs text-slate-500 mt-1">
                  Code cannot be changed after creation.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Name *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Counter 1"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Location (optional)
            </label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Front of shop"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 border-t border-slate-200">
            <h4 className="text-sm font-bold text-slate-700 mb-3">
              Receipt Printer
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Printer IP
                </label>
                <input
                  name="printerIp"
                  value={form.printerIp}
                  onChange={handleChange}
                  placeholder="192.168.1.101"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Port
                </label>
                <input
                  name="printerPort"
                  value={form.printerPort}
                  onChange={handleChange}
                  placeholder="9100"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <h4 className="text-sm font-bold text-slate-700 mb-3">
              Stripe Terminal
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Reader ID
                </label>
                <input
                  name="stripeReaderId"
                  value={form.stripeReaderId}
                  onChange={handleChange}
                  placeholder="tmr_xxxxxxxxxxxx"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Location ID
                </label>
                <input
                  name="stripeLocationId"
                  value={form.stripeLocationId}
                  onChange={handleChange}
                  placeholder="tml_xxxxxxxxxxxx"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-red-700 text-sm font-semibold text-center">
              {error}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-200 rounded-xl font-semibold hover:bg-slate-300 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !form.name || !form.code}
            className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 disabled:opacity-50 min-h-[44px]"
          >
            {saving ? 'Saving…' : isNew ? 'Create Till' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}