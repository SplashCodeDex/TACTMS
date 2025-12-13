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
 * OCR character substitutions for AMOUNTS (letter misreads → numbers)
 * These are typical errors when reading handwritten numerals.
 * Per WhyThisApp.md: l→1, o→0, s→5
 */
const OCR_AMOUNT_CHAR_MAP: Record<string, string> = {
    'l': '1', 'L': '1', 'I': '1', 'i': '1', '|': '1',
    'o': '0', 'O': '0', 'Q': '0',
    's': '5', 'S': '5',
    'z': '2', 'Z': '2',
    'b': '6', 'B': '8',
    'g': '9', 'G': '6',
    't': '7', 'T': '7',
    'e': '3', 'E': '3',
    'a': '4', 'A': '4',
};

/**
 * Cleans an OCR-extracted amount string by:
 * 1. Handling dashes "-" and empty cells as 0 (per WhyThisApp.md)
 * 2. Handling crossed-out amounts as 0 (per WhyThisApp.md)
 * 3. Converting common letter misreads to numbers (l→1, o→0, s→5, etc.)
 * 4. Removing non-numeric characters (except decimal point)
 * 5. Parsing to a valid number
 *
 * @param rawAmount - The raw OCR-extracted amount string or number
 * @returns The cleaned numeric amount, or 0 if unparseable
 *
 * @example
 * cleanOCRAmount("1oo") // Returns 100
 * cleanOCRAmount("5l") // Returns 51
 * cleanOCRAmount("-") // Returns 0 (dash means no payment)
 * cleanOCRAmount("XX") // Returns 0 (crossed out)
 */
export const cleanOCRAmount = (rawAmount: string | number | null | undefined): number => {
    // Handle null/undefined explicitly
    if (rawAmount === null || rawAmount === undefined) {
        return 0;
    }

    // If already a valid number, return it
    if (typeof rawAmount === 'number' && !isNaN(rawAmount)) {
        return rawAmount;
    }

    if (typeof rawAmount !== 'string') {
        return 0;
    }

    let cleaned = rawAmount.trim();

    // Per WhyThisApp.md line 86: Empty cells mean 0
    if (cleaned === '') {
        return 0;
    }

    // Per WhyThisApp.md line 86: Dashes "-", "–", "—" mean 0 (no payment)
    if (/^[-–—]+$/.test(cleaned)) {
        return 0;
    }

    // Per WhyThisApp.md line 87: Crossed-out amounts should be deemed 0
    // Handle X patterns, strikethrough markers, or similar indicators
    if (/^[xX]+$/.test(cleaned) || /^crossed$/i.test(cleaned) || /^n\/?a$/i.test(cleaned)) {
        return 0;
    }

    // Replace common OCR letter-to-number errors
    for (const [letter, number] of Object.entries(OCR_AMOUNT_CHAR_MAP)) {
        cleaned = cleaned.split(letter).join(number);
    }

    // Remove any remaining non-numeric characters except decimal point
    cleaned = cleaned.replace(/[^0-9.]/g, '');

    // Handle multiple decimal points (keep only first)
    const parts = cleaned.split('.');
    if (parts.length > 2) {
        cleaned = parts[0] + '.' + parts.slice(1).join('');
    }

    // Parse to number
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
};

/**
 * Cleans notebook-style amount notation where "w" represents "00" after the decimal point.
 * This handles fast handwriting where writers use "w" as shorthand for pesewas/cents "00".
 *
 * The "w" is a stylized handwritten "00" that represents the decimal portion.
 * Example: "10.w" means "10.00" (10 cedis, 00 pesewas) = 10
 *
 * @param rawAmount - The raw amount string from notebook (e.g., "10.w", "5w", "100.W")
 * @returns The cleaned numeric amount
 *
 * @example
 * cleanNotebookAmount("10.w") // Returns 10 (meaning GHS 10.00)
 * cleanNotebookAmount("5.w") // Returns 5 (meaning GHS 5.00)
 * cleanNotebookAmount("100.w") // Returns 100 (meaning GHS 100.00)
 * cleanNotebookAmount("25w") // Returns 25 (meaning GHS 25.00)
 * cleanNotebookAmount("20") // Returns 20 (no w, standard processing)
 */
export const cleanNotebookAmount = (rawAmount: string | number | null | undefined): number => {
    // Handle null/undefined
    if (rawAmount === null || rawAmount === undefined) {
        return 0;
    }

    // If already a number, return it
    if (typeof rawAmount === 'number' && !isNaN(rawAmount)) {
        return rawAmount;
    }

    if (typeof rawAmount !== 'string') {
        return 0;
    }

    let cleaned = rawAmount.trim();

    // Handle empty
    if (cleaned === '') {
        return 0;
    }

    // Check for ".w" or "w" suffix patterns (case insensitive)
    // Pattern: "10.w", "10.W", "5w", "5W", "100.w"
    // The "w" represents "00" after decimal - so "10.w" = "10.00" = 10
    const notebookPattern = /^(\d+)[.\s]*[wW]$/;
    const match = cleaned.match(notebookPattern);

    if (match) {
        // "w" = "00" after decimal point (e.g., "10.w" = "10.00" = 10)
        // Just return the number as-is since ".00" doesn't change the value
        const baseNumber = parseFloat(match[1]);
        return isNaN(baseNumber) ? 0 : baseNumber;
    }

    // Also handle ":w" pattern which might appear in some handwriting
    const colonPattern = /^(\d+)[:\s]*[wW]$/;
    const colonMatch = cleaned.match(colonPattern);

    if (colonMatch) {
        // Same logic: "w" = ".00", so "10:w" = "10.00" = 10
        const baseNumber = parseFloat(colonMatch[1]);
        return isNaN(baseNumber) ? 0 : baseNumber;
    }

    // No "w" pattern found, fall back to standard OCR cleaning
    return cleanOCRAmount(cleaned);
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
