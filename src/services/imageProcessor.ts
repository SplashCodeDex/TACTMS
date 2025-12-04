import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { TitheRecordB } from "../types";
import { cleanOCRName } from "./imageValidator";

// Using Gemini 2.5 Pro (multimodal).
const MODEL_NAME = "gemini-2.5-pro";

// Confidence threshold for flagging entries that need review
export const LOW_CONFIDENCE_THRESHOLD = 0.7;

// Enhanced schema with validation metadata
const TITHE_EXTRACTION_SCHEMA: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        isValidTitheBook: {
            type: SchemaType.BOOLEAN,
            description: "True if the image matches the expected 'THE APOSTOLIC CHURCH GHANA, TITHES REGISTER' format with columns for NO, NAME, and monthly weeks."
        },
        detectedYear: {
            type: SchemaType.STRING,
            description: "The year visible in the header (e.g., '2025'). Return empty string if not visible."
        },
        pageNumber: {
            type: SchemaType.NUMBER,
            description: "The page number if visible at the bottom of the image. Return 0 if not visible."
        },
        entries: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    "No.": { type: SchemaType.NUMBER, description: "The sequential number from the book row." },
                    "Name": { type: SchemaType.STRING, description: "The full name of the tither as written in the NAME column." },
                    "Amount": { type: SchemaType.NUMBER, description: "The specific amount recorded in the target month/week column. Use 0 if the cell is blank or contains a dash." },
                    "Confidence": { type: SchemaType.NUMBER, description: "A score from 0.0 to 1.0 indicating confidence in the legibility and extraction of this row." },
                },
                required: ["No.", "Name", "Amount", "Confidence"]
            }
        }
    },
    required: ["isValidTitheBook", "entries"]
};

// Legacy schema for backwards compatibility
const TITHE_SCHEMA: Schema = {
    type: SchemaType.ARRAY,
    items: {
        type: SchemaType.OBJECT,
        properties: {
            "No.": { type: SchemaType.NUMBER, description: "The sequential number from the book row." },
            "Name": { type: SchemaType.STRING, description: "The full name of the tither as written." },
            "Amount": { type: SchemaType.NUMBER, description: "The specific amount recorded in the target month/week column. Use 0 if the cell is blank." },
            "Confidence": { type: SchemaType.NUMBER, description: "A score from 0.0 to 1.0 indicating confidence in the legibility and extraction of this row." },
        },
        required: ["No.", "Name", "Amount", "Confidence"]
    }
};

export interface TitheImageExtractionResult {
    isValidTitheBook: boolean;
    detectedYear: string | null;
    pageNumber: number | null;
    entries: TitheRecordB[];
    lowConfidenceCount: number;
}

interface RawExtraction {
    "No.": number;
    "Name": string;
    "Amount": number;
    "Confidence": number;
}

interface EnhancedRawExtraction {
    isValidTitheBook: boolean;
    detectedYear?: string;
    pageNumber?: number;
    entries: RawExtraction[];
}

export const processTitheImage = async (
    imageFile: File,
    apiKey: string,
    targetMonth?: string,
    targetWeek?: string,
    targetDateString?: string
): Promise<TitheRecordB[]> => {
    if (!apiKey) throw new Error("API Key is missing");

    // If we are doing focused extraction, we need all parameters.
    // If not (legacy/generic scan), we might skip this check, but the prompt relies on it.
    // For now, we assume focused extraction is the primary goal.
    if (!targetMonth || !targetWeek || !targetDateString) {
        // Fallback for generic scan if needed, or throw error.
        // Given the prompt structure, let's enforce it or provide defaults if missing.
        // But the user code threw an error, so we will stick to that for safety.
        if (targetMonth || targetWeek) { // Only throw if partially provided
            throw new Error("Month, Week, and Date are required for a focused extraction.");
        }
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const imageParts = await fileToGenerativePart(imageFile);

    const prompt = `
    Analyze the provided image of the 'THE APOSTOLIC CHURCH GHANA, TITHES REGISTER' for the year 2025.

    Extract data into a JSON array that strictly conforms to the provided schema.

    ${targetMonth && targetWeek ? `
    *** CRITICAL INSTRUCTION ***
    Focus ONLY on the column for: ${targetMonth.toUpperCase()} -> ${targetWeek.replace("Week ", "")}.

    1. Find the row for each member.
    2. Extract the "Name" from the name column.
    3. Extract the "Amount" value SPECIFICALLY from the target column.
    4. If the amount cell is completely empty or has a dash (-), use 0 for the amount.
    5. Ignore amounts from other columns.
    ` : `
    Extract the "Name" and "Amount" from the visible columns.
    `}

    6. Return ONLY the JSON array structure required by the schema.
  `;

    const maxRetries = 3;
    let attempt = 0;
    let result;

    while (attempt < maxRetries) {
        try {
            result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }, imageParts] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: TITHE_SCHEMA,
                },
            });
            break; // Success, exit loop
        } catch (error: any) {
            attempt++;
            console.warn(`Gemini API attempt ${attempt} failed:`, error);

            if (attempt >= maxRetries) {
                // Enhance error message for specific cases
                if (error.message?.includes("429")) {
                    throw new Error("Service is busy (Rate Limit Exceeded). Please try again in a minute.");
                }
                throw new Error(`Failed to process image after ${maxRetries} attempts. Please check your internet connection.`);
            }

            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, attempt - 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    if (!result) throw new Error("Unexpected error: No result from AI model.");

    try {
        const jsonString = result.response.text().trim();
        const rawExtractedData: RawExtraction[] = JSON.parse(jsonString);

        // 3. Map the raw extracted data to the final B.xlsx format (TitheRecordB)
        const finalData: TitheRecordB[] = rawExtractedData.map((item, index) => ({
            "No.": item["No."] || index + 1,
            "Transaction Type": "Individual Tithe-[Income]",
            "Payment Source Type": "Registered Member",
            "Membership Number": item["Name"], // Will be replaced by reconciliation
            "Transaction Date ('DD-MMM-YYYY')": targetDateString || new Date().toDateString(),
            "Currency": "GHS",
            "Exchange Rate": 1,
            "Payment Method": "Cash",
            "Transaction Amount": item["Amount"] || 0,
            "Narration/Description": `Tithe for ${targetDateString || "Unknown Date"}`,
            "Confidence": item["Confidence"] || 0.5
        }));

        return finalData;

    } catch (error) {
        console.error("Error parsing Gemini response:", error);
        throw new Error("Failed to parse AI response. The image might be too blurry or contain unexpected data.");
    }
};

