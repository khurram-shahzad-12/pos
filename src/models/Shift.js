import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema(
  {
    tillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Till',
      required: true,
      index: true,
    },
    openedAt: { type: Date, required: true, default: Date.now },
    closedAt: { type: Date, default: null },
    openingFloat: { type: Number, required: true, min: 0 },
    closingExpected: { type: Number, default: null },
    closingActual: { type: Number, default: null },
    closingTakenOut: {type: Number, default: 0}, 
    closingLeft: {type: Number, default: 0},   
    variance: { type: Number, default: null },
    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
    zReportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ZReport',
      default: null,
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

shiftSchema.index(
  { tillId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'open' } }
);

export default mongoose.models.Shift || mongoose.model('Shift', shiftSchema);