/**
 * Calculates the Levenshtein distance between two strings.
 * This is used for fuzzy matching names.
 */
export const levenshteinDistance = (a: string, b: string): number => {
    const matrix = [];

    // Increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // Increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
};

/**
 * Calculates a similarity score between 0 and 1.
 * 1 means exact match, 0 means no similarity.
 */
export const getSimilarity = (a: string, b: string): number => {
    const maxLength = Math.max(a.length, b.length);
    if (maxLength === 0) return 1.0;
    const distance = levenshteinDistance(a, b);
    return (maxLength - distance) / maxLength;
};

/**
 * Common OCR character substitutions (misread -> intended)
 * These are typical errors from handwriting recognition
 */
const OCR_CHAR_MAP: Record<string, string> = {
    '0': 'O', '1': 'I', '5': 'S', '8': 'B',
    '@': 'A', '$': 'S', '|': 'I', '!': 'I',
    '3': 'E', '4': 'A', '6': 'G', '7': 'T',
};

/**
 * Normalizes text for OCR comparison by:
 * 1. Converting to uppercase
 * 2. Replacing common OCR misreadings (0->O, 5->S, etc.)
 * 3. Removing non-alphabetic characters
 * 4. Collapsing multiple spaces
 */
export const normalizeOCRText = (text: string): string => {
    if (!text) return '';
    let normalized = text.toUpperCase();

    // Replace common OCR character substitutions
    for (const [ocr, intended] of Object.entries(OCR_CHAR_MAP)) {
        normalized = normalized.replace(new RegExp(`\\${ocr}`, 'g'), intended);
    }

    // Remove non-alphabetic except spaces
    normalized = normalized.replace(/[^A-Z\s]/g, '');

    // Collapse multiple spaces and trim
    return normalized.replace(/\s+/g, ' ').trim();
};

/**
 * Confidence tiers for OCR matching
 */
export const OCR_CONFIDENCE_TIERS = {
    HIGH: 0.85,      // Auto-match, high confidence
    MEDIUM: 0.65,    // Suggested match, needs review
    LOW: 0.65,       // Below this = no match
} as const;

/**
 * Calculates similarity between two strings with OCR-aware preprocessing.
 * Applies normalization to handle common OCR errors before comparison.
 * @returns Object with similarity score and normalized strings used
 */
export const getOCRAwareSimilarity = (rawOCR: string, masterName: string): {
    score: number;
    normalizedOCR: string;
    normalizedMaster: string;
} => {
    const normalizedOCR = normalizeOCRText(rawOCR);
    const normalizedMaster = normalizeOCRText(masterName);

    if (!normalizedOCR || !normalizedMaster) {
        return { score: 0, normalizedOCR, normalizedMaster };
    }

    const score = getSimilarity(normalizedOCR, normalizedMaster);
    return { score, normalizedOCR, normalizedMaster };
};

/**
 * Token-based similarity matching.
 * Compares individual words/tokens, useful when word order differs.
 * @returns Similarity score based on matching tokens
 */
export const getTokenSimilarity = (str1: string, str2: string): number => {
    const tokens1 = normalizeOCRText(str1).split(' ').filter(t => t.length > 1);
    const tokens2 = normalizeOCRText(str2).split(' ').filter(t => t.length > 1);

    if (tokens1.length === 0 || tokens2.length === 0) return 0;

    let matchedTokens = 0;
    const usedTokens = new Set<number>();

    for (const t1 of tokens1) {
        let bestMatch = 0;
        let bestIdx = -1;

        for (let i = 0; i < tokens2.length; i++) {
            if (usedTokens.has(i)) continue;
            const sim = getSimilarity(t1, tokens2[i]);
            if (sim > bestMatch) {
                bestMatch = sim;
                bestIdx = i;
            }
        }

        if (bestMatch >= 0.7 && bestIdx !== -1) {
            matchedTokens += bestMatch;
            usedTokens.add(bestIdx);
        }
    }

    const maxTokens = Math.max(tokens1.length, tokens2.length);
    return matchedTokens / maxTokens;
};
