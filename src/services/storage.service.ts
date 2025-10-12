/**
 * StorageService - localStorage abstraction with TTL, namespacing, and in-memory cache
 */

interface StorageItem<T> {
  value: T;
  expiresAt?: number;
}

class StorageService {
  private namespace: string;
  private cache: Map<string, any>;

  constructor(namespace = "niri_app") {
    this.namespace = namespace;
    this.cache = new Map();
  }

  private getKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  set<T>(key: string, value: T, ttlSeconds?: number): void {
    const storageKey = this.getKey(key);
    const item: StorageItem<T> = {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    };

    console.log(`💾 StorageService.set() - Key: ${storageKey}`, {
      value,
      ttlSeconds,
      expiresAt: item.expiresAt
        ? new Date(item.expiresAt).toISOString()
        : "never",
    });

    try {
      localStorage.setItem(storageKey, JSON.stringify(item));
      this.cache.set(storageKey, value);
      console.log(`✅ Successfully stored in localStorage: ${storageKey}`);
    } catch (error) {
      console.error("Storage write error:", error);
    }
  }

  get<T>(key: string): T | null {
    const storageKey = this.getKey(key);

    // Check in-memory cache first
    if (this.cache.has(storageKey)) {
      return this.cache.get(storageKey);
    }

    try {
      const itemStr = localStorage.getItem(storageKey);
      if (!itemStr) return null;

      const item: StorageItem<T> = JSON.parse(itemStr);

      // Check expiry
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.remove(key);
        return null;
      }

      // Update cache
      this.cache.set(storageKey, item.value);
      return item.value;
    } catch (error) {
      console.error("Storage read error:", error);
      return null;
    }
  }

  remove(key: string): void {
    const storageKey = this.getKey(key);
    localStorage.removeItem(storageKey);
    this.cache.delete(storageKey);
  }

  clear(): void {
    // Only clear items with our namespace
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(`${this.namespace}:`)) {
        localStorage.removeItem(key);
      }
    });
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

export const storageService = new StorageService();
