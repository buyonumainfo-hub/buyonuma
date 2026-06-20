/**
 * Frontend localStorage TTL cache — reduces repeat API calls.
 * Persists across page reloads and browser restarts (intentional).
 *
 * Usage:
 *   fCache.set('key', data, 60)   // store for 60 seconds
 *   fCache.get('key')             // returns data or null
 *   fCache.del('key')             // delete one entry
 *   fCache.delPrefix('sellers:')  // delete all keys starting with prefix
 *   fCache.flush()                // clear all cached items
 */

const CACHE_PREFIX = 'fcache_'; // Prefix to avoid collisions with other localStorage data

const fCache = {
  get(key) {
    const fullKey = CACHE_PREFIX + key;
    const item = localStorage.getItem(fullKey);
    
    
    if (!item) return null;
    
    try {
      const entry = JSON.parse(item);
      if (Date.now() > entry.expiresAt) {
        localStorage.removeItem(fullKey);
        return null;
      }
      return entry.value;
    } catch (e) {
      // Invalid data, remove it
      localStorage.removeItem(fullKey);
      return null;
    }
  },

  set(key, value, ttlSeconds = 30) {
    const fullKey = CACHE_PREFIX + key;
    const entry = {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    };
    localStorage.setItem(fullKey, JSON.stringify(entry));
  },

  del(key) {
    localStorage.removeItem(CACHE_PREFIX + key);
  },

  delPrefix(prefix) {
    const fullPrefix = CACHE_PREFIX + prefix;
    const keysToRemove = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(fullPrefix)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  },

  flush() {
    const keysToRemove = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  },
};

// Auto-prune expired items every 2 minutes
setInterval(() => {
  const now = Date.now();
  const keysToRemove = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX)) {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const entry = JSON.parse(item);
          if (now > entry.expiresAt) {
            keysToRemove.push(key);
          }
        }
      } catch (e) {
        // If data is corrupted, remove it
        keysToRemove.push(key);
      }
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
}, 2 * 60 * 1000);

export default fCache;