import { GoogleGenerativeAI } from "@google/generative-ai";
import { TitheRecordB } from "../types";

// User requested Gemini 3 Pro.
const MODEL_NAME = "gemini-3-pro-image-preview";

export const processTitheImage = async (
    imageFile: File,
    apiKey: string
): Promise<TitheRecordB[]> => {
    if (!apiKey) throw new Error("API Key is missing");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const imageParts = await fileToGenerativePart(imageFile);

    const prompt = `
    You are an expert data entry clerk. Analyze this image of a church tithe book.
    Extract the rows into a JSON array.

    The image contains handwritten or printed records of tithe payments.
    Columns typically include: Number, Name of Member, and Amount.

    Please extract this data and format it as a JSON array of objects with the following structure:
    [
      {
        "No.": number,
        "Transaction Type": "Individual Tithe-[Income]",
        "Payment Source Type": "Registered Member",
        "Membership Number": "Name of Member",
        "Transaction Amount": number,
        "Narration/Description": "Tithe from Image Upload"
      }
    ]

    - "Membership Number": Put the extracted Name here. We will reconcile it later.
    - "Transaction Amount": Extract the numeric amount.
    - If a row is unclear, do your best to transcribe it.
    - Return ONLY the JSON array. Do not include markdown formatting or explanations.
  `;

    try {
        const result = await model.generateContent([prompt, imageParts]);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown code blocks if present
        const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();

        const parsedData = JSON.parse(jsonString);

        // Validate/Ensure structure
        return parsedData.map((item: any, index: number) => ({
            "No.": item["No."] || index + 1,
            "Transaction Type": "Individual Tithe-[Income]",
            "Payment Source Type": "Registered Member",
            "Membership Number": item["Membership Number"] || "Unknown",
            "Transaction Date ('DD-MMM-YYYY')": "", // To be filled by App
            "Currency": "GHS",
            "Exchange Rate": 1,
            "Payment Method": "Cash",
            "Transaction Amount": item["Transaction Amount"] || 0,
            "Narration/Description": item["Narration/Description"] || "Tithe from Image Upload"
        }));

    } catch (error) {
        console.error("Error processing image with Gemini:", error);
        throw new Error("Failed to process image. Please try again.");
    }
};

async function fileToGenerativePart(file: File) {
    return new Promise<{ inlineData: { data: string; mimeType: string } }>(
        (resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                // Remove data URL prefix (e.g. "data:image/jpeg;base64,")
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
