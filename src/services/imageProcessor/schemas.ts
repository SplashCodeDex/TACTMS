/**
 * JSON Schema definitions for Gemini AI responses
 * Extracted from imageProcessor.ts
 *
 * Enhanced with:
 * - Zone detection metadata
 * - Legibility scoring
 * - Ink color detection
 * - Cell condition tracking
 */
import { SchemaType, type Schema } from "@google/generative-ai";

// ============================================================================
// TITHE EXTRACTION SCHEMA
// ============================================================================

/**
 * Schema for extracting tithe records from book images
 * Enhanced with zone detection, legibility scoring, and visual cues
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
            description: "The page number visible at the bottom of the page (in colored box)."
        },
        targetColumnZone: {
            type: SchemaType.OBJECT,
            description: "Metadata about the detected target column zone.",
            properties: {
                columnHeader: { type: SchemaType.STRING, description: "The detected column header text (e.g., '2nd', '3rd')." },
                monthHeader: { type: SchemaType.STRING, description: "The detected month header (e.g., 'MARCH', 'APRIL')." },
                relativePosition: { type: SchemaType.STRING, description: "Position: 'left-third', 'center', 'right-third' of the visible page." },
                columnsFromTotal: { type: SchemaType.NUMBER, description: "Number of columns to the left of the TOTAL column." },
                totalColumnHasRedInk: { type: SchemaType.BOOLEAN, description: "True if the TOTAL column contains entries in red ink (visual landmark)." }
            }
        },
        setInfo: {
            type: SchemaType.OBJECT,
            description: "SET information derived from page number.",
            properties: {
                setNumber: { type: SchemaType.NUMBER, description: "SET number (1, 2, 3...) calculated from page number." },
                memberRangeStart: { type: SchemaType.NUMBER, description: "First member number in this SET (e.g., 1, 32, 63)." },
                memberRangeEnd: { type: SchemaType.NUMBER, description: "Last member number in this SET (e.g., 31, 62, 93)." }
            }
        },
        entries: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    "No.": { type: SchemaType.NUMBER, description: "The sequential number from the book row." },
                    "Name": { type: SchemaType.STRING, description: "The full name of the tither. Fix any obvious handwriting errors based on common Ghanaian names." },
                    "Amount": { type: SchemaType.NUMBER, description: "The specific amount in the target column. Use 0 for blanks, dashes, or crossed-out entries." },
                    "legibility": { type: SchemaType.NUMBER, description: "Legibility score 1-5 (1=illegible, 5=crystal clear)." },
                    "rawAmountText": { type: SchemaType.STRING, description: "The exact characters you see before interpretation (e.g., '1OO', '5O', '-')." },
                    "inkColor": { type: SchemaType.STRING, description: "Ink color: 'red', 'blue', 'black', or 'unknown'. Red ink usually means TOTAL column." },
                    "cellCondition": { type: SchemaType.STRING, description: "Cell condition: 'clean', 'corrected' (strikethrough with new value), 'smudged', 'empty'." }
                },
                required: ["No.", "Name", "Amount", "legibility"]
            }
        }
    },
    required: ["isValidTitheBook", "entries", "pageNumber"]
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
