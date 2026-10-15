'use client';
import { createContext, useContext } from 'react';

const TillContext = createContext(null);

export function TillProvider({ tillId, children }) {
  if (!tillId) {
    throw new Error('TillProvider requires a tillId prop');
  }
  return <TillContext.Provider value={tillId}>{children}</TillContext.Provider>;
}

export function useTill() {
  const tillId = useContext(TillContext);
  if (!tillId) {
    throw new Error('useTill must be used inside a TillProvider');
  }
  return tillId;
}

export function useOptionalTill() {
  return useContext(TillContext);
}