/**
 * Tithe Image Extraction
 * Processes tithe book images to extract tithe records using Gemini AI
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { TitheRecordB } from "../../types";
import { cleanOCRName } from "../imageValidator";
import { MODEL_NAME, fileToGenerativePart } from "./core";
import { TITHE_EXTRACTION_SCHEMA } from "./schemas";
import { TITHE_BOOK_HTML_TEMPLATE } from "./templates";
import { TitheImageExtractionResult, EnhancedRawExtraction } from "./types";

/**
 * Enhanced tithe image processor using Gemini 2.5 Pro
 * Replaces legacy OCR with multimodal reasoning.
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

    // Advanced Prompting for Gemini 2.5 Pro
    const enhancedPrompt = `
    You are an expert Data Entry Specialist for The Apostolic Church Ghana.
    Your task is to digitize a page from the "TITHES REGISTER" book.

    CONTEXT - THE BLUEPRINT:
    The structure of the physical book in the image corresponds EXACTLY to this HTML structure. Use this as your map to locate columns, rows and cells:
\`\`\`html
    ${TITHE_BOOK_HTML_TEMPLATE}
    \`\`\`

    TARGET DATA:
    - Month: ${targetMonth.toUpperCase()}
    - Column: ${targetWeek.replace("Week ", "")} (e.g., "1st", "2nd", etc.)

    INSTRUCTIONS:
    1. **Map the Grid**: Overlay the HTML blueprint onto the image. Identify the "JANUARY", "FEBRUARY", etc. headers.
    2. **Locate the Target**: Find the specific vertical column for ${targetMonth} -> ${targetWeek}.
       - Note: The "TOTAL" column is always after the "5th" week. Do not confuse them.
    3. **Read the Rows**: For each row with a visible entry in the target column:
       - Read the "NO." column (leftmost).
       - Read the "NAME" column.
       - Read the specific amount from the ${targetWeek} column under ${targetMonth}.
    4. **Output**: Return a JSON object with entries found.

    HANDLING HANDWRITING:
    - Names are often handwritten. Use context (common Ghanaian names) to interpret.
    - Amounts are usually numeric. Empty cells, dashes, or illegible entries should be 0.
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

        // Count low confidence entries
        let lowConfidenceCount = 0;

        // Map entries to TitheRecordB format
        const entries: TitheRecordB[] = (rawResult.entries || []).map((item, index) => {
            // Clean the OCR name (basic trimming, though AI handles most)
            const cleanedName = cleanOCRName(item.Name);

            return {
                "No.": item["No."] || index + 1,
                "Transaction Type": "Individual Tithe-[Income]",
                "Payment Source Type": "Registered Member",
                "Membership Number": cleanedName, // Placeholder for reconciliation
                "Transaction Date ('DD-MMM-YYYY')": targetDateString,
                "Currency": "GHS",
                "Exchange Rate": 1,
                "Payment Method": "Cash",
                "Transaction Amount": item.Amount || 0,
                "Narration/Description": `Tithe for ${targetDateString}`,
                "Confidence": 0.5 // Default confidence - matching was already removed per user feedback
            };
        });

        return {
            isValidTitheBook: rawResult.isValidTitheBook ?? true,
            detectedYear: rawResult.detectedYear || null,
            pageNumber: rawResult.pageNumber || null,
            entries,
            lowConfidenceCount
        };

    } catch (error) {
        console.error("Error parsing Gemini response:", error);
        throw new Error("Failed to parse AI response. The image might be too blurry or contain unexpected data.");
    }
};
