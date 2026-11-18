import mongoose from 'mongoose';

const tillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    location: { type: String, default: '' },
    active: { type: Boolean, default: true },

    bridgeToken: { type: String, select: false },
    printerId:   { type: String, default: 'receipt' },
    printerName: { type: String, default: '' },
    printerIp: { type: String, default: '192.168.1.100' },
    printerPort: { type: String, default: '9100' },
    stripeReaderId: { type: String, default: '' },
    stripeLocationId: { type: String, default: '' },

    cashDrawerEnabled: { type: Boolean, default: true },
    autoPrintReceipt: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Till || mongoose.model('Till', tillSchema);