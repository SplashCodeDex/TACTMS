/**
 * Core utilities for image processing
 * Extracted from imageProcessor.ts
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Gemini model for image processing */
export const MODEL_NAME = "gemini-2.5-flash";

/** Confidence threshold for flagging entries that need review */
export const LOW_CONFIDENCE_THRESHOLD = 0.8;

// ============================================================================
// FILE UTILITIES
// ============================================================================

/**
 * Convert a File object to Gemini-compatible generative part
 * Extracts base64 data for inline image submission
 */
export async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
    return new Promise((resolve, reject) => {
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
    });
}

// ============================================================================
// API CLIENT FACTORY
// ============================================================================

/**
 * Create a configured Gemini model instance
 */
export function createGeminiModel(apiKey: string) {
    if (!apiKey) throw new Error("API Key is missing");
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: MODEL_NAME });
}
