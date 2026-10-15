import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Role from '@/models/Role';
import Permission from '@/models/Permission';
import {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '@/lib/auth';

export async function register(data) {
  await dbConnect();
  const { email, password, firstName, lastName, phone, position, role } = data;

  if (!email || !password || !firstName || !lastName || !role || !position) {
    throw new Error('Please provide all required fields');
  }

  const existing = await User.findOne({ email });
  if (existing) throw new Error('User already exists');

  let roleDoc;
  if (mongoose.Types.ObjectId.isValid(role)) {
    roleDoc = await Role.findById(role);
  } else {
    roleDoc = await Role.findOne({ name: role });
  }
  if (!roleDoc) throw new Error(`Invalid role: ${role}`);

  const user = await User.create({
    email,
    password,
    firstName,
    lastName,
    phone,
    position,
    role: roleDoc._id,
  });

  const populated = await User.findById(user._id).populate('role', 'name displayName');

  return {
    success: true,
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: populated.role?.name,
      roleDisplayName: populated.role?.displayName,
      phone: user.phone,
      position: user.position,
    },
  };
}

export async function login({ email, password }) {
  await dbConnect();
  if (!email || !password) throw new Error('Please provide email and password');

  const user = await User.findOne({ email }).populate('role', 'name displayName');
  if (!user) throw new Error('Invalid credentials');
  if (!user.isActive) throw new Error('Account is deactivated');

  const valid = await user.comparePassword(password);
  if (!valid) throw new Error('Invalid credentials');

  user.lastLogin = new Date();
  await user.save();

  const permissions = await user.getPermissionStrings();
  const token = generateToken(user, permissions);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = refreshToken;
  await user.save();

  return {
    success: true,
    token,
    refreshToken,
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role?.name,
      roleDisplayName: user.role?.displayName,
      phone: user.phone,
      position: user.position,
      permissions,
    },
  };
}

export async function refreshAccessToken(token) {
  await dbConnect();
  if (!token) throw new Error('Refresh token required');

  const decoded = verifyRefreshToken(token);
  if (!decoded) throw new Error('Invalid refresh token');

  const user = await User.findById(decoded.id).populate('role', 'name displayName');
  if (!user || user.refreshToken !== token) throw new Error('Invalid refresh token');

  const permissions = await user.getPermissionStrings();
  const newToken = generateToken(user, permissions);
  const newRefreshToken = generateRefreshToken(user);

  user.refreshToken = newRefreshToken;
  await user.save();

  return { success: true, token: newToken, refreshToken: newRefreshToken };
}

export async function logout(userId) {
  await dbConnect();
  const user = await User.findById(userId);
  if (user) {
    user.refreshToken = null;
    await user.save();
  }
  return { success: true, message: 'Logged out' };
}

export async function getMe(userId) {
  await dbConnect();
  const user = await User.findById(userId)
    .populate('role', 'name displayName')
    .select('-password -refreshToken');
  if (!user) throw new Error('User not found');
  return { success: true, user };
}

export async function getAllUsers() {
  await dbConnect();
  const users = await User.find()
    .populate('role', 'name displayName')
    .select('-password -refreshToken')
    .sort({ createdAt: -1 });
  return { success: true, users };
}

export async function updateUser(userId, data) {
  await dbConnect();
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const { firstName, lastName, email, phone, position, role, isActive, password } = data;

  if (email && email !== user.email) {
    const existing = await User.findOne({ email, _id: { $ne: userId } });
    if (existing) throw new Error('Email already in use');
    user.email = email;
  }
  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (phone) user.phone = phone;
  if (position) user.position = position;
  if (role) {
    const roleDoc = await Role.findById(role);
    if (!roleDoc) throw new Error('Invalid role');
    user.role = roleDoc._id;
  }
  if (isActive !== undefined && isActive !== null) user.isActive = isActive;
  if (password && password.trim() !== '') user.password = password;

  await user.save();

  const updated = await User.findById(userId)
    .populate('role', 'name displayName')
    .select('-password -refreshToken');
  return { success: true, user: updated };
}

export async function deleteUser(userId) {
  await dbConnect();
  const user = await User.findById(userId).populate('role', 'name');
  if (!user) throw new Error('User not found');

  if (user.role?.name === 'admin') {
    const adminRole = await Role.findOne({ name: 'admin' });
    const count = await User.countDocuments({ role: adminRole._id, isActive: true });
    if (count <= 1) throw new Error('Cannot delete the last active admin');
  }

  await user.deleteOne();
  return { success: true, message: 'User deleted' };
}

export async function toggleUserStatus(userId, isActive) {
  await dbConnect();
  const user = await User.findById(userId).populate('role', 'name');
  if (!user) throw new Error('User not found');

  if (user.role?.name === 'admin' && isActive === false) {
    const adminRole = await Role.findOne({ name: 'admin' });
    const count = await User.countDocuments({ role: adminRole._id, isActive: true });
    if (count <= 1) throw new Error('Cannot deactivate the last active admin');
  }

  user.isActive = isActive;
  await user.save();

  const updated = await User.findById(userId)
    .populate('role', 'name displayName')
    .select('-password -refreshToken');
  return { success: true, user: updated };
}