// src/routes/auth.ts
import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { eq, and } from 'drizzle-orm';
import passport from '../config/passport';
import db from '../database';
import { users } from '../database/schema';
import { AuthService, authenticateToken, createRateLimiter } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { CacheService } from '../config/redis';

const router = Router();

// Rate limiting
const authRateLimit = createRateLimiter(15 * 60 * 1000, 5); // 5 attempts per 15 minutes
const generalRateLimit = createRateLimiter(15 * 60 * 1000, 20); // 20 requests per 15 minutes

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('username').isLength({ min: 3, max: 30 }).isAlphanumeric().withMessage('Username must be 3-30 alphanumeric characters'),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
  body('firstName').optional().isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters'),
  body('lastName').optional().isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Register endpoint
router.post('/register', generalRateLimit, registerValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, username, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Check username availability
    const existingUsername = await db.select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUsername.length) {
      return res.status(409).json({
        success: false,
        message: 'Username already taken'
      });
    }

    // Hash password and create user
    const hashedPassword = await AuthService.hashPassword(password);
    const emailVerificationToken = uuidv4();

    const [newUser] = await db.insert(users)
      .values({
        email,
        username,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        emailVerificationToken,
        isActive: true,
      })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        isEmailVerified: users.isEmailVerified,
        createdAt: users.createdAt,
      });

    // Generate tokens
    const tokenPayload = {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      role: 'user'
    };

    const accessToken = AuthService.generateAccessToken(tokenPayload);
    const refreshToken = AuthService.generateRefreshToken(tokenPayload);

    // Store refresh token
    await db.update(users)
      .set({ refreshToken })
      .where(eq(users.id, newUser.id));

    // Cache user session
    await CacheService.setSession(`user:${newUser.id}`, tokenPayload, 7 * 24 * 3600);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: newUser,
        tokens: {
          accessToken,
          refreshToken,
          type: 'Bearer',
          expiresIn: process.env.JWT_EXPIRE || '7d'
        }
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Login endpoint
router.post('/login', authRateLimit, loginValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user
    const [user] = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isValidPassword = await AuthService.comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role || 'user'
    };

    const accessToken = AuthService.generateAccessToken(tokenPayload);
    const refreshToken = AuthService.generateRefreshToken(tokenPayload);

    // Update last login and refresh token
    await db.update(users)
      .set({
        lastLoginAt: new Date(),
        refreshToken,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Cache user session
    await CacheService.setSession(`user:${user.id}`, tokenPayload, 7 * 24 * 3600);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
        tokens: {
          accessToken,
          refreshToken,
          type: 'Bearer',
          expiresIn: process.env.JWT_EXPIRE || '7d'
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Refresh token endpoint
router.post('/refresh', generalRateLimit, async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = AuthService.verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Find user and verify stored refresh token
    const [user] = await db.select()
      .from(users)
      .where(and(eq(users.id, decoded.id), eq(users.refreshToken, refreshToken)))
      .limit(1);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token or user not found'
      });
    }

    // Generate new tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role || 'user'
    };

    const newAccessToken = AuthService.generateAccessToken(tokenPayload);
    const newRefreshToken = AuthService.generateRefreshToken(tokenPayload);

    // Update refresh token in database
    await db.update(users)
      .set({
        refreshToken: newRefreshToken,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Update cached session
    await CacheService.setSession(`user:${user.id}`, tokenPayload, 7 * 24 * 3600);

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          type: 'Bearer',
          expiresIn: process.env.JWT_EXPIRE || '7d'
        }
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token && req.user) {
      // Blacklist the current token
      await AuthService.blacklistToken(token);

      // Clear refresh token from database
      await db.update(users)
        .set({ refreshToken: null })
        .where(eq(users.id, req.user.id));

      // Clear cached session
      await CacheService.deleteSession(`user:${req.user.id}`);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const [user] = await db.select({
      id: users.id,
      email: users.email,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      avatar: users.avatar,
      role: users.role,
      isEmailVerified: users.isEmailVerified,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failure' }),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      
      const tokenPayload = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role || 'user'
      };

      const accessToken = AuthService.generateAccessToken(tokenPayload);
      const refreshToken = AuthService.generateRefreshToken(tokenPayload);

      // Update refresh token
      await db.update(users)
        .set({
          refreshToken,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // Redirect to frontend with tokens (adjust URL as needed)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}&refresh=${refreshToken}`);

    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect('/auth/failure');
    }
  }
);

// GitHub OAuth routes
router.get('/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/auth/failure' }),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      
      const tokenPayload = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role || 'user'
      };

      const accessToken = AuthService.generateAccessToken(tokenPayload);
      const refreshToken = AuthService.generateRefreshToken(tokenPayload);

      // Update refresh token
      await db.update(users)
        .set({
          refreshToken,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // Redirect to frontend with tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}&refresh=${refreshToken}`);

    } catch (error) {
      console.error('GitHub callback error:', error);
      res.redirect('/auth/failure');
    }
  }
);

// OAuth failure route
router.get('/failure', (req: Request, res: Response) => {
  res.status(401).json({
    success: false,
    message: 'OAuth authentication failed'
  });
});

export default router;