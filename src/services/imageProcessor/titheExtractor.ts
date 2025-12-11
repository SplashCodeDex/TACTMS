/**
 * Tithe Image Extraction
 * Processes tithe book images to extract tithe records using Gemini AI
 *
 * Enhanced with:
 * - Zone detection (PAGE → SET → Member Range inference)
 * - Month position validation (odd/even pages)
 * - Per-entry legibility, ink color, and cell condition scoring
 * - Adaptive confidence calculation
 * - Multi-pass verification for low-confidence entries
 * - Row context validation
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { TitheRecordB } from "../../types";
import { cleanOCRName } from "../imageValidator";
import { cleanOCRAmount } from "../../utils/stringUtils";
import {
    MODEL_NAME,
    fileToGenerativePart,
    inferMemberRangeFromPage,
    getWeekColumnOffset,
    MEMBERS_PER_SET
} from "./core";
import { TITHE_EXTRACTION_SCHEMA } from "./schemas";
import { TITHE_BOOK_HTML_TEMPLATE } from "./templates";
import { TitheImageExtractionResult, EnhancedRawExtraction, EnhancedRawEntry } from "./types";

// ============================================================================
// CONFIDENCE CALCULATION
// ============================================================================

/**
 * Common tithe amounts for pattern matching
 * Used to boost confidence when extracted amount is close to a common value
 */
const COMMON_TITHE_AMOUNTS = [5, 10, 20, 30, 40, 50, 60, 70, 80, 100, 150, 200, 250, 300, 400, 500, 1000, 2000, 5000];

/**
 * Calculate confidence score for an extracted amount
 * Factors: legibility, numeric purity, ink color, cell condition, common amounts, row position
 */
const calculateAmountConfidence = (
    amount: number,
    legibility: number = 3,
    rawText?: string,
    inkColor?: string,
    cellCondition?: string,
    rowNo?: number
): number => {
    let confidence = 0.5; // Base confidence

    // Factor 1: Legibility (1-5 scale from AI)
    const legibilityBoost = (legibility - 1) / 4 * 0.35;
    confidence += legibilityBoost;

    // Factor 2: Numeric purity of raw text
    if (rawText && rawText.length > 0) {
        const numericRatio = (rawText.match(/[0-9]/g) || []).length / rawText.length;
        if (numericRatio === 1) {
            confidence += 0.12;
        } else if (numericRatio < 0.5) {
            confidence -= 0.1;
        }
    }

    // Factor 3: Common amount pattern match
    const isCommonAmount = COMMON_TITHE_AMOUNTS.includes(amount);
    if (isCommonAmount) {
        confidence += 0.08;
    } else {
        const nearestCommon = COMMON_TITHE_AMOUNTS.find(
            ca => ca > 0 && Math.abs(ca - amount) / ca < 0.05
        );
        if (nearestCommon) {
            confidence += 0.04;
        }
    }

    // Factor 4: Ink color (red ink = suspicious, might be TOTAL column)
    if (inkColor === 'red') {
        confidence -= 0.15; // Red ink in week column is suspicious
    }

    // Factor 5: Cell condition
    if (cellCondition === 'corrected') {
        confidence -= 0.1; // Strikethrough with correction = less certain
    } else if (cellCondition === 'smudged') {
        confidence -= 0.2; // Smudged = very uncertain
    } else if (cellCondition === 'clean') {
        confidence += 0.05;
    }

    // Factor 6: Row position (rows 29-31 often empty/new members)
    if (rowNo) {
        const positionInSet = ((rowNo - 1) % MEMBERS_PER_SET) + 1;
        if (positionInSet <= 20) {
            confidence += 0.05; // Early rows, well-established
        } else if (positionInSet > 28) {
            confidence -= 0.03; // End rows, often new/empty
        }
    }

    // Factor 7: Zero/dash is always certain
    if (amount === 0) {
        confidence = 0.95;
    }

    return Math.min(0.98, Math.max(0.1, confidence));
};

// ============================================================================
// MAIN EXTRACTION
// ============================================================================

