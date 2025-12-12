/**
 * Smart Date Detection Utility
 * Extracts dates from image EXIF metadata and parses visible dates
 */

/**
 * Common date patterns found in tithe books
 */
const DATE_PATTERNS = [
    // DD-MMM-YYYY (e.g., 15-Dec-2024)
    /(\d{1,2})[\/\-]([A-Za-z]{3,9})[\/\-](\d{4})/,
    // DD/MM/YYYY or DD-MM-YYYY
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    // MMM DD, YYYY (e.g., Dec 15, 2024)
    /([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/,
    // YYYY-MM-DD (ISO format)
    /(\d{4})-(\d{2})-(\d{2})/,
    // Month YYYY (e.g., December 2024)
    /([A-Za-z]{3,9})\s+(\d{4})/,
    // Week patterns (e.g., "Week 3" or "3rd Week")
    /(?:week|wk)\s*(\d+)|(\d+)(?:st|nd|rd|th)?\s*week/i,
];

const MONTH_MAP: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
};

export interface DetectedDate {
    date?: Date;
    year?: number;
    month?: number;
    week?: number;
    raw?: string;
    source: 'exif' | 'text' | 'filename' | 'fallback';
    confidence: number;
}

/**
 * Extract date from image EXIF metadata
 */
export async function extractDateFromExif(file: File): Promise<DetectedDate | null> {
    return new Promise((resolve) => {
        // Use file's lastModified as fallback
        const lastModified = new Date(file.lastModified);

        // Try to extract EXIF data from the image
        const reader = new FileReader();
        reader.onload = (e) => {
            const view = new DataView(e.target?.result as ArrayBuffer);

            // Check for JPEG magic bytes
            if (view.getUint16(0) !== 0xFFD8) {
                // Not a JPEG, use lastModified
                resolve({
                    date: lastModified,
                    year: lastModified.getFullYear(),
                    month: lastModified.getMonth(),
                    source: 'fallback',
                    confidence: 0.3
                });
                return;
            }

            // Simple EXIF date extraction (DateTimeOriginal tag)
            const dataStr = new Uint8Array(e.target?.result as ArrayBuffer);
            const textDecoder = new TextDecoder('ascii');
            const str = textDecoder.decode(dataStr.slice(0, 65536)); // Check first 64KB

            // Look for EXIF date pattern: YYYY:MM:DD HH:MM:SS
            const exifDateMatch = str.match(/(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);

            if (exifDateMatch) {
                const [, year, month, day, hour, min, sec] = exifDateMatch;
                const date = new Date(
                    parseInt(year),
                    parseInt(month) - 1,
                    parseInt(day),
                    parseInt(hour),
                    parseInt(min),
                    parseInt(sec)
                );
                resolve({
                    date,
                    year: date.getFullYear(),
                    month: date.getMonth(),
                    raw: exifDateMatch[0],
                    source: 'exif',
                    confidence: 0.9
                });
                return;
            }

            // Fallback to lastModified
            resolve({
                date: lastModified,
                year: lastModified.getFullYear(),
                month: lastModified.getMonth(),
                source: 'fallback',
                confidence: 0.3
            });
        };

        reader.onerror = () => {
            resolve({
                date: lastModified,
                year: lastModified.getFullYear(),
                month: lastModified.getMonth(),
                source: 'fallback',
                confidence: 0.2
            });
        };

        reader.readAsArrayBuffer(file.slice(0, 65536)); // Only read first 64KB for EXIF
    });
}

/**
 * Extract date from filename
 */
export function extractDateFromFilename(filename: string): DetectedDate | null {
    const cleanName = filename.replace(/\.[^.]+$/, ''); // Remove extension

    // Try common date patterns in filename
    for (const pattern of DATE_PATTERNS) {
        const match = cleanName.match(pattern);
        if (match) {
            const detected = parseDateMatch(match, 'filename');
            if (detected) return detected;
        }
    }

    return null;
}

/**
 * Parse date from text content (e.g., OCR results)
 */
export function extractDateFromText(text: string): DetectedDate | null {
    // Try each pattern
    for (const pattern of DATE_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            const detected = parseDateMatch(match, 'text');
            if (detected) return detected;
        }
    }

    return null;
}

/**
 * Helper to parse a regex match into a DetectedDate
 */
function parseDateMatch(match: RegExpMatchArray, source: 'text' | 'filename'): DetectedDate | null {
    const fullMatch = match[0];

    // Check if it's a week pattern
    if (/week/i.test(fullMatch)) {
        const weekNum = parseInt(match[1] || match[2]);
        if (weekNum >= 1 && weekNum <= 5) {
            return {
                week: weekNum,
                raw: fullMatch,
                source,
                confidence: 0.7
            };
        }
    }

    // Try to parse as full date
    const parts = match.slice(1).filter(Boolean);

    // Month-Year pattern (e.g., "December 2024")
    if (parts.length === 2) {
        const monthStr = parts[0].toLowerCase();
        const year = parseInt(parts[1]);

        if (monthStr in MONTH_MAP && year > 2000 && year < 2100) {
            return {
                year,
                month: MONTH_MAP[monthStr],
                raw: fullMatch,
                source,
                confidence: 0.8
            };
        }
    }

    // Full date with day
    if (parts.length >= 3) {
        let day: number, month: number, year: number;

        // ISO format (YYYY-MM-DD)
        if (parseInt(parts[0]) > 1000) {
            year = parseInt(parts[0]);
            month = parseInt(parts[1]) - 1;
            day = parseInt(parts[2]);
        }
        // Text month (15-Dec-2024 or Dec 15, 2024)
        else if (isNaN(parseInt(parts[1]))) {
            const monthStr = parts[1].toLowerCase();
            if (monthStr in MONTH_MAP) {
                day = parseInt(parts[0]);
                month = MONTH_MAP[monthStr];
                year = parseInt(parts[2]);
            } else {
                return null;
            }
        }
        // Numeric (DD/MM/YYYY)
        else {
            day = parseInt(parts[0]);
            month = parseInt(parts[1]) - 1;
            year = parseInt(parts[2]);
        }

        if (year > 2000 && year < 2100 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
            const date = new Date(year, month, day);
            return {
                date,
                year,
                month,
                raw: fullMatch,
                source,
                confidence: 0.85
            };
        }
    }

    return null;
}

/**
 * Detect date from multiple sources (EXIF, filename, text)
 * Returns the most confident detection
 */
export async function detectSmartDate(
    file: File,
    ocrText?: string
): Promise<DetectedDate> {
    const detections: DetectedDate[] = [];

    // Try EXIF
    const exifDate = await extractDateFromExif(file);
    if (exifDate) detections.push(exifDate);

    // Try filename
    const filenameDate = extractDateFromFilename(file.name);
    if (filenameDate) detections.push(filenameDate);

    // Try OCR text if provided
    if (ocrText) {
        const textDate = extractDateFromText(ocrText);
        if (textDate) detections.push(textDate);
    }

    // Return highest confidence detection
    detections.sort((a, b) => b.confidence - a.confidence);

    return detections[0] || {
        date: new Date(),
        year: new Date().getFullYear(),
        month: new Date().getMonth(),
        source: 'fallback',
        confidence: 0.1
    };
}

/**
 * Format detected date for display
 */
export function formatDetectedDate(detected: DetectedDate): string {
    if (detected.date) {
        return detected.date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    if (detected.year && detected.month !== undefined) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[detected.month]} ${detected.year}`;
    }

    return 'Unknown date';
}
