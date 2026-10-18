import mongoose from 'mongoose';

const SettingSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'store', unique: true, index: true },

    storeName: { type: String, default: 'Cash & Carry' },
    storeAddress: { type: String, default: '' },
    vatNumber: { type: String, default: '' },
    currency: { type: String, default: 'GBP' },
    receiptFooter: { type: String, default: 'Thank you for your shopping!' },
    timeZone: { type: String, default: 'Europe/London' },
    cashDrawerEnabled: { type: Boolean, default: true },
    autoPrintReceipt: { type: Boolean, default: true },
  },
  { collection: 'Settings', timestamps: true }
);

export default mongoose.models.Setting ||
  mongoose.model('Setting', SettingSchema);