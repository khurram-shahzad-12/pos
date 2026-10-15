import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Role from '@/models/Role';
import Permission from '@/models/Permission';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

export function generateToken(user, permissions) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role?.name || 'cashier',
      permissions,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function generateRefreshToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email },
    JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('pos_token')?.value;
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  await dbConnect();
  const user = await User.findById(decoded.id)
    .populate({ path: 'role', populate: { path: 'permissions' } })
    .select('-password -refreshToken');

  if (!user || !user.isActive) return null;
  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) return { error: 'Authentication required', status: 401 };
  return { user };
}

export async function requirePermission(module, action) {
  const { user, error, status } = await requireAuth();
  if (error) return { error, status };

  const hasIt = await user.hasPermission(module, action);
  if (!hasIt) {
    return {
      error: `You do not have permission to ${action} ${module}`,
      status: 403,
    };
  }
  return { user };
}

export async function requireAnyPermission(permissionStrings) {
  const { user, error, status } = await requireAuth();
  if (error) return { error, status };

  const hasAny = await user.hasAnyPermissionStrings(permissionStrings);
  if (!hasAny) {
    return { error: 'Insufficient permissions', status: 403 };
  }
  return { user };
}

export async function requireAllPermissions(permissionStrings) {
  const { user, error, status } = await requireAuth();
  if (error) return { error, status };

  const hasAll = await user.hasAllPermissionStrings(permissionStrings);
  if (!hasAll) {
    return { error: 'Insufficient permissions', status: 403 };
  }
  return { user };
}