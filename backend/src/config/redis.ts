// src/config/redis.ts
import Redis from 'ioredis';

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redisClient.on('ready', () => {
  console.log('✅ Redis ready to use');
});

redisClient.on('end', () => {
  console.log('Redis connection closed');
});

// Connect to Redis (ioredis auto-connects, but you can force it)
export const connectRedis = async () => {
  try {
    // ioredis auto-connects, but we can check the connection
    await redisClient.ping();
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    return false;
  }
};

// Cache helper functions (simplified with ioredis)
export class CacheService {
  static async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const stringValue = JSON.stringify(value);
      if (ttl) {
        await redisClient.setex(key, ttl, stringValue);
      } else {
        await redisClient.set(key, stringValue);
      }
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  static async del(key: string): Promise<boolean> {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  static async setHash(key: string, field: string, value: any): Promise<boolean> {
    try {
      await redisClient.hset(key, field, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache hash set error:', error);
      return false;
    }
  }

  static async getHash<T>(key: string, field: string): Promise<T | null> {
    try {
      const value = await redisClient.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache hash get error:', error);
      return null;
    }
  }

  static async increment(key: string, increment = 1): Promise<number | null> {
    try {
      return await redisClient.incrby(key, increment);
    } catch (error) {
      console.error('Cache increment error:', error);
      return null;
    }
  }

  static async expire(key: string, ttl: number): Promise<boolean> {
    try {
      await redisClient.expire(key, ttl);
      return true;
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  }

  // Session-specific methods
  static async setSession(sessionId: string, data: any, ttl = 3600): Promise<boolean> {
    return this.set(`session:${sessionId}`, data, ttl);
  }

  static async getSession<T>(sessionId: string): Promise<T | null> {
    return this.get<T>(`session:${sessionId}`);
  }

  static async deleteSession(sessionId: string): Promise<boolean> {
    return this.del(`session:${sessionId}`);
  }

  // Rate limiting methods
  static async incrementRateLimit(key: string, window: number): Promise<number | null> {
    try {
      const pipeline = redisClient.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, window);
      const results = await pipeline.exec();
      
      if (results && results[0] && results[0][1]) {
        return results[0][1] as number;
      }
      return null;
    } catch (error) {
      console.error('Rate limit error:', error);
      return null;
    }
  }
}

export default redisClient;
