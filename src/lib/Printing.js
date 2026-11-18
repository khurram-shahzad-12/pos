import { BridgeClient } from 'pos-hardware-bridge';

export async function getBridge(tillId) {
  const res = await fetch(`/api/tills/${tillId}/printer`, { credentials: 'include', cache: 'no-store' });
  const cfg = await res.json();
  if (!res.ok) throw new Error(cfg.error || 'Printer not configured');
  return { bridge: new BridgeClient({ token: cfg.token }), printerId: cfg.printerId };
}