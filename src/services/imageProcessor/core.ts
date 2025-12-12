/**
 * Core utilities for image processing
 * Extracted from imageProcessor.ts
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL_NAME } from "@/constants";
import { canMakeRequest, recordRequest, RATE_LIMITS, RateLimitError, getTimeUntilReset } from "@/utils/rateLimiter";

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Gemini model for image processing - uses centralized constant */
export const MODEL_NAME = GEMINI_MODEL_NAME;

/** Rate limit key for Gemini API calls */
export const GEMINI_RATE_LIMIT_KEY = 'gemini_api';

/** Confidence threshold for flagging entries that need review */
export const LOW_CONFIDENCE_THRESHOLD = 0.8;

/**
 * Check if Gemini API request can be made (rate limit check)
 * @throws RateLimitError if limit exceeded
 */
export function checkGeminiRateLimit(): void {
    if (!canMakeRequest(GEMINI_RATE_LIMIT_KEY, RATE_LIMITS.GEMINI)) {
        const waitTime = getTimeUntilReset(GEMINI_RATE_LIMIT_KEY, RATE_LIMITS.GEMINI);
        throw new RateLimitError(
            `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds before trying again.`,
            waitTime
        );
    }
}

/**
 * Record a successful Gemini API call for rate limiting
 */
export function recordGeminiCall(): void {
    recordRequest(GEMINI_RATE_LIMIT_KEY);
}

// ============================================================================
// FILE UTILITIES
// ============================================================================

/**
 * Convert a File object to Gemini-compatible generative part
 * Extracts base64 data for inline image submission
 */
export async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            const base64Data = base64String.split(",")[1];
            resolve({
                inlineData: {
                    data: base64Data,
                    mimeType: file.type,
                },
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ============================================================================
// API CLIENT FACTORY
// ============================================================================

/**
 * Create a configured Gemini model instance
 */
export function createGeminiModel(apiKey: string) {
    if (!apiKey) throw new Error("API Key is missing");
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: MODEL_NAME });
}

// ============================================================================
// TITHE BOOK STRUCTURE UTILITIES
// ============================================================================

/** Months in order (0-indexed) */
export const MONTHS = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

/** Members per SET in the tithe book */
export const MEMBERS_PER_SET = 31;

/**
 * Infer the SET number and member range from a page number
 * - Pages 1-2 → SET 1 → Members 1-31
 * - Pages 3-4 → SET 2 → Members 32-62
 * - Pages 5-6 → SET 3 → Members 63-93
 */
export function inferMemberRangeFromPage(pageNumber: number): {
    setNumber: number;
    startMember: number;
    endMember: number;
} {
    // Guard against invalid page numbers
    const validPageNumber = Math.max(1, pageNumber);
    const setNumber = Math.ceil(validPageNumber / 2);
    const startMember = (setNumber - 1) * MEMBERS_PER_SET + 1;
    const endMember = setNumber * MEMBERS_PER_SET;
    return { setNumber, startMember, endMember };
}

/**
 * Validate that a month is visible on a given page
 * - ODD pages (1, 3, 5...): January → May (months 0-4)
 * - EVEN pages (2, 4, 6...): June → December (months 5-11)
 *
 * @returns Object with isValid flag and expected month range
 */
export function validateMonthOnPage(pageNumber: number, targetMonth: string): {
    isValid: boolean;
    expectedRange: string;
    pageType: 'odd' | 'even';
} {
    const monthIndex = MONTHS.indexOf(targetMonth.toUpperCase());
    if (monthIndex === -1) {
        return { isValid: false, expectedRange: 'Unknown month', pageType: pageNumber % 2 === 1 ? 'odd' : 'even' };
    }

    const isOddPage = pageNumber % 2 === 1;

    if (isOddPage) {
        // Odd pages: January-May (indices 0-4)
        return {
            isValid: monthIndex <= 4,
            expectedRange: 'January → May',
            pageType: 'odd'
        };
    } else {
        // Even pages: June-December (indices 5-11)
        return {
            isValid: monthIndex >= 5,
            expectedRange: 'June → December',
            pageType: 'even'
        };
    }
}

/**
 * Get the column position of a week relative to TOTAL column
 * TOTAL is always after 5th week, so:
 * - 1st week = 5 columns left of TOTAL
 * - 2nd week = 4 columns left of TOTAL
 * - etc.
 */
export function getWeekColumnOffset(weekString: string): number {
    const weekMap: Record<string, number> = {
        '1st': 5, 'Week 1': 5,
        '2nd': 4, 'Week 2': 4,
        '3rd': 3, 'Week 3': 3,
        '4th': 2, 'Week 4': 2,
        '5th': 1, 'Week 5': 1,
    };
    return weekMap[weekString] || 0;
}
