import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { TitheRecordB } from "../types";
import { cleanOCRName } from "./imageValidator";

// UPGRADE: Using Gemini 2.5 Pro for "Retina-level" perception
const MODEL_NAME = "gemini-2.5-pro";

// Confidence threshold for flagging entries that need review
export const LOW_CONFIDENCE_THRESHOLD = 0.8; // Increased threshold for higher quality

// Enhanced schema with validation metadata
const TITHE_BOOK_HTML_TEMPLATE = `
<table class="tg"><thead>
<tr><th class="c">NO</th><th class="c">NAME</th><th class="c" colspan="6">JANUARY </th><th class="c" colspan="6">FEBRUARY </th>
<th class="c" colspan="6">MARCH </th><th class="c" colspan="6">APRIL </th><th class="c" colspan="6">MAY </th><th class="c" colspan="6">JUNE </th>...</tr>
</thead>
<tbody>
<tr><td class="c"></td><td class="c"></td><td class="c" colspan="6">WEEK</td>...</tr>
<tr><td class="c"></td><td class="c"></td><td class="c">1st</td><td class="c">2nd</td><td class="c">3rd</td><td class="c">4th</td><td class="c">5th</td><td class="c">TOTAL</td>...</tr>
</tbody></table>
`;

const TITHE_EXTRACTION_SCHEMA: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        isValidTitheBook: {
            type: SchemaType.BOOLEAN,
            description: "True if the image matches the expected 'THE APOSTOLIC CHURCH GHANA, TITHES REGISTER' format."
        },
        detectedYear: {
            type: SchemaType.STRING,
            description: "The year visible in the header (e.g., '2025')."
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
                    "Confidence": { type: SchemaType.NUMBER, description: "Confidence score (0.0-1.0)." },
                },
                required: ["No.", "Name", "Amount", "Confidence"]
            }
        }
    },
    required: ["isValidTitheBook", "entries"]
};

export interface TitheImageExtractionResult {
    isValidTitheBook: boolean;
    detectedYear: string | null;
    pageNumber: number | null;
    entries: TitheRecordB[];
    lowConfidenceCount: number;
}

interface EnhancedRawExtraction {
    isValidTitheBook: boolean;
    detectedYear?: string;
    pageNumber?: number;
    entries: Array<{
        "No.": number;
        "Name": string;
        "Amount": number;
        "Confidence": number;
    }>;
}

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
    The physical book in the image corresponds EXACTLY to this HTML structure. Use this as your map to locate columns:
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
    3. **Handwriting Expert Mode**:
       - You are reading financial records.
       - If a character in the Amount column looks like 'S', it is '5'.
       - If it looks like 'O', it is '0'.
       - If it looks like 'l', it is '1'.
       - dashes (-) or empty spaces mean 0.
    4. **Extract Rows**:
       - **No.**: Read the printed row number.
       - **Name**: Read the handwritten name. Fix obvious spelling errors in common Ghanaian names (e.g., "Kwame", "Adjei", "Mensah").
       - **Amount**: Extract the value strictly from the ${targetWeek} column.

    OUTPUT:
    Return a JSON object matching the schema.
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
        } catch (error) {
            attempt++;
            console.warn(`Gemini API attempt ${attempt} failed:`, error);

            if (attempt >= maxRetries) {
                if (error instanceof Error && error.message.includes("429")) {
                    throw new Error("Service is busy (Rate Limit Exceeded). Please try again in a minute.");
                }
                throw new Error(`Failed to process image after ${maxRetries} attempts.`);
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
