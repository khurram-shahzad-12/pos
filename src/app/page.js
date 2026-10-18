'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopBar from '@/components/TopBar';

export default function TillPicker() {
  const [tills, setTills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tills', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setTills)
      .catch(() => setTills([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <TopBar title="Select a Till" />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">
            Which counter?
          </h1> 
          <p className="text-slate-500 text-sm text-center mb-6">
            Pick the till you're standing at.
          </p>

          <div className="space-y-3">
            {loading && (
              <p className="text-slate-400 text-center">Loading tills…</p>
            )}
            {!loading &&
              tills.map((t) => (
                <Link
                  key={t._id}
                  href={`/pos/${t.code}`}
                  className="block w-full py-4 text-center bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500"
                >
                  {t.name} ({t.code})
                </Link>
              ))}
            {!loading && tills.length === 0 && (
              <p className="text-slate-400 text-center">No tills found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}