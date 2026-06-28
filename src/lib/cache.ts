/**
 * Lightweight in-memory TTL cache (Redis replacement for sandbox).
 * Supports namespacing, get/set with TTL, invalidation by key/prefix.
 */

interface Entry<T> {
  value: T
  expiresAt: number
}

const store = new Map<string, Entry<unknown>>()

const DEFAULT_TTL = 60 * 1000 // 1 min

export const cache = {
  get<T>(key: string): T | null {
    const e = store.get(key)
    if (!e) return null
    if (e.expiresAt < Date.now()) {
      store.delete(key)
      return null
    }
    return e.value as T
  },

  set<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL): void {
    store.set(key, { value, expiresAt: Date.now() + ttlMs })
  },

  invalidate(key: string): void {
    store.delete(key)
  },

  invalidatePrefix(prefix: string): void {
    for (const k of store.keys()) {
      if (k.startsWith(prefix)) store.delete(k)
    }
  },

  clear(): void {
    store.clear()
  },

  /** Get-or-set helper */
  async wrap<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const hit = cache.get<T>(key)
    if (hit !== null) return hit
    const value = await fn()
    cache.set(key, value, ttlMs)
    return value
  },
}

export function cacheKey(...parts: (string | number | boolean)[]): string {
  return parts.join(":")
}
