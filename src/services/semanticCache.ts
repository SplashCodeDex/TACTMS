/**
 * Semantic Cache Service
 * Stores AI-driven member reconciliation decisions to minimize API costs and latency.
 */

export interface SemanticCacheEntry {
    rawName: string;
    matchedMemberId: string | null; // null means "no match found by AI"
    confidence: number;
    timestamp: number;
    modelUsed: string;
}

const CACHE_KEY = 'tactms_semantic_cache_v1';
const CACHE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

class SemanticCacheService {
    private cache: Map<string, SemanticCacheEntry>;

    constructor() {
        this.cache = new Map();
        this.loadFromStorage();
    }

    private loadFromStorage() {
        try {
            const stored = localStorage.getItem(CACHE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Convert object back to Map
                Object.values(parsed).forEach((entry: any) => {
                    // Validate entry structure
                    if (entry && entry.rawName) {
                        this.cache.set(entry.rawName.toLowerCase(), entry);
                    }
                });
            }
        } catch (e) {
            console.warn('Failed to load semantic cache:', e);
        }
    }

    private saveToStorage() {
        try {
            // Convert Map to object for JSON storage
            const obj: Record<string, SemanticCacheEntry> = {};
            this.cache.forEach((value, key) => {
                obj[key] = value;
            });
            localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
        } catch (e) {
            console.warn('Failed to save semantic cache:', e);
        }
    }

    /**
     * Get a cached decision for a raw name
     */
    get(rawName: string): SemanticCacheEntry | null {
        const key = rawName.toLowerCase().trim();
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
     * Store a new AI decision
     */
    set(rawName: string, matchedMemberId: string | null, confidence: number, modelUsed: string) {
        const key = rawName.toLowerCase().trim();
        const entry: SemanticCacheEntry = {
            rawName,
            matchedMemberId,
            confidence,
            timestamp: Date.now(),
            modelUsed
        };

        this.cache.set(key, entry);
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
            lastSaved: new Date().toISOString()
        };
    }
}

export const semanticCache = new SemanticCacheService();
