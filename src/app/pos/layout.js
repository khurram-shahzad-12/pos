'use client';
import TopBar from '@/components/TopBar';
import { PosTopBarProvider, usePosTopBar } from '@/lib/context/PosTopBarContext';

function Shell({ children }) {
  const { config } = usePosTopBar();
  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <TopBar title={config.title} actions={config.actions} />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

export default function PosLayout({ children }) {
  return (
    <PosTopBarProvider>
      <Shell>{children}</Shell>
    </PosTopBarProvider>
  );
}