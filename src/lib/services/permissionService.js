import dbConnect from '@/lib/db';
import Permission from '@/models/Permission';
import Role from '@/models/Role';

export async function checkPermissions(permissionIds) {
  if (!permissionIds || permissionIds.length === 0) return true;
  const valid = await Permission.find({ _id: { $in: permissionIds } });
  return valid.length === permissionIds.length;
}

export async function getAllPermissions() {
  await dbConnect();
  const permissions = await Permission.find({})
    .sort({ module: 1, action: 1 })
    .lean();
  return { success: true, data: permissions };
}

export async function createPermission(data) {
  await dbConnect();
  const { module, action, description, isProtected } = data;
  if (!module || !action) throw new Error('Module and action are required');

  const existing = await Permission.findOne({
    module: module.toLowerCase(),
    action: action.toLowerCase(),
  });
  if (existing) throw new Error(`Permission "${action}:${module}" already exists`);

  const permission = await Permission.create({
    module: module.toLowerCase(),
    action: action.toLowerCase(),
    description: description || '',
    isProtected: isProtected === true,
  });
  return { success: true, data: permission };
}

export async function deletePermission(id) {
  await dbConnect();
  const permission = await Permission.findById(id);
  if (!permission) throw new Error('Permission not found');
  if (permission.isProtected) throw new Error('Cannot delete protected permission');

  const rolesWith = await Role.find({ permissions: id });
  if (rolesWith.length > 0) {
    const names = rolesWith.map((r) => r.name).join(', ');
    throw new Error(`Cannot delete. Assigned to roles: ${names}`);
  }

  await Permission.findByIdAndDelete(id);
  return { success: true, permissionId: id };
}

export async function updatePermission(id, data) {
  await dbConnect();
  const permission = await Permission.findById(id);
  if (!permission) throw new Error('Permission not found');
  if (permission.isProtected) throw new Error('Cannot update protected permission');

  const { module, action, description, isProtected } = data;
  if (module) permission.module = module.toLowerCase();
  if (action) permission.action = action.toLowerCase();
  if (description !== undefined) permission.description = description;
  if (isProtected !== undefined) permission.isProtected = isProtected === true;

  await permission.save();
  return { success: true, data: permission };
}