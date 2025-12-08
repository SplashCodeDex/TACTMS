/**
 * Image Processing Service
 *
 * This file re-exports all image processing functionality from the modular structure.
 * The actual implementation is split across multiple files in ./imageProcessor/
 *
 * @module imageProcessor
 *
 * Modules:
 * - core.ts: Configuration and utilities (MODEL_NAME, LOW_CONFIDENCE_THRESHOLD)
 * - types.ts: Type definitions
 * - schemas.ts: JSON schemas for AI responses
 * - templates.ts: HTML template for visual reference
 * - matching.ts: Fuzzy name matching algorithms
 * - titheExtractor.ts: processTitheImageWithValidation
 * - nameExtractor.ts: extractNamesFromTitheBook
 */

// Re-export all public API from the modular structure
export * from './imageProcessor/index';
