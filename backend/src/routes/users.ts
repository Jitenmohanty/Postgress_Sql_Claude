// src/routes/users.ts
import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { eq, like, desc, and, ne } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, createRateLimiter } from '../middleware/auth';
import { ApiResponse } from '../types';
import db from '../database';
import { users } from '../database/schema';
import { AuthService } from '../middleware/auth';


const router = Router();

// Rate limiting
const userRateLimit = createRateLimiter(15 * 60 * 1000, 50); // 50 requests per 15 minutes

// File upload configuration
const avatarDir = path.join(__dirname, '..', '..', 'uploads', 'avatars');
fs.mkdirSync(avatarDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarDir);  // now guaranteed to exist
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `avatar-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export { upload };

// Get user profile
router.get('/profile{/:id}', userRateLimit, async (req: Request, res: Response<ApiResponse<{ user: any }>>) => {
  try {
    const userId = req.params.id ? parseInt(req.params.id) : req.user?.id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

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
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Hide email for other users
    if (req.user?.id !== userId) {
      user.email = '';
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

// Update user profile
router.patch('/profile', 
  authenticateToken,
  userRateLimit,
  [
    body('firstName').optional().isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters'),
    body('lastName').optional().isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters'),
    body('username').optional().isLength({ min: 3, max: 30 }).isAlphanumeric().withMessage('Username must be 3-30 alphanumeric characters'),
  ],
  async (req: Request, res: Response<ApiResponse<{ user: any }>>) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { firstName, lastName, username } = req.body;
      const updateData: any = {};

      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (username !== undefined) {
        // Check username availability (exclude current user)
        const existingUser = await db.select()
          .from(users)
          .where(and(eq(users.username, username), ne(users.id, req.user!.id)))
          .limit(1);

        if (existingUser.length) {
          return res.status(409).json({
            success: false,
            message: 'Username already taken'
          });
        }
        updateData.username = username;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }

      updateData.updatedAt = new Date();

      const [updatedUser] = await db.update(users)
        .set(updateData)
        .where(eq(users.id, req.user!.id))
        .returning({
          id: users.id,
          email: users.email,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          avatar: users.avatar,
        });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: updatedUser }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Upload avatar
router.post('/avatar',
  authenticateToken,
  userRateLimit,
  upload.single('avatar'),
  async (req: Request, res: Response<ApiResponse<{ avatar: string }>>) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Avatar file is required'
        });
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      const [updatedUser] = await db.update(users)
        .set({
          avatar: avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.user!.id))
        .returning({
          id: users.id,
          avatar: users.avatar,
        });

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: { avatar: updatedUser.avatar! }
      });

    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Search users
router.get('/search',
  userRateLimit,
  [
    query('q').isLength({ min: 2, max: 50 }).withMessage('Search query must be 2-50 characters'),
    query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be 1-20'),
  ],
  async (req: Request, res: Response<ApiResponse<{ users: any[] }>>) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 10;

      const searchResults = await db.select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        avatar: users.avatar,
      })
        .from(users)
        .where(
          and(
            eq(users.isActive, true),
            like(users.username, `%${query}%`)
          )
        )
        .limit(limit);

      res.json({
        success: true,
        data: { users: searchResults }
      });

    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Change password
router.patch('/password',
  authenticateToken,
  userRateLimit,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('New password must be at least 8 characters with uppercase, lowercase, and number'),
  ],
  async (req: Request, res: Response<ApiResponse>) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Get current user with password
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, req.user!.id))
        .limit(1);

      if (!user || !user.password) {
        return res.status(400).json({
          success: false,
          message: 'Password change not available for OAuth users'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await AuthService.comparePassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedNewPassword = await AuthService.hashPassword(newPassword);

      // Update password
      await db.update(users)
        .set({
          password: hashedNewPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.user!.id));

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

export default router;
