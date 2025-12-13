/**
 * Chat Response Cache
 * Caches AI chat responses for instant repeat query handling
 * Reduces API costs and improves UX for common questions
 */

const CACHE_KEY = 'tactms_chat_cache_v1';
const MAX_CACHE_SIZE = 50;
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedResponse {
    query: string;
    response: string;
    suggestions?: string[];
    timestamp: number;
}

class ChatResponseCache {
    private cache: Map<string, CachedResponse>;

    constructor() {
        this.cache = new Map();
        this.loadFromStorage();
    }

    private loadFromStorage() {
        try {
            const stored = localStorage.getItem(CACHE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as CachedResponse[];
                parsed.forEach(entry => {
                    if (entry.query) {
                        this.cache.set(this.normalizeQuery(entry.query), entry);
                    }
                });
            }
        } catch (e) {
            console.warn('Failed to load chat cache:', e);
        }
    }

    private saveToStorage() {
        try {
            const entries = Array.from(this.cache.values());
            localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
        } catch (e) {
            console.warn('Failed to save chat cache:', e);
        }
    }

    private normalizeQuery(query: string): string {
        return query.toLowerCase().trim().replace(/\s+/g, ' ');
    }

    /**
     * Get a cached response for a query
     */
    get(query: string): CachedResponse | null {
        const key = this.normalizeQuery(query);
        const entry = this.cache.get(key);

        if (!entry) return null;

        // Check expiry
        if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
            this.cache.delete(key);
            this.saveToStorage();
            return null;
        }

        return entry;
    }

    /**
     * Store a response in the cache
     */
    set(query: string, response: string, suggestions?: string[]) {
        const key = this.normalizeQuery(query);

        // Evict oldest if at capacity
        if (this.cache.size >= MAX_CACHE_SIZE) {
            const oldest = Array.from(this.cache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
            if (oldest) {
                this.cache.delete(oldest[0]);
            }
        }

        this.cache.set(key, {
            query,
            response,
            suggestions,
            timestamp: Date.now()
        });

        this.saveToStorage();
    }

    /**
     * Clear the cache
     */
    clear() {
        this.cache.clear();
        localStorage.removeItem(CACHE_KEY);
    }

    /**
     * Get cache stats
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: MAX_CACHE_SIZE
        };
    }
}

export const chatCache = new ChatResponseCache();
