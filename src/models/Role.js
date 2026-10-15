import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, lowercase: true },
    displayName: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    permissions: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Permission' },
    ],
  },
  {
    collection: 'Roles',
    versionKey: false,
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

roleSchema.virtual('userCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'role',
  count: true,
});

export default mongoose.models.Role || mongoose.model('Role', roleSchema);