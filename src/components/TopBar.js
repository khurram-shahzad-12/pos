'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { useTillStore } from '@/lib/store/tillStore';
import { useCartStore } from '@/lib/store/cartStore';

export default function TopBar({ title = 'POS', actions = null }) {
  const router = useRouter();
  const params = useParams();
  const { user, logout, hasPermission } = useAuth();

  // URL wins; fall back to the last till the user worked on (persisted)
  const lastTillCode = useTillStore((s) => s.lastTillCode);
  const tillCode = params?.tillCode || lastTillCode;

  const handleLogout = async () => {
    if (!confirm('Log out?')) return;

    // Clear per-device state so it doesn't leak to the next user
    useTillStore.getState().clearLastTill();
    useCartStore.getState().clearCart();

    await logout();
    router.push('/login');
  };

  const navItems = [
    tillCode && { href: `/pos/${tillCode}`,         label: 'Till',     perm: 'use:pos' },
    tillCode && { href: `/pos/${tillCode}/zreport`, label: 'Z Report', perm: 'create:zreport' },

    { href: '/products', label: 'Products', perm: 'read:products' },
    { href: '/sales',    label: 'Sales',    perm: 'read:sales' },
    { href: '/reports',  label: 'Reports',  perm: 'read:reports' },
    { href: '/users',    label: 'Users',    perm: 'read:users' },
    { href: '/settings', label: 'Settings', perm: 'read:settings' },
  ].filter(Boolean);

  return (
    <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">{title}</h1>

        {tillCode && (
          <span className="px-3 py-1 bg-blue-600 rounded-lg text-sm font-mono">
            {tillCode}
          </span>
        )}

        <span className="text-slate-400 text-sm">
          {user?.firstName} · {user?.roleDisplayName}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {actions}
        {navItems
          .filter((item) => !item.perm || hasPermission(item.perm))
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition min-h-[44px] flex items-center"
            >
              {item.label}
            </Link>
          ))}
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-500 transition min-h-[44px] font-semibold"
        >
          Logout
        </button>
      </div>
    </header>
  );
}