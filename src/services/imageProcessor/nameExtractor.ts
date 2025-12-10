/**
 * Name Extraction from Tithe Book Images
 * Extracts names from tithe book NAME column and matches them to member database
 * Uses Hungarian algorithm for optimal 1-to-1 matching (no duplicates)
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MemberRecordA } from "../../types";
import { cleanOCRName } from "../imageValidator";
import { MODEL_NAME, fileToGenerativePart } from "./core";
import { NAME_EXTRACTION_SCHEMA } from "./schemas";
import { findOptimalMatches, ExtractedNameInput } from "./matching";
import { NameExtractionResult, NameMatchResult } from "./types";

/**
 * Extract names from tithe book NAME column image and match to database
 * Uses Hungarian algorithm for globally optimal 1-to-1 matching
 */
export const extractNamesFromTitheBook = async (
    imageFile: File,
    apiKey: string,
    memberDatabase: MemberRecordA[],
    memberOrderMap?: Map<string, number>, // Optional: for positional hints
    aliasMap?: Map<string, string>        // Optional: learned name mappings
): Promise<NameExtractionResult> => {
    if (!apiKey) throw new Error("API Key is missing");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const imageParts = await fileToGenerativePart(imageFile);

    const prompt = `
    You are an expert at reading handwritten documents from The Apostolic Church Ghana.

    Extract all names from the NAME column of this tithe book page.

    INSTRUCTIONS:
    1. Read the "NO." column to get the row number
    2. Read the "NAME" column to get each person's handwritten name
    3. Return ALL names you can read, in order from top to bottom
    4. Clean up obvious OCR errors but preserve the name structure
    5. Ghanaian names often have patterns: Surname, First Name, Other Names

    Return the data as a JSON array of objects with "No." and "Name" fields.
    `;

    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }, imageParts] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: NAME_EXTRACTION_SCHEMA,
            },
        });

        const jsonString = result.response.text().trim();
        const parsed: { names: Array<{ "No.": number; "Name": string }> } = JSON.parse(jsonString);

        // Prepare extracted names for optimal matching
        const extractedNames: ExtractedNameInput[] = parsed.names.map((item, index) => ({
            name: cleanOCRName(item.Name),
            position: item["No."] || index + 1
        }));

        // Use Hungarian algorithm for globally optimal 1-to-1 matching
        // This prevents the same member from being matched to multiple extracted names
        const optimalResults = findOptimalMatches(
            extractedNames,
            memberDatabase,
            memberOrderMap,
            aliasMap
        );

        // Convert to NameMatchResult format
        const matches: NameMatchResult[] = optimalResults.map(result => ({
            extractedName: result.extractedName,
            matchedMember: result.matchedMember,
            confidence: result.confidence,
            position: result.position,
            alternatives: result.alternatives
        }));

        // Sort by position
        matches.sort((a, b) => a.position - b.position);

        return {
            matches,
            totalExtracted: matches.length,
            successfulMatches: matches.filter(m => m.matchedMember !== null).length
        };
    } catch (error) {
        console.error("Error extracting names from image:", error);
        throw new Error("Failed to extract names from image. Please ensure the image is clear and contains the NAME column.");
    }
};