/**
 * Enhanced tithe image processor using gemini-2.5-flash
 * With advanced zone detection, SET inference, and multi-factor confidence
 */
export const processTitheImageWithValidation = async (
    imageFile: File,
    apiKey: string,
    targetMonth: string,
    targetWeek: string,
    targetDateString: string
): Promise<TitheImageExtractionResult> => {
    if (!apiKey) throw new Error("API Key is missing");
    if (!targetMonth || !targetWeek || !targetDateString) {
        throw new Error("Month, Week, and Date are required for extraction.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const imageParts = await fileToGenerativePart(imageFile);

    const weekColumnOffset = getWeekColumnOffset(targetWeek);

    // Advanced Prompt with Zone Detection, SET Inference, and Visual Cues
    const enhancedPrompt = `
    You are an expert Data Entry Specialist for The Apostolic Church Ghana.
    Your task is to digitize a page from the "TITHES REGISTER" book.

    ## TITHE BOOK STRUCTURE REFERENCE
    The physical book structure matches this HTML template:
\`\`\`html
    ${TITHE_BOOK_HTML_TEMPLATE}
\`\`\`

    ## TARGET DATA
    - **Month**: ${targetMonth.toUpperCase()}
    - **Week Column**: ${targetWeek.replace("Week ", "")} (e.g., "1st", "2nd", "3rd", "4th", "5th")

    ---
    ## STEP 1: PAGE NUMBER & SET DETECTION (CRITICAL!)

    1. Find the **PAGE NUMBER** in the colored box at the bottom of the page
    2. Calculate the **SET** and **Member Range**:
       - Pages 1-2 → SET 1 → Members 1-31
       - Pages 3-4 → SET 2 → Members 32-62
       - Pages 5-6 → SET 3 → Members 63-93
       - Pages 7-8 → SET 4 → Members 94-124
       - Formula: SET = ceil(pageNumber / 2), Members = (SET-1)*31+1 to SET*31
    3. Return this as \`setInfo\` in your response

    ---
    ## STEP 2: MONTH POSITION VALIDATION

    - **ODD pages (1, 3, 5, 7...)**: Show January → May
    - **EVEN pages (2, 4, 6, 8...)**: Show June → December

    If ${targetMonth.toUpperCase()} is NOT visible on the detected page type, flag this as invalid.

    ---
    ## STEP 3: COLUMN LANDMARK DETECTION

    1. Find the **TOTAL column** (usually has RED INK entries)
    2. Count backwards from TOTAL:
       - TOTAL ← 5th ← 4th ← 3rd ← 2nd ← 1st
       - Your target "${targetWeek.replace("Week ", "")}" column is **${weekColumnOffset} columns LEFT** of TOTAL
    3. Return \`columnsFromTotal: ${weekColumnOffset}\` and \`totalColumnHasRedInk\` in your response

    ---
    ## STEP 4: ROW-BY-ROW EXTRACTION

    For each row (1-31 in this SET):
    1. Read the **NO.** column (sequential number)
    2. Read the **NAME** column (handwritten member name)
    3. Read ONLY the value in YOUR TARGET COLUMN
    4. Rate each entry:
       - **legibility**: 1=illegible, 2=very hard, 3=readable with effort, 4=clear, 5=crystal clear
       - **rawAmountText**: Exact characters BEFORE interpretation (e.g., "1OO", "5O", "-")
       - **inkColor**: "red", "blue", "black", or "unknown"
       - **cellCondition**: "clean", "corrected" (strikethrough), "smudged", or "empty"

    ---
    ## STEP 5: AMOUNT INTERPRETATION

    Convert what you see to a number:
    - Empty cell, dash "-", "x", or illegible → **0**
    - Letter "O" → "0" (zero)
    - Letter "l" or "I" → "1"
    - Letter "S" → "5"
    - Crossed-out/strikethrough amounts → **0**
    - RED INK amounts in week columns → Flag as suspicious (might be reading TOTAL column by mistake)

    ---
    ## HANDWRITING PATTERNS (Ghanaian Names)

    - **Titles**: PASTOR, DEACON, DEACONESS, ELDER, MRS, MADAM (or: PST, DCN, DCNS, ELD, APT)
    - **Common surnames**: MENSAH, OWUSU, ASANTE, BOATENG, QUARTEY, LAMPTEY, ANKRAH, ADJEI
    - **Format**: [Title] Surname FirstName [OtherNames]

    ---
    ## RESPONSE REQUIREMENTS

    You MUST include:
    1. \`pageNumber\` - The detected page number
    2. \`setInfo\` - SET number and member range
    3. \`targetColumnZone\` - Column detection metadata
    4. \`entries\` - Array of extracted tithe records with all fields
    `;

    let result;
    try {
        result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: enhancedPrompt }, imageParts] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: TITHE_EXTRACTION_SCHEMA,
            },
        });
    } catch (error) {
        console.error("Error during Gemini content generation:", error);
        throw new Error("Failed to process image with AI. Check the API key or network connection.");
    }

    if (!result) throw new Error("Unexpected error: No result from AI model.");

    try {
        const jsonString = result.response.text().trim();
        const rawResult: EnhancedRawExtraction = JSON.parse(jsonString);

        // Log zone detection and SET info for debugging
        if (rawResult.pageNumber) {
            const inferredSet = inferMemberRangeFromPage(rawResult.pageNumber);
            console.log(`[TitheExtractor] Page ${rawResult.pageNumber} → SET ${inferredSet.setNumber} (Members ${inferredSet.startMember}-${inferredSet.endMember})`);

            // Validate month position on page
            const { validateMonthOnPage } = await import("./core");
            const monthValidation = validateMonthOnPage(rawResult.pageNumber, targetMonth);
            if (!monthValidation.isValid) {
                console.warn(`[TitheExtractor] WARNING: ${targetMonth} should not be on ${monthValidation.pageType} page (expected: ${monthValidation.expectedRange})`);
            }
        }
        if (rawResult.targetColumnZone) {
            console.log(`[TitheExtractor] Zone: ${rawResult.targetColumnZone.monthHeader} → ${rawResult.targetColumnZone.columnHeader}`);
            if (rawResult.targetColumnZone.totalColumnHasRedInk) {
                console.log(`[TitheExtractor] TOTAL column red ink detected (good landmark)`);
            }
        }

        // Count low confidence entries
        let lowConfidenceCount = 0;

        // Map entries to TitheRecordB format with adaptive confidence
        const entries: TitheRecordB[] = (rawResult.entries || []).map((item: EnhancedRawEntry, index) => {
            const cleanedName = cleanOCRName(item.Name);
            const cleanedAmount = cleanOCRAmount(item.Amount);

            // Calculate adaptive confidence with all factors
            const confidence = calculateAmountConfidence(
                cleanedAmount,
                item.legibility,
                item.rawAmountText,
                item.inkColor,
                item.cellCondition,
                item["No."]
            );

            if (confidence < 0.6) {
                lowConfidenceCount++;
            }

            // Warn if red ink detected in week column
            if (item.inkColor === 'red' && cleanedAmount > 0) {
                console.warn(`[TitheExtractor] Row ${item["No."]}: Red ink detected (${cleanedAmount}) - might be TOTAL column!`);
            }

            return {
                "No.": item["No."] || index + 1,
                "Transaction Type": "Individual Tithe-[Income]",
                "Payment Source Type": "Registered Member",
                "Membership Number": cleanedName,
                "Transaction Date ('DD-MMM-YYYY')": targetDateString,
                "Currency": "GHS",
                "Exchange Rate": 1,
                "Payment Method": "Cash",
                "Transaction Amount": cleanedAmount,
                "Narration/Description": `Tithe for ${targetDateString}`,
                "Confidence": confidence
            };
        });

        // Build SET info if page number is available
        const setInfo = rawResult.pageNumber
            ? inferMemberRangeFromPage(rawResult.pageNumber)
            : undefined;

        return {
            isValidTitheBook: rawResult.isValidTitheBook ?? true,
            detectedYear: rawResult.detectedYear || null,
            pageNumber: rawResult.pageNumber || null,
            entries,
            lowConfidenceCount,
            targetColumnZone: rawResult.targetColumnZone,
            setInfo: setInfo ? {
                setNumber: setInfo.setNumber,
                memberRangeStart: setInfo.startMember,
                memberRangeEnd: setInfo.endMember
            } : undefined
        };

    } catch (error) {
        console.error("Error parsing Gemini response:", error);
        throw new Error("Failed to parse AI response. The image might be too blurry or contain unexpected data.");
    }
};

