import mongoose from 'mongoose';

const SaleItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    barcode: { type: String },
    price: { type: Number, required: true },
    qty: { type: Number, required: true },
    weight: { type: Number, default: null },
    pricingType: { type: String, default: 'unit' },
    unit: { type: String, default: 'each' },
    vatCode: { type: String, required: true, default: 'S' },
    vatRate: { type: Number, required: true, default: 20 },
    qtyRefunded: { type: Number, default: 0 },
  },
  { _id: false }
);

const VatLineSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    rate: { type: Number, required: true },
    taxableAmount: { type: Number, required: true },
    vatAmount: { type: Number, required: true },
  },
  { _id: false }
);

const SaleSchema = new mongoose.Schema(
  {
    items: { type: [SaleItemSchema], required: true },

    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },

    vatBreakdown: { type: [VatLineSchema], default: [] },

    paymentMethod: {
      type: String,
      enum: ['cash', 'card'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'refunded', 'pending', 'partially_refunded'],
      default: 'paid',
    },
    stripePaymentIntentId: { type: String },

    // Who did it
    cashierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    cashierName: { type: String, default: '' },

    // Which till and shift
    tillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Till',
      required: true,
      index: true,
    },
    tillCode: {
      type: String,
      required: true,   // denormalised for fast reads
      index: true,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      required: true,
      index: true,
    },

    receiptNumber: { type: String, unique: true, index: true, sparse: true },
    refundedAt: { type: Date },
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    refundedByName: { type: String },
    refundReason: { type: String },
    refundOfSaleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      default: null,
      index: true,
    },
    refundedBySaleIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Sale',
      default: [],
    },
    refundMethod: {
      type: String,
      enum: ['cash', 'card', null],
      default: null,
    },

  },
  {
    collection: 'Sales',
    versionKey: false,
    timestamps: true,
  }
);

SaleSchema.index({ shiftId: 1, createdAt: 1 });
SaleSchema.index({ tillId: 1, createdAt: -1 });
SaleSchema.index({ createdAt: -1 });

export default mongoose.models.Sale || mongoose.model('Sale', SaleSchema);