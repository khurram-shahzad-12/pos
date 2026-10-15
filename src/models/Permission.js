// src/models/Permission.js
import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema(
  {
    module: { type: String, required: true },
    action: {
      type: String,
      required: true,
      enum: ['create', 'read', 'update', 'delete', 'export', 'import', 'approve', 'write', 'edit'],
    },
    isProtected: { type: Boolean, default: false },
    description: { type: String, default: '' },
  },
  {
    collection: 'Permissions',
    versionKey: false,
    timestamps: true,
  }
);

permissionSchema.index({ module: 1, action: 1 }, { unique: true });

export default mongoose.models.Permission ||
  mongoose.model('Permission', permissionSchema);