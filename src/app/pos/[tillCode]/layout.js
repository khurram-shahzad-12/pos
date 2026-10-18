'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TillProvider } from '@/components/TillProvider';
import ShiftGuard from '@/components/ShiftGuard';
import { useTillStore } from '@/lib/store/tillStore';

export default function TillLayout({ children }) {
  const params = useParams();
  const tillCode = params?.tillCode;
  const setLastTill = useTillStore((s) => s.setLastTill);

  const [tillId, setTillId] = useState(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tillCode) return;

    setError('');
    setTillId(undefined);

    fetch('/api/tills', { credentials: 'include' })
      .then((r) => r.json())
      .then((tills) => {
        const t = Array.isArray(tills)
          ? tills.find((x) => x.code === tillCode)
          : null;
        if (!t) throw new Error(`Till "${tillCode}" not found`);
        setTillId(t._id);
        setLastTill(tillCode);   // persist only after validation
      })
      .catch((err) => setError(err.message));
  }, [tillCode, setLastTill]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md bg-white rounded-2xl shadow-sm p-6 text-center">
          <p className="text-red-600 font-semibold">{error}</p>
          <p className="text-slate-500 text-sm mt-2">
            Ask an admin to create this till.
          </p>
        </div>
      </div>
    );
  }

  if (tillId === undefined) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-100 text-slate-400">
        Loading till…
      </div>
    );
  }

  return (
    <TillProvider tillId={tillId}>
      <ShiftGuard>{children}</ShiftGuard>
    </TillProvider>
  );
}