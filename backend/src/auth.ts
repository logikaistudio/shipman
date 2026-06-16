import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'shipman-secret-key-change-in-production';
const users: Map<string, User & { passwordHash: string }> = new Map();

/**
 * Generate JWT token
 */
export const generateToken = (user: User): string => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

/**
 * Hash password
 */
export const hashPassword = (password: string): string => {
  return bcryptjs.hashSync(password, 10);
};

/**
 * Verify password
 */
export const verifyPassword = (password: string, hash: string): boolean => {
  return bcryptjs.compareSync(password, hash);
};

/**
 * Middleware: Authenticate JWT
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.replace('Bearer ', '');
  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  (req as any).user = decoded;
  next();
};

/**
 * Middleware: Check role
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
};

/**
 * Register user
 */
export const registerUser = (
  email: string,
  password: string,
  name: string,
  role: UserRole
): User => {
  const user: User & { passwordHash: string } = {
    id: `user-${Date.now()}`,
    email,
    name,
    role,
    passwordHash: hashPassword(password),
    createdAt: new Date()
  };

  users.set(user.id, user);
  return user;
};

/**
 * Login user
 */
export const loginUser = (email: string, password: string): { user: User; token: string } | null => {
  for (const user of users.values()) {
    if (user.email === email && verifyPassword(password, user.passwordHash)) {
      const { passwordHash, ...userWithoutPassword } = user;
      return {
        user: userWithoutPassword,
        token: generateToken(userWithoutPassword)
      };
    }
  }
  return null;
};

/**
 * Find user by ID
 */
export const findUserById = (id: string): User | null => {
  const user = users.get(id);
  if (user) {
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  return null;
};
