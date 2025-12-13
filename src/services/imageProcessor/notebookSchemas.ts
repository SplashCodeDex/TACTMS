/**
 * JSON Schema definitions for Notebook format extraction
 * Used when detecting and extracting from makeshift notebook entries
 */
import { SchemaType, type Schema } from "@google/generative-ai";

// ============================================================================
// NOTEBOOK DETECTION SCHEMA
// ============================================================================

/**
 * Schema for detecting if an image is a notebook vs official tithe book
 */
export const NOTEBOOK_DETECTION_SCHEMA: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        isNotebook: {
            type: SchemaType.BOOLEAN,
            description: "True if the image appears to be a makeshift notebook/paper, NOT the official 'THE APOSTOLIC CHURCH-GHANA TITHES REGISTER' book."
        },
        confidence: {
            type: SchemaType.NUMBER,
            description: "Confidence score 0-1 for the notebook detection."
        },
        detectedDate: {
            type: SchemaType.STRING,
            description: "Date if visible at the top of the page (e.g., '6/7/25', '29/06/25'). Return in DD/MM/YY format if found."
        },
        extractedAttendance: {
            type: SchemaType.NUMBER,
            description: "Attendance count if visible in header (e.g., 'Attendance = 60' returns 60)."
        },
        signals: {
            type: SchemaType.OBJECT,
            description: "Detection signals for classification.",
            properties: {
                hasStructuredGrid: { type: SchemaType.BOOLEAN, description: "True if image has structured table/grid with month columns." },
                hasPageNumber: { type: SchemaType.BOOLEAN, description: "True if page number visible in colored box at bottom." },
                hasMonthHeaders: { type: SchemaType.BOOLEAN, description: "True if month column headers visible (JANUARY, FEBRUARY, etc.)." },
                hasChurchBranding: { type: SchemaType.BOOLEAN, description: "True if 'THE APOSTOLIC CHURCH-GHANA' branding/watermark visible." },
                hasSimpleNameAmountFormat: { type: SchemaType.BOOLEAN, description: "True if simple two-column Name-Amount format." },
                hasAttendanceHeader: { type: SchemaType.BOOLEAN, description: "True if 'Attendance' header visible at top." },
                hasLinedPaperPattern: { type: SchemaType.BOOLEAN, description: "True if simple ruled/lined notebook paper (not tithe book grid)." }
            }
        },
        detectionReasons: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "List of reasons for the classification decision."
        }
    },
    required: ["isNotebook", "confidence", "signals", "detectionReasons"]
};

// ============================================================================
// NOTEBOOK EXTRACTION SCHEMA
// ============================================================================

/**
 * Schema for extracting tithe records from notebook format
 * Simpler than tithe book schema - just names and amounts
 */
export const NOTEBOOK_EXTRACTION_SCHEMA: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        isValidNotebook: {
            type: SchemaType.BOOLEAN,
            description: "True if the image contains valid notebook-style tithe entries."
        },
        detectedDate: {
            type: SchemaType.STRING,
            description: "Date from notebook header in DD/MM/YY format."
        },
        attendance: {
            type: SchemaType.NUMBER,
            description: "Attendance count if visible in header."
        },
        entries: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    "name": {
                        type: SchemaType.STRING,
                        description: "Full name of the tither. Include titles like D'cns, DCNS, Mrs, Elder, etc."
                    },
                    "rawAmountText": {
                        type: SchemaType.STRING,
                        description: "Exact characters you see for the amount (e.g., '10.w', '100.w', '5', '-'). IMPORTANT: 'w' or '.w' is shorthand for '00' pesewas (the decimal portion)."
                    },
                    "amount": {
                        type: SchemaType.NUMBER,
                        description: "Interpreted amount. 'w' = '00' after decimal (e.g., '10.w' = 10.00 = 10, '5.w' = 5.00 = 5, '100.w' = 100.00 = 100). Dash or empty = 0."
                    },
                    "legibility": {
                        type: SchemaType.NUMBER,
                        description: "Legibility score 1-5 (1=illegible, 5=crystal clear)."
                    }
                },
                required: ["name", "rawAmountText", "amount"]
            }
        }
    },
    required: ["isValidNotebook", "entries"]
};
