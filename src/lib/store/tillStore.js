// src/lib/stores/tillStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useTillStore = create(
  persist(
    (set) => ({
      lastTillCode: null,
      setLastTill: (code) => set({ lastTillCode: code }),
      clearLastTill: () => set({ lastTillCode: null }),
    }),
    { name: 'pos-till' }
  )
);