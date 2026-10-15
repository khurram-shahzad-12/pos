import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema(
  {
    barcode: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    category: { type: String },
    vatCode: { type: String, required: true, default: 'S', enum: ['S', 'Z', 'R', 'E'] },
    vatRate: { type: Number, required: true, default: 20, enum: [0, 5, 20] },
    pricingType: {
      type: String,
      enum: ['unit', 'weight'],
      default: 'unit',
      index: true,
    },
    unit: {
      type: String,
      enum: ['each', 'kg', 'g', 'L'],
      default: 'each',
    },
  },
  { timestamps: true }
);

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);