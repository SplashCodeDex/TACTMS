/**
 * Rate Limiter Utility
 * Prevents API overuse by limiting request frequency
 */

interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}

interface RateLimitState {
    requests: number[];
    blocked: boolean;
    nextAvailable: number;
}

const rateLimitStates = new Map<string, RateLimitState>();

/**
 * Default rate limits for different API tiers
 */
export const RATE_LIMITS = {
    /** Gemini API - 15 requests per minute (conservative) */
    GEMINI: { maxRequests: 15, windowMs: 60 * 1000 },
    /** Bulk operations - 5 per minute */
    BULK: { maxRequests: 5, windowMs: 60 * 1000 },
    /** General API calls - 30 per minute */
    GENERAL: { maxRequests: 30, windowMs: 60 * 1000 },
} as const;

/**
 * Check if a request can be made under rate limit
 * @param key Unique identifier for this rate limit bucket
 * @param config Rate limit configuration
 * @returns true if request is allowed
 */
export function canMakeRequest(
    key: string,
    config: RateLimitConfig = RATE_LIMITS.GENERAL
): boolean {
    const now = Date.now();
    let state = rateLimitStates.get(key);

    if (!state) {
        state = { requests: [], blocked: false, nextAvailable: 0 };
        rateLimitStates.set(key, state);
    }

    // Clean up old requests outside the window
    state.requests = state.requests.filter(
        timestamp => now - timestamp < config.windowMs
    );

    // Check if we're under the limit
    return state.requests.length < config.maxRequests;
}

/**
 * Record a request for rate limiting
 * @param key Unique identifier for this rate limit bucket
 */
export function recordRequest(key: string): void {
    const state = rateLimitStates.get(key);
    if (state) {
        state.requests.push(Date.now());
    }
}

/**
 * Get remaining requests in current window
 * @param key Unique identifier for this rate limit bucket
 * @param config Rate limit configuration
 */
export function getRemainingRequests(
    key: string,
    config: RateLimitConfig = RATE_LIMITS.GENERAL
): number {
    const now = Date.now();
    const state = rateLimitStates.get(key);

    if (!state) return config.maxRequests;

    const validRequests = state.requests.filter(
        timestamp => now - timestamp < config.windowMs
    );

    return Math.max(0, config.maxRequests - validRequests.length);
}

/**
 * Get time until rate limit resets (in ms)
 */
export function getTimeUntilReset(
    key: string,
    config: RateLimitConfig = RATE_LIMITS.GENERAL
): number {
    const now = Date.now();
    const state = rateLimitStates.get(key);

    if (!state || state.requests.length === 0) return 0;

    const oldestRequest = Math.min(...state.requests);
    const resetTime = oldestRequest + config.windowMs;

    return Math.max(0, resetTime - now);
}

/**
 * Wrap an async function with rate limiting
 * @param fn Function to wrap
 * @param key Rate limit bucket key
 * @param config Rate limit configuration
 * @returns Wrapped function that respects rate limits
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    key: string,
    config: RateLimitConfig = RATE_LIMITS.GEMINI
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
        if (!canMakeRequest(key, config)) {
            const waitTime = getTimeUntilReset(key, config);
            throw new RateLimitError(
                `Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)}s`,
                waitTime
            );
        }

        recordRequest(key);
        return fn(...args);
    };
}

/**
 * Custom error for rate limit violations
 */
export class RateLimitError extends Error {
    constructor(
        message: string,
        public readonly retryAfterMs: number
    ) {
        super(message);
        this.name = 'RateLimitError';
    }
}

/**
 * Reset rate limit state (useful for testing)
 */
export function resetRateLimits(key?: string): void {
    if (key) {
        rateLimitStates.delete(key);
    } else {
        rateLimitStates.clear();
    }
}