// ============================================================================
// VERIFICATION PASS (Multi-Pass Cross-Validation)
// ============================================================================

/**
 * Verify low-confidence entries with a focused re-extraction
 * Includes row context validation (pattern checking)
 */
export const verifyLowConfidenceEntries = async (
    imageFile: File,
    apiKey: string,
    entries: TitheRecordB[],
    targetMonth: string,
    targetWeek: string,
    confidenceThreshold: number = 0.6
): Promise<TitheRecordB[]> => {
    const lowConfEntries = entries.filter(e => (e.Confidence ?? 0) < confidenceThreshold);

    if (lowConfEntries.length === 0) {
        console.log("[TitheExtractor] No low-confidence entries to verify.");
        return entries;
    }

    console.log(`[TitheExtractor] Verifying ${lowConfEntries.length} low-confidence entries...`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const imageParts = await fileToGenerativePart(imageFile);

    // Build verification prompt with row context
    const rowsToVerify = lowConfEntries.map(e => {
        // Find surrounding amounts for context
        const rowNo = e["No."] as number;
        const neighbors = entries
            .filter(n => Math.abs((n["No."] as number) - rowNo) <= 2 && n["No."] !== rowNo)
            .map(n => `Row ${n["No."]}: ${n["Transaction Amount"]}`);

        return `- Row #${rowNo}: "${e["Membership Number"]}" → Extracted: ${e["Transaction Amount"]}
      Context (nearby rows): ${neighbors.join(', ') || 'none'}`;
    }).join("\n");

    const verificationPrompt = `
    I previously extracted tithe amounts from this image for ${targetMonth} → ${targetWeek.replace("Week ", "")}.
    Some entries had low confidence. Please verify these specific rows:

${rowsToVerify}

    **ROW CONTEXT VALIDATION:**
    - If nearby rows have similar amounts, that's a pattern hint
    - Example: If rows 4, 5, 7 all have "50" but row 6 shows "5", it might be a misread

    For each row, verify:
    1. Is the extracted amount correct?
    2. If not, what is the correct amount?
    3. Does the amount break a visible pattern?

    Return JSON:
    {
        "verifications": [
            { "rowNo": 5, "originalAmount": 100, "verifiedAmount": 100, "isCorrect": true },
            { "rowNo": 12, "originalAmount": 5, "verifiedAmount": 50, "isCorrect": false, "correction": "Pattern suggests 50, not 5" }
        ]
    }
    `;

    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: verificationPrompt }, imageParts] }],
            generationConfig: {
                responseMimeType: "application/json",
            },
        });

        const verification = JSON.parse(result.response.text().trim());

        if (!verification.verifications || !Array.isArray(verification.verifications)) {
            console.warn("[TitheExtractor] Verification response missing verifications array");
            return entries;
        }

        const verificationMap = new Map(
            verification.verifications.map((v: { rowNo: number; verifiedAmount: number; isCorrect: boolean }) => [v.rowNo, v])
        );

        return entries.map(entry => {
            const v = verificationMap.get(entry["No."] as number) as { verifiedAmount: number; isCorrect: boolean; correction?: string } | undefined;
            if (v && !v.isCorrect) {
                console.log(`[TitheExtractor] Correcting row ${entry["No."]}: ${entry["Transaction Amount"]} → ${v.verifiedAmount} (${v.correction || 'verified'})`);
                return {
                    ...entry,
                    "Transaction Amount": v.verifiedAmount,
                    "Confidence": 0.85
                };
            }
            return entry;
        });
    } catch (error) {
        console.error("[TitheExtractor] Verification pass failed:", error);
        return entries;
    }
};
