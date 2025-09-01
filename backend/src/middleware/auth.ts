// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import db from '../database';
import { users } from '../database/schema';
import { CacheService } from '../config/redis';
import { AuthenticatedRequest, JWTPayload, AuthUser } from '../types';

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    
    const expiresIn = process.env.JWT_EXPIRE || '7d';
    
    return jwt.sign(payload, secret, {
      expiresIn: expiresIn
    } as SignOptions);
  }

  static generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is not set');
    }
    
    const expiresIn = process.env.JWT_REFRESH_EXPIRE || '30d';
    
    return jwt.sign(payload, secret, {
      expiresIn: expiresIn
    } as SignOptions);
  }

  static verifyToken(token: string, secret?: string): JWTPayload | null {
    try {
      const jwtSecret = secret || process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT secret is not available');
      }
      
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  static async blacklistToken(token: string): Promise<void> {
    const decoded = this.verifyToken(token);
    if (decoded && decoded.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await CacheService.set(`blacklist:${token}`, true, ttl);
      }
    }
  }

  static async isTokenBlacklisted(token: string): Promise<boolean> {
    return await CacheService.exists(`blacklist:${token}`);
  }
}

// JWT Authentication Middleware
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Check if token is blacklisted
    if (await AuthService.isTokenBlacklisted(token)) {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked'
      });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Check if user still exists and is active
    const userResult = await db.select({
      id: users.id,
      email: users.email,
      username: users.username,
      role: users.role,
      firstName: users.firstName,
      lastName: users.lastName,
      avatar: users.avatar,
      isActive: users.isActive,
    }).from(users).where(eq(users.id, decoded.id)).limit(1);

    if (!userResult.length || !userResult[0].isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    const user = userResult[0];
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role || 'user',
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      isActive: user.isActive || true,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    if (await AuthService.isTokenBlacklisted(token)) {
      return next();
    }

    const decoded = AuthService.verifyToken(token);
    if (decoded) {
      const userResult = await db.select({
        id: users.id,
        email: users.email,
        username: users.username,
        role: users.role,
        firstName: users.firstName,
        lastName: users.lastName,
        avatar: users.avatar,
        isActive: users.isActive,
      }).from(users).where(eq(users.id, decoded.id)).limit(1);

      if (userResult.length && userResult[0].isActive) {
        const user = userResult[0];
        req.user = {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role || 'user',
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          avatar: user.avatar || undefined,
          isActive: user.isActive || true,
        };
      }
    }

    next();
  } catch (error) {
    next(); // Continue without authentication on error
  }
};

// Role-based authorization middleware
export const requireRole = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Admin only middleware
export const requireAdmin = requireRole('admin');

// Rate limiting middleware
export const createRateLimiter = (windowMs: number, maxRequests: number, keyGenerator?: (req: Request) => string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = keyGenerator ? keyGenerator(req) : req.ip;
      const rateLimitKey = `rate_limit:${key}:${Math.floor(Date.now() / windowMs)}`;
      
      const current = await CacheService.incrementRateLimit(rateLimitKey, Math.ceil(windowMs / 1000));
      
      if (current === null) {
        return next(); // Continue if Redis fails
      }

      if (current > maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, maxRequests - current).toString(),
        'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString(),
      });

      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      next(); // Continue on error
    }
  };
};
