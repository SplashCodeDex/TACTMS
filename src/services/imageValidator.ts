/**
 * Image Validator Service
 * Pre-validates tithe book images before expensive OCR processing
 */

export interface ImageValidationResult {
    isValid: boolean;
    confidence: number;
    errors: string[];
    warnings: string[];
    dimensions?: {
        width: number;
        height: number;
    };
    estimatedQuality: "low" | "medium" | "high";
}

// Minimum dimensions for readable text extraction
const MIN_WIDTH = 800;
const MIN_HEIGHT = 600;
const RECOMMENDED_WIDTH = 1920;
const RECOMMENDED_HEIGHT = 1080;

// Supported MIME types for image processing
const SUPPORTED_MIME_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
];

/**
 * Validates an image file before OCR processing
 * Checks dimensions, file type, and estimated quality
 */
export const validateTitheBookImage = async (
    file: File
): Promise<ImageValidationResult> => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let confidence = 1.0;
    let estimatedQuality: "low" | "medium" | "high" = "high";

    // Check file type
    if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
        errors.push(
            `Unsupported file type: ${file.type}. Please use JPEG, PNG, or WebP.`
        );
        confidence = 0;
    }

    // Check file size (warn if too small or too large)
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB < 0.1) {
        warnings.push(
            "Image file is very small (<100KB). Quality may be insufficient for accurate text extraction."
        );
        confidence *= 0.7;
        estimatedQuality = "low";
    } else if (fileSizeMB > 20) {
        warnings.push(
            "Image file is very large (>20MB). Processing may take longer."
        );
    }

    // Get image dimensions
    let dimensions: { width: number; height: number } | undefined;
    try {
        dimensions = await getImageDimensions(file);

        if (dimensions.width < MIN_WIDTH || dimensions.height < MIN_HEIGHT) {
            errors.push(
                `Image resolution too low (${dimensions.width}x${dimensions.height}). Minimum recommended: ${MIN_WIDTH}x${MIN_HEIGHT}px.`
            );
            confidence *= 0.5;
            estimatedQuality = "low";
        } else if (
            dimensions.width < RECOMMENDED_WIDTH ||
            dimensions.height < RECOMMENDED_HEIGHT
        ) {
            warnings.push(
                `Image resolution (${dimensions.width}x${dimensions.height}) is below recommended (${RECOMMENDED_WIDTH}x${RECOMMENDED_HEIGHT}). Some text may be harder to read.`
            );
            confidence *= 0.85;
            if (estimatedQuality === "high") estimatedQuality = "medium";
        }
    } catch {
        errors.push("Failed to read image dimensions. File may be corrupted.");
        confidence = 0;
    }

    return {
        isValid: errors.length === 0,
        confidence,
        errors,
        warnings,
        dimensions,
        estimatedQuality,
    };
};

/**
 * Get image dimensions from a File object
 */
const getImageDimensions = (
    file: File
): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load image"));
        };

        img.src = url;
    });
};

/**
 * Validates that the extracted data from OCR matches expected TitheBook structure
 */
export interface TitheBookValidationResult {
    isValidFormat: boolean;
    detectedYear: string | null;
    detectedPageNumber: number | null;
    rowCount: number;
    hasNameColumn: boolean;
    hasAmountData: boolean;
    confidenceScore: number;
}

export const validateExtractedTitheData = (
    extractedData: any[]
): TitheBookValidationResult => {
    const result: TitheBookValidationResult = {
        isValidFormat: false,
        detectedYear: null,
        detectedPageNumber: null,
        rowCount: extractedData?.length || 0,
        hasNameColumn: false,
        hasAmountData: false,
        confidenceScore: 0,
    };

    if (!Array.isArray(extractedData) || extractedData.length === 0) {
        return result;
    }

    // Check for expected fields
    let totalConfidence = 0;
    let hasAmount = false;

    extractedData.forEach((row) => {
        if (row.Name && typeof row.Name === "string" && row.Name.trim()) {
            result.hasNameColumn = true;
        }
        if (
            row.Amount !== undefined &&
            (typeof row.Amount === "number" || !isNaN(parseFloat(row.Amount)))
        ) {
            if (row.Amount > 0) hasAmount = true;
        }
        if (row.Confidence && typeof row.Confidence === "number") {
            totalConfidence += row.Confidence;
        }
    });

    result.hasAmountData = hasAmount;
    result.confidenceScore =
        extractedData.length > 0 ? totalConfidence / extractedData.length : 0;
    result.isValidFormat = result.hasNameColumn && result.rowCount > 0;

    return result;
};

/**
 * Title normalization aliases for fuzzy matching
 */
export const TITLE_ALIASES: Record<string, string[]> = {
    DEACONESS: ["DCNS", "DEAC", "DCN", "DEAS", "DEACONESS"],
    ELDER: ["ELD", "ELDR", "ELDER"],
    PASTOR: ["PST", "PS", "PASTOR", "PTR"],
    APOSTLE: ["APT", "APST", "APOSTLE"],
    OVERSEER: ["OVS", "OVSR", "OVERSEER"],
    DEACON: ["DCN", "DEAC", "DEACON"],
    EVANGELIST: ["EVG", "EVNG", "EVANGELIST"],
    REVEREND: ["REV", "REVD", "REVEREND"],
    SISTER: ["SIS", "SR", "SISTER"],
    BROTHER: ["BRO", "BR", "BROTHER"],
    MR: ["MR", "MR."],
    MRS: ["MRS", "MRS."],
    MISS: ["MISS", "MS", "MS."],
    MADAM: ["MADAM", "MDM"],
    MAAME: ["MAAME", "MAAME"],
};

/**
 * Normalize a title to its canonical form
 */
export const normalizeTitle = (title: string): string => {
    if (!title) return "";
    const upper = title.toUpperCase().trim().replace(/\.$/, "");

    for (const [canonical, aliases] of Object.entries(TITLE_ALIASES)) {
        if (aliases.includes(upper) || upper === canonical) {
            return canonical;
        }
    }

    return upper;
};

/**
 * Extract and normalize a name from potentially noisy OCR output
 */
export const cleanOCRName = (rawName: string): string => {
    if (!rawName) return "";

    return (
        rawName
            // Remove common OCR artifacts
            .replace(/[|\\\/\[\]{}]/g, "")
            // Normalize multiple spaces
            .replace(/\s+/g, " ")
            // Remove leading/trailing punctuation
            .replace(/^[.,;:\-_]+|[.,;:\-_]+$/g, "")
            .trim()
    );
};
