import type { CacheStore } from "./types.js";

export interface MemoryCacheStoreOptions {
  readonly maxEntries?: number;
  readonly now?: () => number;
}

interface MemoryCacheEntry {
  readonly value: unknown;
  readonly expiresAt: number;
}

export class MemoryCacheStore implements CacheStore {
  private readonly entries = new Map<string, MemoryCacheEntry>();
  private readonly maxEntries: number;
  private readonly now: () => number;

  constructor(options: MemoryCacheStoreOptions = {}) {
    this.maxEntries = options.maxEntries ?? 1000;
    this.now = options.now ?? Date.now;

    if (!Number.isInteger(this.maxEntries) || this.maxEntries < 1) {
      throw new Error("maxEntries pozitif bir tam sayı olmalı.");
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    if (ttlMs <= 0) {
      this.entries.delete(key);
      return;
    }

    this.entries.delete(key);
    this.entries.set(key, {
      value,
      expiresAt: this.now() + ttlMs,
    });

    this.evictIfNeeded();
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }

  async clear(): Promise<void> {
    this.entries.clear();
  }

  size(): number {
    return this.entries.size;
  }

  private evictIfNeeded(): void {
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) {
        return;
      }
      this.entries.delete(oldestKey);
    }
  }
}
