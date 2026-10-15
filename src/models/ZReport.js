import mongoose from 'mongoose';

const VatLineSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    rate: { type: Number, required: true },
    taxableAmount: { type: Number, required: true },
    vatAmount: { type: Number, required: true },
  },
  { _id: false }
);

const ZReportSchema = new mongoose.Schema(
  {
    // Per-till report number, e.g. "T1-Z000001"
    reportNumber: { type: String, required: true, unique: true, index: true },

    // Which counter and which shift this report belongs to
    tillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Till',
      required: true,
      index: true,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      required: true,
      unique: true,   // exactly one Z report per shift
    },

    // Time window
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },

    // Sales summary
    grossSales: { type: Number, required: true },
    transactionsCount: { type: Number, default: 0 },
    refundsCount: { type: Number, default: 0 },
    refundsTotal: { type: Number, default: 0 },
    netRevenue: { type: Number, required: true },

    // VAT
    vatBreakdown: { type: [VatLineSchema], default: [] },
    totalVat: { type: Number, default: 0 },

    // Payment split
    cashSales: { type: Number, default: 0 },
    cardSales: { type: Number, default: 0 },
    cashRefunds: { type: Number, default: 0 },
    cardRefunds: { type: Number, default: 0 },

    // Cash reconciliation
    openingFloat: { type: Number, default: 0 },
    expectedCash: { type: Number, default: 0 },
    actualCash: { type: Number, default: 0 },
    variance: { type: Number, default: 0 },

    // Who
    cashierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cashierName: { type: String },
    notes: { type: String },

    printed: { type: Boolean, default: false },
    takenOut: { type: Number, default: 0 },
    leftForNextShift: { type: Number, default: 0 },
  },
  { collection: 'ZReports', versionKey: false, timestamps: true }
);

ZReportSchema.index({ tillId: 1, createdAt: -1 });

export default mongoose.models.ZReport ||
  mongoose.model('ZReport', ZReportSchema);