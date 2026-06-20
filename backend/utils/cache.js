/**
 * Upstash Redis caching component with graceful failure handling
 * 
 * Server continues to work even if Redis is unavailable
 * Returns null for all cache operations when Redis fails
 */

import { Redis } from '@upstash/redis';

// Initialize Redis client only if credentials exist
let redis = null;
let redisAvailable = false;

try {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (redisUrl && redisToken && !redisUrl.includes('your-region')) {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    redisAvailable = true;
    console.log('✅ Redis cache configured');
  } else {
    console.log('⚠️ Redis not configured - caching disabled');
  }
} catch (error) {
  console.error('❌ Redis initialization failed:', error.message);
  console.log('⚠️ Caching disabled - server will continue without cache');
}

// Test Redis connection periodically
if (redis) {
  (async function testRedisConnection() {
    try {
      await redis.ping();
      console.log('✅ Redis connection successful');
    } catch (error) {
      redisAvailable = false;
      console.error('❌ Redis connection failed:', error.message);
      console.log('⚠️ Caching disabled - server will continue without cache');
    }
  })();
  
  // Re-test connection every 30 seconds
  setInterval(async () => {
    if (!redisAvailable) {
      try {
        await redis.ping();
        redisAvailable = true;
        console.log('✅ Redis connection restored');
      } catch (error) {
        // Still unavailable, do nothing
      }
    }
  }, 30000);
}

const cache = {
  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} - Cached value or null
   */
  async get(key) {
    if (!redis || !redisAvailable) {
      return null; // Silently return null when cache unavailable
    }
    
    try {
      const value = await redis.get(key);
      return value !== null ? value : null;
    } catch (error) {
      console.error('Redis get error:', error.message);
      return null; // Return null on error, don't crash
    }
  },

  /**
   * Set a value in cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to store
   * @param {number} ttlSeconds - Time to live in seconds (default: 60)
   * @returns {Promise<void>}
   */
  async set(key, value, ttlSeconds = 60) {
    if (!redis || !redisAvailable) {
      return; // Silently fail when cache unavailable
    }
    
    try {
      await redis.setex(key, ttlSeconds, value);
    } catch (error) {
      console.error('Redis set error:', error.message);
      // Don't throw, just log
    }
  },

  /**
   * Delete a single key from cache
   * @param {string} key - Cache key to delete
   * @returns {Promise<void>}
   */
  async del(key) {
    if (!redis || !redisAvailable) {
      return; // Silently fail when cache unavailable
    }
    
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Redis del error:', error.message);
    }
  },

  /**
   * Delete all keys with a specific prefix
   * @param {string} prefix - Key prefix to delete
   * @returns {Promise<number>} - Number of keys deleted (0 if cache unavailable)
   */
  async delPrefix(prefix) {
    if (!redis || !redisAvailable) {
      return 0; // Return 0 when cache unavailable
    }
    
    try {
      let cursor = '0';
      let deletedCount = 0;
      
      do {
        const [nextCursor, keys] = await redis.scan(cursor, {
          match: `${prefix}*`,
          count: 100,
        });
        
        cursor = nextCursor;
        
        if (keys.length > 0) {
          const deleted = await redis.del(...keys);
          deletedCount += deleted;
        }
      } while (cursor !== '0');
      
      return deletedCount;
    } catch (error) {
      console.error('Redis delPrefix error:', error.message);
      return 0;
    }
  },

  /**
   * Clear all keys in the Redis database (use with caution!)
   * @returns {Promise<void>}
   */
  async flush() {
    if (!redis || !redisAvailable) {
      return; // Silently fail when cache unavailable
    }
    
    try {
      await redis.flushall();
    } catch (error) {
      console.error('Redis flush error:', error.message);
    }
  },

  /**
   * Get the number of keys in cache
   * @returns {Promise<number>} - Key count (0 if cache unavailable)
   */
  async size() {
    if (!redis || !redisAvailable) {
      return 0; // Return 0 when cache unavailable
    }
    
    try {
      return await redis.dbsize();
    } catch (error) {
      console.error('Redis size error:', error.message);
      return 0;
    }
  }
};

export default cache;