async function fileToGenerativePart(file: File) {
    return new Promise<{ inlineData: { data: string; mimeType: string } }>(
        (resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                const base64Data = base64String.split(",")[1];
                resolve({
                    inlineData: {
                        data: base64Data,
                        mimeType: file.type,
                    },
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        }
    );
}

/**
 * Enhanced tithe image processor with layout validation and metadata extraction
 * Returns detailed validation info alongside extracted records
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

    // Enhanced prompt with layout awareness based on TitheBook.html structure
    const enhancedPrompt = `
    You are analyzing an image of 'THE APOSTOLIC CHURCH GHANA, TITHES REGISTER'.

    EXPECTED LAYOUT:
    - Header row: YEAR field at top
    - Column headers: NO | NAME | JANUARY (1st,2nd,3rd,4th,5th,TOTAL) | FEBRUARY... through DECEMBER
    - Each month has 5 weekly columns plus a TOTAL column
    - Footer may contain page number

    VALIDATION:
    1. First, verify this image matches the expected Tithe Register format.
    2. Look for the YEAR field in the header.
    3. Look for page number at the bottom.

    DATA EXTRACTION:
    Target column: ${targetMonth.toUpperCase()} -> ${targetWeek.replace("Week ", "")}

    For each row with a NAME:
    1. Extract the "No." (row number)
    2. Extract the "Name" exactly as written
    3. Extract ONLY the amount from the "${targetMonth.toUpperCase()}" "${targetWeek}" column
    4. Use 0 if the cell is empty, blank, or contains a dash (-)
    5. Rate your confidence (0.0-1.0) based on text legibility

    IMPORTANT: Only extract rows that have a Name. Skip empty rows.
    `;

    const maxRetries = 3;
    let attempt = 0;
    let result;

    while (attempt < maxRetries) {
        try {
            result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: enhancedPrompt }, imageParts] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: TITHE_EXTRACTION_SCHEMA,
                },
            });
            break;
        } catch (error: any) {
            attempt++;
            console.warn(`Gemini API attempt ${attempt} failed:`, error);

            if (attempt >= maxRetries) {
                if (error.message?.includes("429")) {
                    throw new Error("Service is busy (Rate Limit Exceeded). Please try again in a minute.");
                }
                throw new Error(`Failed to process image after ${maxRetries} attempts.`);
            }

            const delay = Math.pow(2, attempt - 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    if (!result) throw new Error("Unexpected error: No result from AI model.");

    try {
        const jsonString = result.response.text().trim();
        const rawResult: EnhancedRawExtraction = JSON.parse(jsonString);

        // Count low confidence entries
        let lowConfidenceCount = 0;

        // Map entries to TitheRecordB format
        const entries: TitheRecordB[] = (rawResult.entries || []).map((item, index) => {
            if (item.Confidence < LOW_CONFIDENCE_THRESHOLD) {
                lowConfidenceCount++;
            }

            // Clean the OCR name
            const cleanedName = cleanOCRName(item.Name);

            return {
                "No.": item["No."] || index + 1,
                "Transaction Type": "Individual Tithe-[Income]",
                "Payment Source Type": "Registered Member",
                "Membership Number": cleanedName, // Will be replaced by reconciliation
                "Transaction Date ('DD-MMM-YYYY')": targetDateString,
                "Currency": "GHS",
                "Exchange Rate": 1,
                "Payment Method": "Cash",
                "Transaction Amount": item.Amount || 0,
                "Narration/Description": `Tithe for ${targetDateString}`,
                "Confidence": item.Confidence || 0.5
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
