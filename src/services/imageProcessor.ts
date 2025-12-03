import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { TitheRecordB } from "../types";

// Using Gemini 2.5 Pro (multimodal).
const MODEL_NAME = "gemini-2.5-pro";

// 1. Define the schema the model MUST follow.
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

interface RawExtraction {
    "No.": number;
    "Name": string;
    "Amount": number;
    "Confidence": number;
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
