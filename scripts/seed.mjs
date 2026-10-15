import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

const permissionList = [
  // Products
  { module: 'products', action: 'create', description: 'Add products' },
  { module: 'products', action: 'read',   description: 'View products' },
  { module: 'products', action: 'update', description: 'Edit products' },
  { module: 'products', action: 'delete', description: 'Delete products' },

  // Sales
  { module: 'sales', action: 'create', description: 'Process sales' },
  { module: 'sales', action: 'read',   description: 'View sales' },
  { module: 'sales', action: 'update', description: 'Refund sales' },

  // Reports
  { module: 'reports', action: 'read', description: 'View reports' },
  { module: 'reports', action: 'write', description: 'Save Z reports / close shifts' },

  // Users
  { module: 'users', action: 'create', description: 'Add users' },
  { module: 'users', action: 'read',   description: 'View users' },
  { module: 'users', action: 'update', description: 'Edit users' },
  { module: 'users', action: 'delete', description: 'Delete users' },

  // Settings
  { module: 'settings', action: 'read',   description: 'View settings' },
  { module: 'settings', action: 'update', description: 'Change settings' },

  // Tills (new)
  { module: 'tills', action: 'create', description: 'Create tills' },
  { module: 'tills', action: 'read',   description: 'View tills' },
  { module: 'tills', action: 'update', description: 'Edit tills' },
  { module: 'tills', action: 'delete', description: 'Delete tills' },

  // Shifts (new)
  { module: 'shifts', action: 'create', description: 'Open shifts' },
  { module: 'shifts', action: 'read',   description: 'View shifts' },
  { module: 'shifts', action: 'update', description: 'Close / edit shifts' },

  // POS (new) — gate for the /pos/[tillCode] layout
  { module: 'pos', action: 'use', description: 'Access the POS terminal' },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected');

  const PermissionSchema = new mongoose.Schema(
    {
      module: String,
      action: String,
      description: String,
      isProtected: { type: Boolean, default: false },
    },
    { collection: 'Permissions' }
  );

  const RoleSchema = new mongoose.Schema(
    {
      name: String,
      displayName: String,
      description: String,
      permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
    },
    { collection: 'Roles' }
  );

  const UserSchema = new mongoose.Schema(
    {
      email: String,
      password: String,
      firstName: String,
      lastName: String,
      position: String,
      role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
      isActive: { type: Boolean, default: true },
    },
    { collection: 'Users' }
  );

  const Permission =
    mongoose.models.Permission || mongoose.model('Permission', PermissionSchema);
  const Role = mongoose.models.Role || mongoose.model('Role', RoleSchema);
  const User = mongoose.models.User || mongoose.model('User', UserSchema);

  // 1. Permissions — upsert each
  for (const p of permissionList) {
    await Permission.updateOne(
      { module: p.module, action: p.action },
      { $setOnInsert: p },
      { upsert: true }
    );
  }
  const allPerms = await Permission.find();
  console.log(`Permissions: ${allPerms.length}`);

  // Helper: get permission IDs matching { module: [actions] }
  const pick = (module, actions) =>
    allPerms
      .filter((p) => p.module === module && actions.includes(p.action))
      .map((p) => p._id);

  // 2. Roles
  // Cashier: create sales, open/close shift on their till, view their own stuff, use POS
  const cashierPerms = [
    ...pick('pos', ['use']),
    ...pick('sales', ['create', 'read']),
    ...pick('products', ['read']),
    ...pick('tills', ['read']),
    ...pick('shifts', ['create', 'read', 'update']),
    ...pick('reports', ['read', 'write']),
  ];

  // Manager: everything a cashier has + product CRUD + settings read + till CRUD
  const managerPerms = [
    ...cashierPerms,
    ...pick('products', ['create', 'update', 'delete']),
    ...pick('sales', ['update']),
    ...pick('tills', ['create', 'update', 'delete']),
    ...pick('settings', ['read']),
    ...pick('users', ['read']),
  ];

  // Admin: everything
  const adminPerms = allPerms.map((p) => p._id);

  // Deduplicate by string ID
  const uniq = (arr) => [...new Set(arr.map((id) => String(id)))].map((id) => new mongoose.Types.ObjectId(id));

  await Role.updateOne(
    { name: 'cashier' },
    {
      $set: {
        displayName: 'Cashier',
        description: 'Process sales and close their own shift',
        permissions: uniq(cashierPerms),
      },
    },
    { upsert: true }
  );

  await Role.updateOne(
    { name: 'manager' },
    {
      $set: {
        displayName: 'Manager',
        description: 'Manage products, tills, and view reports',
        permissions: uniq(managerPerms),
      },
    },
    { upsert: true }
  );

  await Role.updateOne(
    { name: 'admin' },
    {
      $set: {
        displayName: 'Administrator',
        description: 'Full access',
        permissions: uniq(adminPerms),
      },
    },
    { upsert: true }
  );

  console.log('Roles updated: cashier, manager, admin');

  // 3. Admin user
  const adminRole = await Role.findOne({ name: 'admin' });
  const existing = await User.findOne({ email: 'admin@pos.com' });
  if (!existing) {
    const hashed = await bcrypt.hash('admin123', 10);
    await User.create({
      email: 'admin@pos.com',
      password: hashed,
      firstName: 'Admin',
      lastName: 'User',
      position: 'Owner',
      role: adminRole._id,
      isActive: true,
    });
    console.log('Admin created: admin@pos.com / admin123');
  } else {
    // Make sure the existing admin has the admin role and the updated permission set
    await User.updateOne(
      { _id: existing._id },
      { $set: { role: adminRole._id, isActive: true } }
    );
    console.log('Admin exists — role refreshed');
  }

  console.log('✅ Done');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});