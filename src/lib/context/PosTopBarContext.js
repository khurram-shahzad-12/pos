'use client';
import { createContext, useContext, useState, useMemo } from 'react';

const Ctx = createContext(null);

export function PosTopBarProvider({ children }) {
  const [config, setConfig] = useState({
    title: 'Cash & Carry POS',
    actions: null,
  });
  const value = useMemo(() => ({ config, setConfig }), [config]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePosTopBar() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePosTopBar must be used inside PosTopBarProvider');
  return ctx;
}