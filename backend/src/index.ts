// src/index.ts
import { config } from 'dotenv';
// Load environment variables
config();
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import session from 'express-session';
import { RedisStore } from 'connect-redis';  // ✅ Use NAMED IMPORT instead
import passport from './config/passport';
import rateLimit from 'express-rate-limit';

// Import database and Redis
import { testConnection as testDatabaseConnection } from './database';
import { connectRedis as connectToRedis } from './config/redis';  // Renamed to avoid conflict
import redisClient from './config/redis';  // This will be your ioredis client

// Import services
import socketService from './services/socketService';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import postRoutes from './routes/posts';
import chatRoutes from './routes/chat';
import aiRoutes from './routes/ai';



class Server {
  private app: express.Application;
  private server: any;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000');
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression middleware
    this.app.use(compression());

    // Logging middleware
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Global rate limiting
    const globalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: {
        success: false,
        message: 'Too many requests, please try again later',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(globalLimiter);

    // ✅ Session configuration - USING OFFICIAL DOCS PATTERN
    const redisStore = new RedisStore({
      client: redisClient,
      prefix: "myapp:",
    });

    this.app.use(session({
      store: redisStore,
      resave: false, // required: force lightweight session keep alive (touch)
      saveUninitialized: false, // recommended: only save session when data exists
      secret: process.env.SESSION_SECRET || 'your-session-secret',
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    }));

    // Passport middleware
    this.app.use(passport.initialize());
    this.app.use(passport.session());

    // Static files middleware
    this.app.use('/uploads', express.static('uploads'));
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/posts', postRoutes);
    this.app.use('/api/chat', chatRoutes);
    this.app.use('/api/ai', aiRoutes);

    // API documentation endpoint
    this.app.get('/api', (req, res) => {
      res.json({
        success: true,
        message: 'Advanced Backend API',
        version: '1.0.0',
        endpoints: {
          auth: '/api/auth',
          users: '/api/users',
          posts: '/api/posts',
          chat: '/api/chat',
          ai: '/api/ai',
        },
        features: [
          'JWT Authentication',
          'OAuth2.0 (Google, GitHub)',
          'Real-time Chat with Socket.IO',
          'AI Integration with Google Gemini',
          'PostgreSQL with Drizzle ORM',
          'Redis Caching',
          'Rate Limiting',
          'File Uploads',
          'Comprehensive API',
        ],
      });
    });

    // 404 handler for API routes
    this.app.use('/api/*path', (req, res) => {
        res.status(404).json({
          success: false,
          message: 'API endpoint not found',
          path: req.path,
        });
      });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Advanced Backend System',
        version: '1.0.0',
        documentation: '/api',
        health: '/health',
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Global error handler:', err);

      // JWT errors
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token',
        });
      }

      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
        });
      }

      // Validation errors
      if (err.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: err.errors,
        });
      }

      // Database errors
      if (err.code === '23505') { // PostgreSQL unique constraint violation
        return res.status(409).json({
          success: false,
          message: 'Duplicate entry found',
        });
      }

      if (err.code === '23503') { // PostgreSQL foreign key constraint violation
        return res.status(400).json({
          success: false,
          message: 'Referenced resource not found',
        });
      }

      // Rate limiting errors
      if (err.status === 429) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests',
          retryAfter: err.retryAfter,
        });
      }

      // File upload errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          message: 'File too large',
        });
      }

      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Too many files',
        });
      }

      // Default error
      res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'development' 
          ? err.message 
          : 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      });
    });

    // Handle 404 for non-API routes
  this.app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found',
      path: req.path,
    });
  });
  }

  public async start(): Promise<void> {
    try {
      // Test database connection
      console.log('🔌 Testing database connection...');
      const dbConnected = await testDatabaseConnection();
      if (!dbConnected) {
        throw new Error('Database connection failed');
      }

      // Connect to Redis
      console.log('🔌 Connecting to Redis...');
      const redisConnected = await connectToRedis();  // Using renamed import
      if (!redisConnected) {
        throw new Error('Redis connection failed');
      }

      // Create HTTP server
      this.server = createServer(this.app);

      // Initialize Socket.IO
      console.log('🔌 Initializing Socket.IO...');
      socketService.init(this.server);

      // Start server
      this.server.listen(this.port, () => {
        console.log('\n🚀 ===================================');
        console.log('🚀  Advanced Backend System Started');
        console.log('🚀 ===================================');
        console.log(`🌐 Server: http://localhost:${this.port}`);
        console.log(`🏥 Health: http://localhost:${this.port}/health`);
        console.log(`📖 API Docs: http://localhost:${this.port}/api`);
        console.log(`🔌 Socket.IO: ws://localhost:${this.port}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log('🚀 ===================================\n');
      });

      // Handle server shutdown gracefully
      this.setupGracefulShutdown();

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`\n Received ${signal}. Starting graceful shutdown...`);

      try {
        // Close HTTP server
        if (this.server) {
          await new Promise<void>((resolve) => {
            this.server.close(() => {
              console.log('✅ HTTP server closed');
              resolve();
            });
          });
        }

        // Close Redis connection
        try {
          await redisClient.quit();  // ioredis quit method
          console.log('✅ Redis connection closed');
        } catch (error) {
          console.warn('⚠️ Redis connection close warning:', error);
        }

        console.log('✅ Graceful shutdown completed');
        process.exit(0);

      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Handle different termination signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // Nodemon restart

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      shutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
  }
}

// Create and start server
const server = new Server();
server.start().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});

// Export for testing purposes
export default server;
