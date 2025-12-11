/**
 * Image Processing Module - Public API
 *
 * This module provides AI-powered image processing for:
 * 1. Tithe book OCR extraction
 * 2. Name extraction and matching
 *
 * @module imageProcessor
 */

// Re-export types
export type {
    TitheImageExtractionResult,
    NameMatchResult,
    NameExtractionResult,
    EnhancedRawExtraction,
    ScoredMember,
    MatchResult
} from './types';

// Re-export constants and utilities from core
export {
    LOW_CONFIDENCE_THRESHOLD,
    MODEL_NAME,
    MONTHS,
    MEMBERS_PER_SET,
    inferMemberRangeFromPage,
    validateMonthOnPage,
    getWeekColumnOffset
} from './core';

// Re-export main functions
export { processTitheImageWithValidation, verifyLowConfidenceEntries } from './titheExtractor';
export { extractNamesFromTitheBook } from './nameExtractor';

// Re-export matching utilities (for advanced use cases)
export {
    levenshteinDistance,
    calculateSimilarity,
    tokenSimilarity,
    findBestMatch,
    findOptimalMatches
} from './matching';

export type { ExtractedNameInput, OptimalMatchResult } from './matching';
