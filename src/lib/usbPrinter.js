const KEY = 'pos.printer';
let device = null;
let endpointNumber = null;
let connecting = null;

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}
function save(dev) {
  try { localStorage.setItem(KEY, JSON.stringify({ vendorId: dev.vendorId, productId: dev.productId })); } catch {}
}

async function openDevice(dev) {
  if (!dev.opened) await dev.open();
  if (dev.configuration === null) await dev.selectConfiguration(1);
  const iface = dev.configuration.interfaces.find((i) =>
    i.alternates.some((a) => a.endpoints.some((e) => e.direction === 'out'))
  );
  if (!iface) throw new Error('No printer interface found. Is the WinUSB driver installed?');
  if (!iface.claimed) await dev.claimInterface(iface.interfaceNumber);
  const alt = iface.alternates.find((a) => a.endpoints.some((e) => e.direction === 'out'));
  endpointNumber = alt.endpoints.find((e) => e.direction === 'out').endpointNumber;
  device = dev;
}

// CHANGED: renamed from getPrinter, no longer exported
async function connect({ allowPrompt = false } = {}) {
  if (!navigator.usb) throw new Error('WebUSB unavailable. Use Chrome/Edge on https or localhost.');
  if (device?.opened) return device;

  const known = await navigator.usb.getDevices(); // already authorised devices
  const saved = loadSaved();
  let dev =
    (saved && known.find((d) => d.vendorId === saved.vendorId && d.productId === saved.productId)) ||
    (known.length === 1 ? known[0] : null);

  if (!dev) {
    if (!allowPrompt) throw new Error('Printer not set up. Click "Setup Printer".');
    dev = await navigator.usb.requestDevice({ filters: [] });
  }
  await openDevice(dev);
  save(dev);
  return device;
}

// NEW: public function, same name and usage as before
export function getPrinter(opts = {}) {
  if (device?.opened) return Promise.resolve(device);
  if (opts.allowPrompt) return connect(opts); // button click: always run
  if (!connecting) {
    connecting = connect(opts).finally(() => { connecting = null; });
  }
  return connecting;
}

export async function printBytes(bytes) {
  try {
    const dev = await getPrinter();
    await dev.transferOut(endpointNumber, bytes);
  } catch (err) {
    device = null; // force a fresh connect and retry once
    const dev = await getPrinter();
    await dev.transferOut(endpointNumber, bytes);
  }
}

if (typeof navigator !== 'undefined' && navigator.usb) {
  navigator.usb.addEventListener('disconnect', (e) => {
    if (e.device === device) device = null;
  });
}