/**
 * Handwriting Learning Service
 * Stores and retrieves OCR corrections to improve future accuracy
 * Uses IndexedDB for persistent storage
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database Schema
interface HandwritingDB extends DBSchema {
    corrections: {
        key: string;
        value: HandwritingCorrection;
        indexes: {
            'by-original': string;
            'by-assembly': string;
            'by-timestamp': number;
        };
    };
}

export interface HandwritingCorrection {
    id: string;
    originalText: string;      // What OCR extracted (lowercase for matching)
    correctedText: string;     // What user corrected to
    displayOriginal: string;   // Original case preserved
    displayCorrected: string;  // Corrected case preserved
    assemblyName: string;
    timestamp: number;
    usageCount: number;        // How often this correction has been applied
    confidence: number;        // Derived from usage count
}

const DB_NAME = 'tactms-handwriting';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<HandwritingDB>> | null = null;

/**
 * Initialize the IndexedDB database
 */
const getDB = async (): Promise<IDBPDatabase<HandwritingDB>> => {
    if (!dbPromise) {
        dbPromise = openDB<HandwritingDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                const store = db.createObjectStore('corrections', { keyPath: 'id' });
                store.createIndex('by-original', 'originalText');
                store.createIndex('by-assembly', 'assemblyName');
                store.createIndex('by-timestamp', 'timestamp');
            },
        });
    }
    return dbPromise;
};

/**
 * Generate a unique ID for a correction
 */
const generateId = (original: string, assembly: string): string => {
    return `${assembly.toLowerCase()}-${original.toLowerCase().replace(/\s+/g, '-')}`;
};

/**
 * Store a correction when user edits an OCR result
 */
export const storeCorrection = async (
    originalText: string,
    correctedText: string,
    assemblyName: string
): Promise<void> => {
    if (!originalText || !correctedText) return;
    if (originalText.toLowerCase() === correctedText.toLowerCase()) return;

    const db = await getDB();
    const id = generateId(originalText, assemblyName);

    // Check if correction already exists
    const existing = await db.get('corrections', id);

    if (existing) {
        // Increment usage count and update confidence
        existing.usageCount += 1;
        existing.confidence = Math.min(1, existing.usageCount * 0.1 + 0.5);
        existing.timestamp = Date.now();
        existing.displayCorrected = correctedText; // Update to latest correction
        await db.put('corrections', existing);
    } else {
        // Create new correction
        const correction: HandwritingCorrection = {
            id,
            originalText: originalText.toLowerCase(),
            correctedText: correctedText.toLowerCase(),
            displayOriginal: originalText,
            displayCorrected: correctedText,
            assemblyName,
            timestamp: Date.now(),
            usageCount: 1,
            confidence: 0.6, // Initial confidence
        };
        await db.put('corrections', correction);
    }
};

/**
 * Find the best matching correction for an OCR text
 */
export const findBestMatch = async (
    ocrText: string,
    assemblyName?: string
): Promise<HandwritingCorrection | null> => {
    if (!ocrText) return null;

    const db = await getDB();
    const normalizedText = ocrText.toLowerCase().trim();

    // First try exact match
    const allCorrections = await db.getAll('corrections');

    // Filter by assembly if provided
    const relevantCorrections = assemblyName
        ? allCorrections.filter(c => c.assemblyName === assemblyName || c.assemblyName === 'global')
        : allCorrections;

    // Exact match
    const exactMatch = relevantCorrections.find(c => c.originalText === normalizedText);
    if (exactMatch && exactMatch.confidence >= 0.6) {
        return exactMatch;
    }

    // Fuzzy match using Levenshtein distance
    let bestMatch: HandwritingCorrection | null = null;
    let bestScore = 0;

    for (const correction of relevantCorrections) {
        const similarity = calculateSimilarity(normalizedText, correction.originalText);
        const score = similarity * correction.confidence;

        if (similarity >= 0.85 && score > bestScore) {
            bestScore = score;
            bestMatch = correction;
        }
    }

    return bestMatch;
};

/**
 * Apply learned corrections to a batch of extracted entries
 */
export const applyLearnedCorrections = async (
    entries: Array<{ name: string;[key: string]: any }>,
    assemblyName: string
): Promise<Array<{ name: string; wasLearned: boolean; originalName?: string;[key: string]: any }>> => {
    const results = [];

    for (const entry of entries) {
        const match = await findBestMatch(entry.name, assemblyName);

        if (match) {
            results.push({
                ...entry,
                name: match.displayCorrected,
                wasLearned: true,
                originalName: entry.name,
            });
        } else {
            results.push({
                ...entry,
                wasLearned: false,
            });
        }
    }

    return results;
};

/**
 * Get all corrections for an assembly
 */
export const getCorrectionsForAssembly = async (
    assemblyName: string
): Promise<HandwritingCorrection[]> => {
    const db = await getDB();
    const allCorrections = await db.getAllFromIndex('corrections', 'by-assembly', assemblyName);
    return allCorrections.sort((a, b) => b.timestamp - a.timestamp);
};

/**
 * Get statistics about learned corrections
 */
export const getStatistics = async (): Promise<{
    totalCorrections: number;
    byAssembly: { [key: string]: number };
    highConfidenceCount: number;
    mostUsed: HandwritingCorrection[];
}> => {
    const db = await getDB();
    const allCorrections = await db.getAll('corrections');

    const byAssembly: { [key: string]: number } = {};
    let highConfidenceCount = 0;

    for (const correction of allCorrections) {
        byAssembly[correction.assemblyName] = (byAssembly[correction.assemblyName] || 0) + 1;
        if (correction.confidence >= 0.8) {
            highConfidenceCount++;
        }
    }

    const mostUsed = [...allCorrections]
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10);

    return {
        totalCorrections: allCorrections.length,
        byAssembly,
        highConfidenceCount,
        mostUsed,
    };
};

/**
 * Delete a specific correction
 */
export const deleteCorrection = async (id: string): Promise<void> => {
    const db = await getDB();
    await db.delete('corrections', id);
};

/**
 * Clear all corrections for an assembly
 */
export const clearAssemblyCorrections = async (assemblyName: string): Promise<void> => {
    const db = await getDB();
    const corrections = await db.getAllFromIndex('corrections', 'by-assembly', assemblyName);

    const tx = db.transaction('corrections', 'readwrite');
    for (const correction of corrections) {
        await tx.store.delete(correction.id);
    }
    await tx.done;
};

/**
 * Calculate string similarity using Levenshtein distance
 */
const calculateSimilarity = (str1: string, str2: string): number => {
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return 1 - distance / maxLen;
};

/**
 * Export all corrections for backup
 */
export const exportCorrections = async (): Promise<HandwritingCorrection[]> => {
    const db = await getDB();
    return db.getAll('corrections');
};

/**
 * Import corrections from backup
 */
export const importCorrections = async (corrections: HandwritingCorrection[]): Promise<void> => {
    const db = await getDB();
    const tx = db.transaction('corrections', 'readwrite');

    for (const correction of corrections) {
        await tx.store.put(correction);
    }

    await tx.done;
};
