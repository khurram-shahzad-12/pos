'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';

export default function ProtectedRoute({ children, requiredPermissions = [] }) {
  const { user, isAuthenticated, isLoading, hasAnyPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="text-slate-500 text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (
    requiredPermissions.length > 0 &&
    !hasAnyPermission(requiredPermissions)
  ) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-100 gap-4">
        <h1 className="text-3xl font-bold text-red-600">Access Denied</h1>
        <p className="text-slate-600">You don't have permission to view this page.</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-500 min-h-[44px]"
        >
          Back to Till
        </button>
      </div>
    );
  }

  return children;
}