'use client';
import { useEffect, useState } from 'react';
import { useTill } from '@/components/TillProvider';
import OpenShiftScreen from '@/components/OpenShiftScreen';

export default function ShiftGuard({ children }) {
  const tillId = useTill();
  const [shift, setShift] = useState(undefined); // undefined = loading
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const res = await fetch(
        `/api/shifts/current?tillId=${encodeURIComponent(tillId)}`,
        { credentials: 'include' }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load shift');
      setShift(json); // null = no open shift, object = open
    } catch (err) {
      setError(err.message);
      setShift(null);
    }
  };

  useEffect(() => {
    load();
  }, [tillId]);

  if (shift === undefined) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100 text-slate-400">
        Loading shift…
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-6 text-center">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <button
            onClick={load}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!shift) {
    return <OpenShiftScreen onOpened={setShift} />;
  }

  return children;
}