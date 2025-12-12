/**
 * Notebook Format Detector
 * Detects if an image is a makeshift notebook vs official tithe book
 *
 * Detection Signals (Notebook):
 * - No structured grid/table lines
 * - No page number in colored box at bottom
 * - No month column headers (JANUARY, FEBRUARY, etc.)
 * - Simple lined paper pattern
 * - "Attendance" header or similar informal headers
 *
 * Detection Signals (Official Tithe Book):
 * - "THE APOSTOLIC CHURCH-GHANA" branding/watermark
 * - Page number in colored box
 * - Structured grid with month headers
 * - Week columns (1st, 2nd, 3rd, 4th, 5th, TOTAL)
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
    MODEL_NAME,
    fileToGenerativePart,
    checkGeminiRateLimit,
    recordGeminiCall
} from "./core";
import { NOTEBOOK_DETECTION_SCHEMA } from "./notebookSchemas";
import type { NotebookDetectionResult, NotebookDetectionSignals } from "./types";

// ============================================================================
// DETECTION PROMPT
// ============================================================================

const DETECTION_PROMPT = `
You are an image classifier for The Apostolic Church Ghana tithe records.

Your task is to determine if this image shows:
1. **Official TITHES REGISTER book** - A branded, structured ledger with grid lines, month columns, week sub-columns, and page numbers.
2. **Makeshift Notebook** - Plain lined paper with simple Name-Amount entries, often with "Attendance" header.

## OFFICIAL TITHE BOOK CHARACTERISTICS:
- Branded with "THE APOSTOLIC CHURCH-GHANA, TITHES REGISTER"
- Has a structured grid with columns: NO., NAME, then MONTHS (JANUARY - DECEMBER)
- Each month has sub-columns: 1st, 2nd, 3rd, 4th, 5th, TOTAL
- Page number in colored box at bottom
- May show church watermark/logo
- Landscape orientation when open

## MAKESHIFT NOTEBOOK CHARACTERISTICS:
- Plain ruled/lined notebook paper
- Simple two-column format: Name | Amount
- May have "Attendance" header at top
- Date written informally (e.g., "6/7/25", "29/06/25")
- No month columns, no week sub-columns
- No church branding
- Portrait orientation typically

## AMOUNT NOTATION:
In notebooks, "w" or ".w" after a number means "00" (shorthand for fast writing):
- "10.w" = 1000
- "5.w" = 500
- "20.w" = 2000

Analyze the image and classify it.
`;

// ============================================================================
// DETECTOR FUNCTION
// ============================================================================

/**
 * Detect if an image is a notebook format vs official tithe book
 *
 * @param imageFile - The image file to analyze
 * @param apiKey - Gemini API key
 * @returns Detection result with confidence and signals
 */
export async function detectNotebookFormat(
    imageFile: File,
    apiKey: string
): Promise<NotebookDetectionResult> {
    if (!apiKey) throw new Error("API Key is missing");

    // Check rate limit before making API call
    checkGeminiRateLimit();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const imageParts = await fileToGenerativePart(imageFile);

    // Record API call for rate limiting
    recordGeminiCall();

    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: DETECTION_PROMPT }, imageParts] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: NOTEBOOK_DETECTION_SCHEMA,
            },
        });

        const jsonString = result.response.text().trim();
        const detection = JSON.parse(jsonString);

        // Ensure all signals have boolean values (handle undefined from AI)
        const signals: NotebookDetectionSignals = {
            hasStructuredGrid: detection.signals?.hasStructuredGrid ?? false,
            hasPageNumber: detection.signals?.hasPageNumber ?? false,
            hasMonthHeaders: detection.signals?.hasMonthHeaders ?? false,
            hasChurchBranding: detection.signals?.hasChurchBranding ?? false,
            hasSimpleNameAmountFormat: detection.signals?.hasSimpleNameAmountFormat ?? false,
            hasAttendanceHeader: detection.signals?.hasAttendanceHeader ?? false,
            hasLinedPaperPattern: detection.signals?.hasLinedPaperPattern ?? false,
        };

        // Log detection for debugging
        console.log(`[NotebookDetector] isNotebook: ${detection.isNotebook}, confidence: ${detection.confidence}`);
        console.log(`[NotebookDetector] Signals:`, signals);
        if (detection.detectionReasons) {
            console.log(`[NotebookDetector] Reasons:`, detection.detectionReasons);
        }

        return {
            isNotebook: detection.isNotebook ?? false,
            confidence: detection.confidence ?? 0,
            detectedDate: detection.detectedDate,
            extractedAttendance: detection.extractedAttendance,
            signals,
            detectionReasons: detection.detectionReasons || [],
        };

    } catch (error) {
        console.error("[NotebookDetector] Detection failed:", error);
        // Return safe default (assume tithe book to avoid false positives)
        return {
            isNotebook: false,
            confidence: 0,
            signals: {
                hasStructuredGrid: false,
                hasPageNumber: false,
                hasMonthHeaders: false,
                hasChurchBranding: false,
                hasSimpleNameAmountFormat: false,
                hasAttendanceHeader: false,
                hasLinedPaperPattern: false,
            },
            detectionReasons: ["Detection failed - defaulting to tithe book"],
        };
    }
}
