// src/components/ManageUsers/ManagePermissions.js
'use client';

import { useState } from 'react';

export default function ManagePermissions({
  permissions = [],
  onRefresh,
  showSnack,
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    module: '',
    action: 'read',
    description: '',
  });
  const [loading, setLoading] = useState(false);

  const openDialog = (p = null) => {
    if (p) {
      setEditing(p);
      setForm({
        module: p.module,
        action: p.action,
        description: p.description || '',
      });
    } else {
      setEditing(null);
      setForm({ module: '', action: 'read', description: '' });
    }
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editing ? `/api/permissions/${editing._id}` : '/api/permissions';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showSnack?.(editing ? 'Permission updated' : 'Permission created');
      setOpen(false);
      onRefresh?.();
    } catch (err) {
      showSnack?.(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this permission?')) return;
    const res = await fetch(`/api/permissions/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await res.json();
    if (res.ok) {
      showSnack?.('Permission deleted');
      onRefresh?.();
    } else {
      showSnack?.(data.error, 'error');
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => openDialog()}
          className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 min-h-[44px]"
        >
          + Add Permission
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                Module
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                Action
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                Description
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((p) => (
              <tr
                key={p._id}
                className="border-t border-slate-100 hover:bg-slate-50"
              >
                <td className="px-4 py-3 font-semibold text-slate-800 capitalize">
                  {p.module}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                    {p.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {p.description || '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => openDialog(p)}
                      disabled={p.isProtected}
                      className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-200 disabled:opacity-40 min-h-[40px]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p._id)}
                      disabled={p.isProtected}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200 disabled:opacity-40 min-h-[40px]"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {permissions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  No permissions yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
          >
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {editing ? 'Edit Permission' : 'Add Permission'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Module *
                </label>
                <input
                  type="text"
                  value={form.module}
                  onChange={(e) => setForm({ ...form, module: e.target.value })}
                  placeholder="products"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Action *
                </label>
                <select
                  value={form.action}
                  onChange={(e) => setForm({ ...form, action: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
                >
                  {['create', 'read', 'update', 'delete', 'write', 'edit'].map(
                    (a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 py-3 bg-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-300 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 disabled:opacity-50 min-h-[44px]"
              >
                {loading ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}