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
import { TitheRecordB, TransactionLogEntry, MemberRecordA } from "../../types";
import { cleanOCRName } from "../imageValidator";
import { cleanOCRAmount } from "../../utils/stringUtils";
import { predictEnsemble } from "../ensembleOCR";
import { buildMemberHistory } from "../amountValidator";
import {
    MODEL_NAME,
    fileToGenerativePart,
    inferMemberRangeFromPage,
    getWeekColumnOffset,
    MEMBERS_PER_SET,
    checkGeminiRateLimit,
    recordGeminiCall
} from "./core";
import { findOptimalMatches, ExtractedNameInput, OptimalMatchResult } from "./matching";
import { TITHE_EXTRACTION_SCHEMA } from "./schemas";
import { TITHE_BOOK_HTML_TEMPLATE } from "./templates";
import { TitheImageExtractionResult, EnhancedRawExtraction, EnhancedRawEntry } from "./types";
import { detectNotebookFormat } from "./notebookDetector";
import { processNotebookImage } from "./notebookExtractor";

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

/**
 * Apply neighbor context to detect patterns
 * If 60%+ of nearby rows have similar amounts, that's a pattern hint
 *
 * @param entries - All extracted entries
 * @param currentIndex - Index of the entry to analyze
 * @param windowSize - Number of neighbors on each side to check (default: 3)
 * @returns Similarity ratio (0-1) indicating pattern strength
 *
 * @example
 * // After extraction, boost confidence for entries that match neighbor patterns
 * const patternStrength = applyNeighborContext(entries, 5);
 * if (patternStrength > 0.6) confidence += 0.1;
 */
export const applyNeighborContext = (
    entries: TitheRecordB[],
    currentIndex: number,
    windowSize: number = 3
): number => {
    const currentAmount = entries[currentIndex]["Transaction Amount"] as number;

    // No context boost for zero amounts
    if (currentAmount === 0) return 0;

    // Get neighbors (excluding self)
    const startIdx = Math.max(0, currentIndex - windowSize);
    const endIdx = Math.min(entries.length, currentIndex + windowSize + 1);

    const neighbors = [];
    for (let i = startIdx; i < endIdx; i++) {
        if (i !== currentIndex) {
            const na = entries[i]["Transaction Amount"] as number;
            if (na > 0) neighbors.push(na);
        }
    }

    if (neighbors.length === 0) return 0;

    // Count neighbors with similar amounts (within 10%)
    const similar = neighbors.filter(na =>
        Math.abs(na - currentAmount) / Math.max(na, currentAmount) < 0.1
    );

    return similar.length / neighbors.length;
};

// ============================================================================
// MAIN EXTRACTION
// ============================================================================

/**
 * Processing mode options for tithe image extraction
 * - 'auto': Auto-detect notebook vs tithe book (default)
 * - 'tithe_book': Force tithe book processing
 * - 'notebook': Force notebook processing
 */
export type ProcessingMode = 'auto' | 'tithe_book' | 'notebook';

/**
 * Enhanced tithe image processor using gemini-2.5-flash
 * With advanced zone detection, SET inference, and multi-factor confidence
 *
 * Now with auto-detection for notebook format!
 *
 * @param transactionLogs - Optional transaction logs for member history anomaly detection
 * @param forceMode - Optional mode override: 'auto' (default), 'tithe_book', or 'notebook'
 */
