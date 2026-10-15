import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Role from '@/models/Role';
import Permission from '@/models/Permission';
import User from '@/models/User';

export async function getAllRoles() {
  await dbConnect();
  const roles = await Role.find()
    .populate('permissions', 'module action description')
    .populate('userCount')
    .sort({ name: 1 });
  return { success: true, data: roles, count: roles.length };
}

export async function createRole(data) {
  await dbConnect();
  const { name, displayName, description, permissions } = data;
  if (!name || !displayName) throw new Error('Name and displayName are required');

  const existing = await Role.findOne({ name: name.toLowerCase() });
  if (existing) throw new Error(`Role "${name}" already exists`);

  if (permissions && permissions.length > 0) {
    const valid = await Permission.find({ _id: { $in: permissions } });
    if (valid.length !== permissions.length) {
      throw new Error('One or more permissions are invalid');
    }
  }

  const role = await Role.create({
    name: name.toLowerCase(),
    displayName,
    description: description || '',
    permissions: permissions || [],
  });

  const populated = await Role.findById(role._id).populate(
    'permissions',
    'module action description'
  );
  return { success: true, data: populated };
}

export async function updateRole(roleId, data) {
  await dbConnect();
  if (!mongoose.Types.ObjectId.isValid(roleId)) throw new Error('Invalid role ID');

  const role = await Role.findById(roleId);
  if (!role) throw new Error('Role not found');

  const { displayName, description, permissions } = data;
  if (permissions && permissions.length > 0) {
    const valid = await Permission.find({ _id: { $in: permissions } });
    if (valid.length !== permissions.length) {
      throw new Error('One or more permissions are invalid');
    }
  }

  if (displayName) role.displayName = displayName;
  if (description !== undefined) role.description = description;
  if (permissions) role.permissions = permissions;

  await role.save();
  const updated = await Role.findById(role._id).populate(
    'permissions',
    'module action description'
  );
  return { success: true, data: updated };
}

export async function deleteRole(roleId) {
  await dbConnect();
  if (!mongoose.Types.ObjectId.isValid(roleId)) throw new Error('Invalid role ID');

  const role = await Role.findById(roleId);
  if (!role) throw new Error('Role not found');

  await User.updateMany({ role: roleId }, { $unset: { role: '' } });
  await Role.findByIdAndDelete(roleId);
  return { success: true, roleId };
}

export async function getRolePermissions(roleId) {
  await dbConnect();
  if (!mongoose.Types.ObjectId.isValid(roleId)) throw new Error('Invalid role ID');

  const role = await Role.findById(roleId).populate(
    'permissions',
    'module action description'
  );
  if (!role) throw new Error('Role not found');

  return {
    roleId: role._id,
    roleName: role.name,
    permissions: role.permissions,
  };
}

export async function assignPermissionsToRole(roleId, permissionIds) {
  await dbConnect();
  if (!mongoose.Types.ObjectId.isValid(roleId)) throw new Error('Invalid role ID');

  const role = await Role.findById(roleId);
  if (!role) throw new Error('Role not found');

  if (permissionIds && permissionIds.length > 0) {
    const valid = await Permission.find({ _id: { $in: permissionIds } });
    if (valid.length !== permissionIds.length) {
      throw new Error('One or more permissions are invalid');
    }
  }

  role.permissions = permissionIds || [];
  await role.save();
  const updated = await Role.findById(role._id).populate(
    'permissions',
    'module action description'
  );
  return updated;
}