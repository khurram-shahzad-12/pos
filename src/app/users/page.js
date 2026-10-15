// src/app/users/page.js
'use client';

import { useState, useEffect } from 'react';
import TopBar from '@/components/TopBar';
import ProtectedRoute from '@/components/ProtectedRoute';
import RegisterUserDialog from '@/components/ManageUsers/RegisterUserDialog';
import RoleDialog from '@/components/ManageUsers/RoleDialog';
import ManagePermissions from '@/components/ManageUsers/ManagePermissions';

function UsersPageInner() {
  const [tab, setTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', type: 'success' });

  const [registerOpen, setRegisterOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [roleOpen, setRoleOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const showSnack = (message, type = 'success') => {
    setSnack({ open: true, message, type });
    setTimeout(() => setSnack((s) => ({ ...s, open: false })), 3000);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [uRes, rRes, pRes] = await Promise.all([
        fetch('/api/users', { credentials: 'include' }),
        fetch('/api/roles', { credentials: 'include' }),
        fetch('/api/permissions', { credentials: 'include' }),
      ]);
      const uData = await uRes.json();
      const rData = await rRes.json();
      const pData = await pRes.json();

      setUsers(uData.users || []);
      setRoles(rData.data || []);
      setPermissions(pData.data || []);
    } catch {
      showSnack('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filteredUsers = users.filter((u) =>
    `${u.firstName} ${u.lastName} ${u.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleDeleteUser = async (id) => {
    if (!confirm('Delete this user?')) return;
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      showSnack('User deleted');
      fetchAll();
    } else {
      const data = await res.json();
      showSnack(data.error || 'Delete failed', 'error');
    }
  };

  const handleToggleStatus = async (id, isActive) => {
    const res = await fetch(`/api/users/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) {
      showSnack('Status updated');
      fetchAll();
    } else {
      const data = await res.json();
      showSnack(data.error || 'Update failed', 'error');
    }
  };

  const handleDeleteRole = async (id) => {
    if (!confirm('Delete this role? Users with this role will lose it.')) return;
    const res = await fetch(`/api/roles/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      showSnack('Role deleted');
      fetchAll();
    } else {
      const data = await res.json();
      showSnack(data.error || 'Delete failed', 'error');
    }
  };

  const stats = [
    { label: 'Total Users', value: users.length, color: 'blue' },
    { label: 'Active', value: users.filter((u) => u.isActive).length, color: 'green' },
    { label: 'Roles', value: roles.length, color: 'purple' },
    { label: 'Permissions', value: permissions.length, color: 'amber' },
  ];

  const tabs = [
    { label: `Users (${users.length})` },
    { label: `Roles (${roles.length})` },
    { label: `Permissions (${permissions.length})` },
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      {/* ✅ TopBar replaces hardcoded header */}
      <TopBar
        title="User Management"
        actions={
          <button
            onClick={fetchAll}
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition min-h-[44px] font-semibold"
          >
            Refresh
          </button>
        }
      />

      {/* Snackbar */}
      {snack.open && (
        <div
          className={`px-6 py-3 text-center font-semibold ${
            snack.type === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-green-500 text-white'
          }`}
        >
          {snack.message}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="flex border-b border-slate-200">
            {tabs.map((t, i) => (
              <button
                key={t.label}
                onClick={() => setTab(i)}
                className={`px-6 py-4 font-semibold transition min-h-[44px] ${
                  tab === i
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-4">
            {tab === 0 && (
              <>
                <div className="flex gap-3 mb-4">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search users..."
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none bg-white"
                  />
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      setRegisterOpen(true);
                    }}
                    className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 min-h-[44px]"
                  >
                    + Add User
                  </button>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                          Role
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                          Status
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                            No users found
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr
                            key={u._id}
                            className="border-t border-slate-100 hover:bg-slate-50"
                          >
                            <td className="px-4 py-3 font-semibold text-slate-800">
                              {u.firstName} {u.lastName}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{u.email}</td>
                            <td className="px-4 py-3">
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                                {u.role?.displayName || 'No role'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  u.isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {u.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingUser(u);
                                    setRegisterOpen(true);
                                  }}
                                  className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-200 min-h-[40px]"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(u._id, u.isActive)}
                                  className="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-semibold hover:bg-amber-200 min-h-[40px]"
                                >
                                  {u.isActive ? 'Disable' : 'Enable'}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u._id)}
                                  className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200 min-h-[40px]"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {tab === 1 && (
              <>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => {
                      setEditingRole(null);
                      setRoleOpen(true);
                    }}
                    className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 min-h-[44px]"
                  >
                    + Add Role
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roles.map((r) => (
                    <div
                      key={r._id}
                      className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-slate-800 text-lg">
                          {r.displayName}
                        </h3>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
                          {r.permissions?.length || 0} perms
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 font-mono mb-1">
                        {r.name}
                      </p>
                      <p className="text-sm text-slate-500 mb-4">
                        {r.description || 'No description'}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingRole(r);
                            setRoleOpen(true);
                          }}
                          className="flex-1 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 min-h-[40px]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRole(r._id)}
                          className="flex-1 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 min-h-[40px]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {roles.length === 0 && (
                    <div className="col-span-full text-center text-slate-400 py-8">
                      No roles yet
                    </div>
                  )}
                </div>
              </>
            )}

            {tab === 2 && (
              <ManagePermissions
                permissions={permissions}
                onRefresh={fetchAll}
                showSnack={showSnack}
              />
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <RegisterUserDialog
        open={registerOpen}
        onClose={() => {
          setRegisterOpen(false);
          setEditingUser(null);
        }}
        onSuccess={() => {
          showSnack('Saved');
          fetchAll();
        }}
        onError={(msg) => showSnack(msg, 'error')}
        user={editingUser}
        roles={roles}
      />

      <RoleDialog
        open={roleOpen}
        onClose={() => {
          setRoleOpen(false);
          setEditingRole(null);
        }}
        onSuccess={() => {
          showSnack('Saved');
          fetchAll();
        }}
        role={editingRole}
        permissions={permissions}
      />
    </div>
  );
}

export default function UsersPage() {
  return (
    <ProtectedRoute requiredPermissions={['read:users']}>
      <UsersPageInner />
    </ProtectedRoute>
  );
}