export const processTitheImageWithValidation = async (
    imageFile: File,
    apiKey: string,
    targetMonth: string,
    targetWeek: string,
    targetDateString: string,
    transactionLogs?: TransactionLogEntry[],
    forceMode: ProcessingMode = 'auto',
    memberDatabase?: MemberRecordA[],
    aliasMap?: Map<string, string>,
    memberOrderMap?: Map<string, number>
): Promise<TitheImageExtractionResult> => {
    if (!apiKey) throw new Error("API Key is missing");
    if (!targetMonth || !targetWeek || !targetDateString) {
        throw new Error("Month, Week, and Date are required for extraction.");
    }

    // ============================================================
    // NOTEBOOK AUTO-DETECTION (unless overridden)
    // ============================================================
    if (forceMode === 'notebook') {
        // Force notebook processing
        console.log('[TitheExtractor] Forced notebook mode');
        const notebookResult = await processNotebookImage(imageFile, apiKey, targetDateString, memberDatabase, aliasMap, memberOrderMap);
        return {
            isValidTitheBook: false,
            isNotebookFormat: true,
            detectedYear: null,
            pageNumber: null,
            entries: notebookResult.entries,
            lowConfidenceCount: notebookResult.lowConfidenceCount,
            notebookMetadata: {
                detectedDate: notebookResult.detectedDate,
                attendance: notebookResult.attendance,
            },
        };
    }

    if (forceMode === 'auto') {
        // Auto-detect notebook format
        const detection = await detectNotebookFormat(imageFile, apiKey);

        if (detection.isNotebook && detection.confidence >= 0.7) {
            console.log(`[TitheExtractor] Notebook detected (confidence: ${(detection.confidence * 100).toFixed(0)}%)`);
            console.log(`[TitheExtractor] Routing to notebook extractor...`);

            const notebookResult = await processNotebookImage(imageFile, apiKey, targetDateString, memberDatabase, aliasMap, memberOrderMap);
            return {
                isValidTitheBook: false,
                isNotebookFormat: true,
                detectedYear: null,
                pageNumber: null,
                entries: notebookResult.entries,
                lowConfidenceCount: notebookResult.lowConfidenceCount,
                notebookMetadata: {
                    detectedDate: notebookResult.detectedDate || detection.detectedDate,
                    attendance: notebookResult.attendance || detection.extractedAttendance,
                },
            };
        } else if (detection.isNotebook) {
            console.log(`[TitheExtractor] Notebook detected but low confidence (${(detection.confidence * 100).toFixed(0)}%), proceeding with tithe book processing`);
        }
    }

    // ============================================================
    // STANDARD TITHE BOOK PROCESSING
    // ============================================================

    // Check rate limit before making API call
    checkGeminiRateLimit();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const imageParts = await fileToGenerativePart(imageFile);

    // Record API call for rate limiting
    recordGeminiCall();

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
    - Letter "B" → "8"
    - Letter "Z" → "2"
    - Letter "w" → "00"
    - Crossed-out/strikethrough amounts → **0**
    - RED INK amounts in week columns → Flag as suspicious (might be reading TOTAL column by mistake)

    ---
    ## GHANAIAN NUMERAL HANDWRITING PATTERNS (CRITICAL!)

    Ghanaian handwriting has distinct characteristics. Look for these patterns:

    ### Common Digit Shapes
    - **0**: Often written as a tall loop, may look like "O" or "o"
    - **1**: Elongated vertical stroke, sometimes with serif, may look like "l" or "I"
    - **2**: May have exaggerated loop at bottom, can look like "Z"
    - **5**: Long curved top stroke, may look like "S"
    - **6**: Closed or open loop, distinguish from 0 by the tail
    - **8**: Two stacked circles, may look like "B"

    ### Common Amount Patterns (MOST LIKELY VALUES)
    - **Round numbers**: 5, 10, 20, 50, 100, 200, 500 (most common)
    - **Multiples of 5/10**: 15, 25, 30, 40, 60, 80, 150, 250
    - **Unlikely amounts**: 37, 83, 94 (rare - likely OCR error if seen)
    - **If amount doesn't end in 0 or 5, double-check!**

    ### Ink Bleed on Cheap Paper
    - Digits may appear thicker than written
    - Adjacent digits may connect
    - "00" may appear as a single blob → still means "00"

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

        // ============================================================
        // OPTIMAL NAME MATCHING (Standard Tithe Book)
        // ============================================================
        const optimalResultMap = new Map<number, OptimalMatchResult>();

        if (memberDatabase && memberDatabase.length > 0 && rawResult.entries && rawResult.entries.length > 0) {
            try {
                // Prepare input for optimal matching
                const extractedNamesInput: ExtractedNameInput[] = rawResult.entries.map((item, index) => ({
                    name: cleanOCRName(item.Name),
                    position: item["No."] || index + 1
                }));

                // Run Hungarian algorithm
                const optimalMatches = findOptimalMatches(
                    extractedNamesInput,
                    memberDatabase,
                    memberOrderMap,
                    aliasMap
                );

                // Create lookup mapByKey: index -> result
                // Note: findOptimalMatches preserves input order, so optimalMatches[i] corresponds to extractedNamesInput[i]
                optimalMatches.forEach((match, i) => {
                    optimalResultMap.set(i, match);
                });

                console.log(`[TitheExtractor] Optimal matching complete. Found ${optimalMatches.filter(m => m.matchedMember).length} matches.`);
            } catch (err) {
                console.warn("[TitheExtractor] Optimal matching failed, falling back to basic extraction:", err);
            }
        }

        // Map entries to TitheRecordB format with adaptive confidence
        // Uses async for ensemble OCR integration
        const entries: TitheRecordB[] = await Promise.all(
            (rawResult.entries || []).map(async (item: EnhancedRawEntry, index) => {
                const cleanedName = cleanOCRName(item.Name);
                let finalAmount = cleanOCRAmount(item.Amount);
                let ensembleApplied = false;

                // ============================================================
                // ENSEMBLE OCR INTEGRATION
                // If raw text contains letters (OCR artifacts), try learned patterns
                // ============================================================
                const rawText = item.rawAmountText;
                if (rawText && /[OoIilLsS]/.test(rawText) && finalAmount !== 0) {
                    try {
                        const ensemblePrediction = await predictEnsemble(rawText);
                        if (ensemblePrediction && ensemblePrediction.confidence >= 0.65) {
                            // Ensemble has a high-confidence correction
                            console.log(
                                `[TitheExtractor] Row ${item["No."]}: Ensemble correction "${rawText}" → ${ensemblePrediction.suggestedAmount} ` +
                                `(conf: ${(ensemblePrediction.confidence * 100).toFixed(0)}%, method: ${ensemblePrediction.method})`
                            );
                            finalAmount = ensemblePrediction.suggestedAmount;
                            ensembleApplied = true;
                        }
                    } catch {
                        // Ensemble not available, use standard OCR cleaning
                    }
                }

                // Calculate adaptive confidence with all factors
                let confidence = calculateAmountConfidence(
                    finalAmount,
                    item.legibility,
                    rawText,
                    item.inkColor,
                    item.cellCondition,
                    item["No."]
                );

                // Boost confidence if ensemble correction was applied
                if (ensembleApplied) {
                    confidence = Math.min(0.95, confidence + 0.1);
                }

                // Apply Optimal Match Results
                const optimalMatch = optimalResultMap.get(index);
                let memberId = cleanedName;
                let memberDetails: MemberRecordA | undefined;

                if (optimalMatch && optimalMatch.matchedMember) {
                    const m = optimalMatch.matchedMember;
                    // Format: Surname Firstname (ID)
                    memberId = `${m.Surname} ${m["First Name"]} (${m["Membership Number"] || m["Old Membership Number"]})`;
                    memberDetails = m;

                    // Boost confidence significantly if we have a strong semantic match
                    // This accounts for "Confidence" in the overall record (Name + Amount validity)
                    if (optimalMatch.confidence > 0.8) {
                        confidence = Math.max(confidence, 0.85);
                    }
                }

                if (confidence < 0.6) {
                    lowConfidenceCount++;
                }

                // Warn if red ink detected in week column
                if (item.inkColor === 'red' && finalAmount > 0) {
                    console.warn(`[TitheExtractor] Row ${item["No."]}: Red ink detected (${finalAmount}) - might be TOTAL column!`);
                }

                return {
                    "No.": item["No."] || index + 1,
                    "Transaction Type": "Individual Tithe-[Income]",
                    "Payment Source Type": "Registered Member",
                    "Membership Number": memberId,
                    "Transaction Date ('DD-MMM-YYYY')": targetDateString,
                    "Currency": "GHS",
                    "Exchange Rate": 1,
                    "Payment Method": "Cash",
                    "Transaction Amount": finalAmount,
                    "Narration/Description": `Tithe for ${targetDateString}`,
                    "Confidence": confidence,
                    memberDetails: memberDetails
                };
            })
        );

        // ============================================================
        // POST-EXTRACTION: Apply neighbor context to boost confidence
        // ============================================================
        for (let i = 0; i < entries.length; i++) {
            const patternStrength = applyNeighborContext(entries, i);
            if (patternStrength >= 0.6) {
                // 60%+ nearby rows have similar amounts - boost confidence
                const currentConf = entries[i].Confidence ?? 0;
                entries[i].Confidence = Math.min(0.95, currentConf + (patternStrength * 0.08));
            } else if (patternStrength === 0 && entries[i]["Transaction Amount"] !== 0) {
                // This entry breaks a pattern - slightly reduce confidence
                const currentConf = entries[i].Confidence ?? 0;
                if (currentConf > 0.7) {
                    entries[i].Confidence = currentConf - 0.05;
                }
            }
        }

        // Build SET info if page number is available
        const setInfo = rawResult.pageNumber
            ? inferMemberRangeFromPage(rawResult.pageNumber)
            : undefined;

        // ============================================================
        // ANOMALY DETECTION: Flag entries that deviate from member history
        // ============================================================
        const anomalyWarnings: Array<{
            rowNo: number;
            memberName: string;
            extractedAmount: number;
            expectedAmount: number;
            reason: string;
        }> = [];

        if (transactionLogs && transactionLogs.length > 0) {
            for (const entry of entries) {
                const memberId = entry["Membership Number"];
                const rawAmount = entry["Transaction Amount"];
                const amount = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount)) || 0;

                // Skip zero amounts (valid for "didn't tithe this week")
                if (amount === 0) continue;

                // Build history for this member
                const history = buildMemberHistory(memberId, transactionLogs);

                if (history && history.occurrences >= 3) {
                    const { averageAmount, standardDeviation } = history;

                    // Statistical anomaly detection: flag amounts >2σ from average
                    if (standardDeviation > 0) {
                        const zScore = Math.abs(amount - averageAmount) / standardDeviation;

                        if (zScore > 2) {
                            const direction = amount > averageAmount ? 'higher' : 'lower';
                            anomalyWarnings.push({
                                rowNo: Number(entry["No."]),
                                memberName: memberId.split("(")[0].trim(),
                                extractedAmount: amount,
                                expectedAmount: Math.round(averageAmount),
                                reason: `Amount is ${zScore.toFixed(1)}σ ${direction} than average (GHS ${Math.round(averageAmount)})`
                            });
                            console.warn(
                                `[TitheExtractor] Anomaly: Row ${entry["No."]} - ${memberId.split("(")[0].trim()} ` +
                                `paid GHS ${amount} but typically pays GHS ${Math.round(averageAmount)}`
                            );
                        }
                    }
                }
            }
        }

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
            } : undefined,
            anomalyWarnings: anomalyWarnings.length > 0 ? anomalyWarnings : undefined
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
