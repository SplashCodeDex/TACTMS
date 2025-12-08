/**
 * JSON Schema definitions for Gemini AI responses
 * Extracted from imageProcessor.ts
 */
import { SchemaType, type Schema } from "@google/generative-ai";

// ============================================================================
// TITHE EXTRACTION SCHEMA
// ============================================================================

/**
 * Schema for extracting tithe records from book images
 */
export const TITHE_EXTRACTION_SCHEMA: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        isValidTitheBook: {
            type: SchemaType.BOOLEAN,
            description: "True if the image matches the expected 'THE APOSTOLIC CHURCH GHANA, TITHES REGISTER' format."
        },
        detectedYear: {
            type: SchemaType.STRING,
            description: "The year if visible in the header (e.g., '2025') else, use the current year."
        },
        pageNumber: {
            type: SchemaType.NUMBER,
            description: "The page number if visible at the bottom."
        },
        entries: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    "No.": { type: SchemaType.NUMBER, description: "The sequential number from the book row." },
                    "Name": { type: SchemaType.STRING, description: "The full name of the tither. Fix any obvious handwriting errors based on common Ghanaian names." },
                    "Amount": { type: SchemaType.NUMBER, description: "The specific amount in the target column. Use 0 for blanks or dashes." },
                },
                required: ["No.", "Name", "Amount"]
            }
        }
    },
    required: ["isValidTitheBook", "entries"]
};

// ============================================================================
// NAME EXTRACTION SCHEMA
// ============================================================================

/**
 * Schema for extracting names from tithe book NAME column
 */
export const NAME_EXTRACTION_SCHEMA: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        names: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    "No.": { type: SchemaType.NUMBER, description: "The row number from the NO. column" },
                    "Name": { type: SchemaType.STRING, description: "The full handwritten name from the NAME column" },
                },
                required: ["No.", "Name"]
            }
        }
    },
    required: ["names"]
};
