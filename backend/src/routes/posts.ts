// src/routes/posts.ts
import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { eq, desc, like, and, sql } from 'drizzle-orm';
import { authenticateToken, optionalAuth, createRateLimiter } from '../middleware/auth';
import { ApiResponse, PaginatedResponse } from '../types';
import db from '../database';
import { posts, users, comments } from '../database/schema';
import { CacheService } from '../config/redis';

const postRouter = Router();

// Rate limiting
const postRateLimit = createRateLimiter(15 * 60 * 1000, 30); // 30 requests per 15 minutes

// Validation rules
const createPostValidation = [
  body('title').isLength({ min: 5, max: 255 }).withMessage('Title must be 5-255 characters'),
  body('content').isLength({ min: 10, max: 10000 }).withMessage('Content must be 10-10000 characters'),
  body('excerpt').optional().isLength({ max: 500 }).withMessage('Excerpt must be max 500 characters'),
  body('tags').optional().isArray({ max: 10 }).withMessage('Tags must be an array with max 10 items'),
  body('status').optional().isIn(['draft', 'published']).withMessage('Status must be draft or published'),
];

// Get all posts
postRouter.get('/',
  postRateLimit,
  optionalAuth,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
    query('search').optional().isLength({ min: 2, max: 100 }).withMessage('Search must be 2-100 characters'),
    query('status').optional().isIn(['draft', 'published']).withMessage('Status must be draft or published'),
  ],
  async (req: Request, res: Response<ApiResponse<any>>) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const status = req.query.status as string || 'published';
      const offset = (page - 1) * limit;

      // Build cache key
      const cacheKey = `posts:${page}:${limit}:${search || 'all'}:${status}`;
      
      // Check cache first
      const cached = await CacheService.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: cached
        });
      }

      // Build query conditions
      let conditions: ReturnType<typeof eq> | ReturnType<typeof and>;
      if (search) {
        conditions = and(eq(posts.status, status), like(posts.title, `%${search}%`));
      } else {
        conditions = eq(posts.status, status);
      }

      // Get posts with author info - Fixed ordering
      const postResults = await db.select({
        id: posts.id,
        title: posts.title,
        excerpt: posts.excerpt,
        slug: posts.slug,
        status: posts.status,
        featuredImage: posts.featuredImage,
        tags: posts.tags,
        viewCount: posts.viewCount,
        likeCount: posts.likeCount,
        publishedAt: posts.publishedAt,
        createdAt: posts.createdAt,
        author: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          avatar: users.avatar,
        }
      })
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(conditions)
        .orderBy(desc(posts.createdAt)) // Fixed: Use non-nullable field
        .limit(limit)
        .offset(offset);

      // Get total count
      const [{ count }] = await db.select({ count: sql<number>`count(*)` })
        .from(posts)
        .where(conditions);

      const result = {
        posts: postResults,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit),
          hasNext: page < Math.ceil(count / limit),
          hasPrev: page > 1,
        }
      };

      // Cache for 5 minutes
      await CacheService.set(cacheKey, result, 300);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Get posts error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Get single post
postRouter.get(
  "/:slug",
  postRateLimit,
  optionalAuth,
  async (req: Request, res: Response<ApiResponse<{ post: any }>>) => {
    try {
      const slug = req.params.slug;

      // --- Cache check ---
      const cacheKey = `post:${slug}`;
      const cached = await CacheService.get(cacheKey);
      if (cached) {
        // Increment view count async (don’t block response)
        await db
          .update(posts)
          .set({ viewCount: sql`${posts.viewCount} + 1` })
          .where(eq(posts.slug, slug));

        return res.json({
          success: true,
          data: cached as { post: any },
        });
      }

      // --- Fetch from DB ---
      const [postRow] = await db
        .select({
          id: posts.id,
          title: posts.title,
          content: posts.content,
          excerpt: posts.excerpt,
          slug: posts.slug,
          status: posts.status,
          featuredImage: posts.featuredImage,
          tags: posts.tags,
          metadata: posts.metadata,
          viewCount: posts.viewCount,
          likeCount: posts.likeCount,
          publishedAt: posts.publishedAt,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
          authorId: posts.authorId,
          author_id: users.id,
          author_username: users.username,
          author_firstName: users.firstName,
          author_lastName: users.lastName,
          author_avatar: users.avatar,
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .where(eq(posts.slug, slug))
        .limit(1);

      console.log("Looking for slug:", slug);
      const exists = await db.select().from(posts).where(eq(posts.slug, slug));
      console.log("Posts with slug in DB:", exists);

      if (!postRow) {
        return res.status(404).json({
          success: false,
          message: "Post not found",
        });
      }

      // --- Build safe author object ---
      const post = {
        ...postRow,
        author: postRow.author_id
          ? {
              id: postRow.author_id,
              username: postRow.author_username,
              firstName: postRow.author_firstName,
              lastName: postRow.author_lastName,
              avatar: postRow.author_avatar,
            }
          : null,
      };

      // --- Draft access check ---
     // Allow drafts in development, but keep restriction in production
      if (
        process.env.NODE_ENV === "production" &&
        post.status === "draft" &&
        (!req.user || !post.author || req.user.id !== post.author.id)
      ) {
        return res.status(404).json({
          success: false,
          message: "Post not found",
        });
      }


      // --- Increment view count ---
      await db
        .update(posts)
        .set({ viewCount: sql`${posts.viewCount} + 1` })
        .where(eq(posts.id, post.id));

      post.viewCount = (post.viewCount || 0) + 1;

      // --- Cache result ---
      await CacheService.set(cacheKey, { post }, 600);

      return res.json({
        success: true,
        data: { post },
      });
    } catch (error) {
      console.error("Get post error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);


// Create post
postRouter.post('/',
  authenticateToken,
  postRateLimit,
  createPostValidation,
  async (req: Request, res: Response<ApiResponse<{ post: any }>>) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { title, content, excerpt, tags, status = 'draft' } = req.body;

      // Generate slug
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();

      const [newPost] = await db.insert(posts)
        .values({
          title,
          content,
          excerpt,
          slug,
          authorId: req.user!.id,
          status,
          tags: tags || [],
          viewCount: 0,
          likeCount: 0,
          publishedAt: status === 'published' ? new Date() : null,
        })
        .returning();

      res.status(201).json({
        success: true,
        message: 'Post created successfully',
        data: { post: newPost }
      });

    } catch (error) {
      console.error('Create post error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

export { postRouter as default };
