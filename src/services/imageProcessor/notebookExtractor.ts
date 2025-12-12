/**
 * Notebook Tithe Extractor
 * Extracts tithe records from makeshift notebook format
 *
 * Key differences from titheExtractor.ts:
 * - No SET/page inference
 * - No column zone detection
 * - Handles ".w" → "00" notation
 * - Simple Name-Amount pair extraction
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { TitheRecordB } from "../../types";
import { cleanNotebookAmount } from "@/utils/stringUtils";
import { cleanOCRName } from "../imageValidator";
import {
    MODEL_NAME,
    fileToGenerativePart,
    checkGeminiRateLimit,
    recordGeminiCall
} from "./core";
import { NOTEBOOK_EXTRACTION_SCHEMA } from "./notebookSchemas";
import type { NotebookExtractionResult, NotebookRawEntry } from "./types";

// ============================================================================
// COMMON TITHE AMOUNTS (for confidence calculation)
// ============================================================================

const COMMON_TITHE_AMOUNTS = [5, 10, 20, 30, 40, 50, 60, 70, 80, 100, 150, 200, 250, 300, 400, 500, 1000, 2000, 5000];

// ============================================================================
// EXTRACTION PROMPT
// ============================================================================

const EXTRACTION_PROMPT = `
You are a data entry specialist extracting tithe records from a handwritten notebook.

This is a MAKESHIFT NOTEBOOK, not the official tithe book. It contains simple Name-Amount entries.

## YOUR TASK:
Extract every name and amount pair from this notebook page.

## CRITICAL: AMOUNT NOTATION
Writers use "w" or ".w" as shorthand for "00" (double zero):
- "10.w" or "10w" = 1000
- "5.w" or "5w" = 500
- "100.w" = 10000
- "20.w" = 2000

## NAME PATTERNS (Ghanaian):
- Titles: PASTOR, DEACON, DEACONESS, ELDER, MRS, MADAM, LADY
- Abbreviated: PST, DCN, DCNS, D'CNS, D'cns, ELD, APT
- Common surnames: MENSAH, OWUSU, ASANTE, BOATENG, QUARTEY, LAMPTEY, ANKRAH

## AMOUNT INTERPRETATION:
- Empty cell, dash "-", or illegible → 0
- "w" or ".w" suffix → multiply base by 100

## HEADER INFORMATION:
- Look for "Attendance = XX" and extract the number
- Look for date at top (e.g., "6/7/25", "29/06/25") and extract it

Return the rawAmountText EXACTLY as you see it (including the "w" if present), then interpret the amount.
`;

// ============================================================================
// CONFIDENCE CALCULATION
// ============================================================================

function calculateNotebookConfidence(
    amount: number,
    legibility: number = 3,
    rawText?: string
): number {
    let confidence = 0.5; // Base confidence

    // Factor 1: Legibility (1-5 scale)
    const legibilityBoost = (legibility - 1) / 4 * 0.35;
    confidence += legibilityBoost;

    // Factor 2: Common amount pattern
    if (COMMON_TITHE_AMOUNTS.includes(amount)) {
        confidence += 0.1;
    } else {
        // Close to common amount?
        const nearestCommon = COMMON_TITHE_AMOUNTS.find(
            ca => ca > 0 && Math.abs(ca - amount) / ca < 0.05
        );
        if (nearestCommon) {
            confidence += 0.05;
        }
    }

    // Factor 3: Had "w" notation (correctly interpreted)
    if (rawText && /[wW]$/.test(rawText)) {
        confidence += 0.05; // Slight boost for recognized notation
    }

    // Factor 4: Zero is always certain
    if (amount === 0) {
        confidence = 0.95;
    }

    return Math.min(0.95, Math.max(0.1, confidence));
}

// ============================================================================
// EXTRACTOR FUNCTION
// ============================================================================

/**
 * Extract tithe records from a notebook image
 *
 * @param imageFile - The notebook image file
 * @param apiKey - Gemini API key
 * @param targetDateString - Target date for the tithe records
 * @returns Extraction result with entries
 */
export async function processNotebookImage(
    imageFile: File,
    apiKey: string,
    targetDateString: string
): Promise<NotebookExtractionResult> {
    if (!apiKey) throw new Error("API Key is missing");
    if (!targetDateString) throw new Error("Target date is required");

    // Check rate limit before making API call
    checkGeminiRateLimit();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const imageParts = await fileToGenerativePart(imageFile);

    // Record API call for rate limiting
    recordGeminiCall();

    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: EXTRACTION_PROMPT }, imageParts] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: NOTEBOOK_EXTRACTION_SCHEMA,
            },
        });

        const jsonString = result.response.text().trim();
        const extraction = JSON.parse(jsonString);

        // Log extraction summary
        console.log(`[NotebookExtractor] Valid: ${extraction.isValidNotebook}, Entries: ${extraction.entries?.length || 0}`);
        if (extraction.detectedDate) {
            console.log(`[NotebookExtractor] Detected date: ${extraction.detectedDate}`);
        }
        if (extraction.attendance) {
            console.log(`[NotebookExtractor] Attendance: ${extraction.attendance}`);
        }

        // Track low confidence entries
        let lowConfidenceCount = 0;

        // Store raw entries for debugging
        const rawEntries: NotebookRawEntry[] = [];

        // Map entries to TitheRecordB format
        const entries: TitheRecordB[] = (extraction.entries || []).map(
            (item: { name: string; rawAmountText: string; amount: number; legibility?: number }, index: number) => {
                // Clean the name
                const cleanedName = cleanOCRName(item.name);

                // Store raw entry
                rawEntries.push({
                    name: item.name,
                    rawAmountText: item.rawAmountText,
                    amount: item.amount,
                    legibility: item.legibility,
                });

                // Clean the amount using notebook-specific cleaner
                // This handles ".w" → "00" conversion
                const rawText = item.rawAmountText || String(item.amount);
                const finalAmount = cleanNotebookAmount(rawText);

                // Calculate confidence
                const confidence = calculateNotebookConfidence(
                    finalAmount,
                    item.legibility,
                    rawText
                );

                if (confidence < 0.6) {
                    lowConfidenceCount++;
                }

                // Log any ".w" conversions
                if (rawText && /[wW]$/.test(rawText)) {
                    console.log(`[NotebookExtractor] Converted "${rawText}" → ${finalAmount}`);
                }

                return {
                    "No.": index + 1,
                    "Transaction Type": "Individual Tithe-[Income]",
                    "Payment Source Type": "Registered Member",
                    "Membership Number": cleanedName,
                    "Transaction Date ('DD-MMM-YYYY')": targetDateString,
                    "Currency": "GHS",
                    "Exchange Rate": 1,
                    "Payment Method": "Cash",
                    "Transaction Amount": finalAmount,
                    "Narration/Description": `Tithe for ${targetDateString}`,
                    "Confidence": confidence,
                };
            }
        );

        return {
            isValidNotebook: extraction.isValidNotebook ?? true,
            detectedDate: extraction.detectedDate,
            attendance: extraction.attendance,
            entries,
            lowConfidenceCount,
            rawEntries,
        };

    } catch (error) {
        console.error("[NotebookExtractor] Extraction failed:", error);
        throw new Error("Failed to extract tithe records from notebook image.");
    }
}
