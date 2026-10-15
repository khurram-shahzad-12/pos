// src/components/ManageUsers/RoleDialog.js
'use client';

import { useState, useEffect, useMemo } from 'react';

export default function RoleDialog({
  open,
  onClose,
  onSuccess,
  role = null,
  permissions = [],
}) {
  const isEditing = !!role;
  const [form, setForm] = useState({
    name: '',
    displayName: '',
    description: '',
    permissions: [],
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    if (open) {
      if (role) {
        setForm({
          name: role.name || '',
          displayName: role.displayName || '',
          description: role.description || '',
          permissions: role.permissions?.map((p) => p._id || p) || [],
        });
      } else {
        setForm({
          name: '',
          displayName: '',
          description: '',
          permissions: [],
        });
      }
      setErrors({});
    }
  }, [open, role]);

  const grouped = useMemo(() => {
    return permissions.reduce((acc, p) => {
      const mod = p.module || 'other';
      if (!acc[mod]) acc[mod] = [];
      acc[mod].push(p);
      return acc;
    }, {});
  }, [permissions]);

  const togglePermission = (id) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(id)
        ? f.permissions.filter((x) => x !== id)
        : [...f.permissions, id],
    }));
  };

  const toggleModule = (mod) => {
    setExpanded((e) => ({ ...e, [mod]: !e[mod] }));
  };

  const selectAllModule = (mod) => {
    const ids = grouped[mod].map((p) => p._id);
    const allSelected = ids.every((id) => form.permissions.includes(id));
    setForm((f) => ({
      ...f,
      permissions: allSelected
        ? f.permissions.filter((id) => !ids.includes(id))
        : [...new Set([...f.permissions, ...ids])],
    }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    else if (!/^[a-z_]+$/.test(form.name))
      e.name = 'Lowercase letters and underscores only';
    if (!form.displayName.trim()) e.displayName = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const url = isEditing ? `/api/roles/${role._id}` : '/api/roles';
      const method = isEditing ? 'PUT' : 'POST';

      const payload = {
        name: form.name,
        displayName: form.displayName,
        description: form.description,
        permissions: form.permissions,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      onSuccess?.();
      onClose();
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {isEditing ? 'Edit Role' : 'Create New Role'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isEditing
              ? 'Update role details and permissions'
              : 'Define a new role and assign permissions'}
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Role Name (slug) *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={isEditing}
                placeholder="cashier"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none font-mono disabled:bg-slate-100"
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Display Name *
              </label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) =>
                  setForm({ ...form, displayName: e.target.value })
                }
                placeholder="Cashier"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
              />
              {errors.displayName && (
                <p className="text-xs text-red-500 mt-1">{errors.displayName}</p>
              )}
            </div>
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

          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-800">Permissions</h3>
              <span className="text-sm font-semibold text-blue-600">
                {form.permissions.length} selected
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl max-h-80 overflow-y-auto p-3 space-y-2">
              {Object.keys(grouped).sort().map((mod) => {
                const ids = grouped[mod].map((p) => p._id);
                const allSelected = ids.every((id) =>
                  form.permissions.includes(id)
                );
                const isOpen = expanded[mod] !== false;

                return (
                  <div key={mod} className="border border-slate-100 rounded-lg">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-t-lg">
                      <button
                        type="button"
                        onClick={() => toggleModule(mod)}
                        className="flex items-center gap-2 font-semibold text-slate-700 capitalize"
                      >
                        {isOpen ? '▼' : '▶'} {mod} ({ids.length})
                      </button>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => selectAllModule(mod)}
                          className="w-4 h-4"
                        />
                        Select All
                      </label>
                    </div>
                    {isOpen && (
                      <div className="grid grid-cols-2 gap-2 p-3">
                        {grouped[mod].map((p) => (
                          <label
                            key={p._id}
                            className="flex items-start gap-2 text-sm cursor-pointer p-2 rounded hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={form.permissions.includes(p._id)}
                              onChange={() => togglePermission(p._id)}
                              className="w-4 h-4 mt-0.5"
                            />
                            <span>
                              <span className="font-semibold text-slate-700 capitalize">
                                {p.action}
                              </span>
                              {p.description && (
                                <span className="block text-xs text-slate-500">
                                  {p.description}
                                </span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {permissions.length === 0 && (
                <p className="text-center text-slate-400 py-4">
                  No permissions available
                </p>
              )}
            </div>
          </div>

          {errors.submit && (
            <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg text-sm font-semibold">
              {errors.submit}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-300 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 disabled:opacity-50 min-h-[44px]"
          >
            {loading ? 'Saving...' : isEditing ? 'Update Role' : 'Create Role'}
          </button>
        </div>
      </form>
    </div>
  );
}