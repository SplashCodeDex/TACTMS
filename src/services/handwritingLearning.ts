/**
 * Handwriting Learning Service
 *
 * Stores user corrections to OCR-extracted amounts and learns patterns
 * to suggest corrections automatically in future extractions.
 *
 * Uses IndexedDB for persistent storage per assembly.
 */

import type { AmountCorrection, CorrectionSuggestion } from '@/types';

// Re-export for convenience
export type { AmountCorrection, CorrectionSuggestion } from '@/types';

// Special assembly name for global/cross-assembly patterns
export const GLOBAL_ASSEMBLY = '__GLOBAL__';

// ============================================================================
// INDEXEDDB SETUP
// ============================================================================

const DB_NAME = 'tactms-handwriting';
const DB_VERSION = 2; // Bumped for name alias support
const STORE_NAME = 'corrections';
const ALIAS_STORE_NAME = 'name_aliases';

/**
 * Check if IndexedDB is available (fails in private mode on some browsers)
 */
let indexedDBAvailable: boolean | null = null;

const isIndexedDBAvailable = (): boolean => {
    if (indexedDBAvailable !== null) return indexedDBAvailable;
    try {
        indexedDBAvailable = typeof indexedDB !== 'undefined' && indexedDB !== null;
    } catch {
        indexedDBAvailable = false;
    }
    return indexedDBAvailable;
};

/**
 * Open/create the IndexedDB database
 * Returns null if IndexedDB is unavailable
 */
const openDB = (): Promise<IDBDatabase | null> => {
    if (!isIndexedDBAvailable()) {
        console.warn('IndexedDB not available - handwriting learning disabled');
        return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.warn('IndexedDB open failed:', request.error);
                resolve(null); // Graceful fallback instead of reject
            };
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Amount corrections store
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('assembly', 'assemblyName', { unique: false });
                    store.createIndex('original', 'originalValue', { unique: false });
                    store.createIndex('assembly_original', ['assemblyName', 'originalValue'], { unique: false });
                }

                // Name aliases store (for member name learning)
                if (!db.objectStoreNames.contains(ALIAS_STORE_NAME)) {
                    const aliasStore = db.createObjectStore(ALIAS_STORE_NAME, { keyPath: 'id' });
                    aliasStore.createIndex('assembly', 'assemblyName', { unique: false });
                    aliasStore.createIndex('extractedName', 'extractedName', { unique: false });
                    aliasStore.createIndex('assembly_extracted', ['assemblyName', 'extractedName'], { unique: false });
                }
            };
        } catch (err) {
            console.warn('IndexedDB initialization error:', err);
            resolve(null);
        }
    });
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Save a user's amount correction to learn from
 *
 * @param assemblyName - The assembly context
 * @param originalValue - What AI extracted (string, may contain OCR errors)
 * @param correctedValue - What user entered (number)
 * @param memberId - Optional member ID for member-specific patterns
 * @param source - Where the correction came from
 */
export const saveAmountCorrection = async (
    assemblyName: string,
    originalValue: string,
    correctedValue: number,
    memberId?: string,
    source: 'tithe_entry' | 'verification' | 'batch' = 'tithe_entry'
): Promise<void> => {
    // Normalize the original value for consistent matching
    const normalizedOriginal = originalValue.trim().toUpperCase();

    // Don't save if they're effectively the same
    if (parseFloat(normalizedOriginal) === correctedValue) {
        return;
    }

    const correction: AmountCorrection = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        assemblyName: assemblyName.toLowerCase(),
        originalValue: normalizedOriginal,
        correctedValue,
        memberId: memberId?.toLowerCase(),
        timestamp: Date.now(),
        source
    };

    const db = await openDB();
    if (!db) return; // IndexedDB unavailable, skip silently

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.add(correction);

        request.onsuccess = () => {
            // Train ensemble (char substitution + ML neural network)
            import('./ensembleOCR').then(({ trainEnsemble }) => {
                trainEnsemble(normalizedOriginal, correctedValue);
            }).catch(() => {
                // Ensemble not available
            });
            resolve();
        };
        request.onerror = () => reject(request.error);

        tx.oncomplete = () => db.close();
    });
};

export const getCorrectionsForAssembly = async (
    assemblyName: string
): Promise<AmountCorrection[]> => {
    const db = await openDB();
    if (!db) return []; // IndexedDB unavailable

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('assembly');
        const request = index.getAll(assemblyName.toLowerCase());

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);

        tx.oncomplete = () => db.close();
    });
};

/**
 * Suggest a correction based on learned patterns
 *
 * @param assemblyName - The assembly context
 * @param originalValue - The OCR-extracted value to check
 * @returns Suggestion if a pattern exists, null otherwise
 */
export const suggestCorrection = async (
    assemblyName: string,
    originalValue: string
): Promise<CorrectionSuggestion | null> => {
    const normalizedOriginal = originalValue.trim().toUpperCase();

    const db = await openDB();
    if (!db) return null; // IndexedDB unavailable

    // Helper to query corrections for a specific assembly
    const getCorrections = (targetAssembly: string): Promise<AmountCorrection[]> => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const index = store.index('assembly_original');
            const request = index.getAll([targetAssembly.toLowerCase(), normalizedOriginal]);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    };

    // Priority: Assembly-specific first, then global fallback
    let corrections = await getCorrections(assemblyName);
    let isGlobalMatch = false;

    if (corrections.length === 0) {
        // Fallback to global patterns
        corrections = await getCorrections(GLOBAL_ASSEMBLY);
        isGlobalMatch = true;
    }

    db.close();

    if (corrections.length === 0) {
        return null;
    }

    // Count occurrences of each corrected value
    const valueCounts = new Map<number, number>();
    for (const correction of corrections) {
        const count = valueCounts.get(correction.correctedValue) || 0;
        valueCounts.set(correction.correctedValue, count + 1);
    }

    // Find the most common correction
    let maxCount = 0;
    let mostCommonValue = 0;
    for (const [value, count] of valueCounts) {
        if (count > maxCount) {
            maxCount = count;
            mostCommonValue = value;
        }
    }

    // Calculate confidence (global patterns get slightly lower confidence)
    const baseConfidence = 0.5 + (maxCount / corrections.length) * 0.3 + Math.min(corrections.length / 10, 0.15);
    const confidence = Math.min(0.95, isGlobalMatch ? baseConfidence * 0.9 : baseConfidence);

    return {
        suggestedAmount: mostCommonValue,
        confidence,
        occurrences: maxCount,
        isExactMatch: true,
        isGlobal: isGlobalMatch
    };
};

/**
 * Get the most common corrections across an assembly
 * Useful for displaying "known patterns" to users
 */
export const getMostCommonCorrections = async (
    assemblyName: string,
    limit: number = 10
): Promise<Array<{ original: string; corrected: number; count: number }>> => {
    const corrections = await getCorrectionsForAssembly(assemblyName);

    // Group by original → corrected
    const patternCounts = new Map<string, Map<number, number>>();
    for (const correction of corrections) {
        if (!patternCounts.has(correction.originalValue)) {
            patternCounts.set(correction.originalValue, new Map());
        }
        const innerMap = patternCounts.get(correction.originalValue)!;
        const count = innerMap.get(correction.correctedValue) || 0;
        innerMap.set(correction.correctedValue, count + 1);
    }

    // Flatten and sort
    const results: Array<{ original: string; corrected: number; count: number }> = [];
    for (const [original, correctedMap] of patternCounts) {
        for (const [corrected, count] of correctedMap) {
            results.push({ original, corrected, count });
        }
    }

    return results
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
};

/**
 * Clear all corrections for an assembly (for testing or reset)
 */
export const clearCorrections = async (assemblyName: string): Promise<void> => {
    const db = await openDB();
    if (!db) return;

    const corrections = await getCorrectionsForAssembly(assemblyName);

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        for (const correction of corrections) {
            store.delete(correction.id);
        }

        tx.oncomplete = () => {
            db.close();
            resolve();
        };
        tx.onerror = () => reject(tx.error);
    });
};

/**
 * Save a global correction that applies to all assemblies
 * Checks for duplicates before saving
 */
export const saveGlobalCorrection = async (
    originalValue: string,
    correctedValue: number,
    source: 'tithe_entry' | 'verification' | 'batch' = 'batch'
): Promise<void> => {
    // Check if this global pattern already exists
    const existingGlobal = await suggestCorrection(GLOBAL_ASSEMBLY, originalValue);
    if (existingGlobal && existingGlobal.suggestedAmount === correctedValue) {
        // Already exists with same correction, skip
        return;
    }

    return saveAmountCorrection(
        GLOBAL_ASSEMBLY,
        originalValue,
        correctedValue,
        undefined,
        source
    );
};

/**
 * Check if a pattern should be promoted to global
 * Returns true if the same correction exists in 3+ different assemblies
 */
export const shouldPromoteToGlobal = async (
    originalValue: string,
    correctedValue: number
): Promise<boolean> => {
    const db = await openDB();
    if (!db) return false;

    const normalizedOriginal = originalValue.trim().toUpperCase();

    // Get all corrections with this original value
    const allCorrections: AmountCorrection[] = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('original');
        const request = index.getAll(normalizedOriginal);

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });

    db.close();

    // Count unique assemblies with this correction
    const assembliesWithCorrection = new Set<string>();
    for (const correction of allCorrections) {
        if (correction.correctedValue === correctedValue &&
            correction.assemblyName !== GLOBAL_ASSEMBLY.toLowerCase()) {
            assembliesWithCorrection.add(correction.assemblyName);
        }
    }

    // Promote if seen in 3+ assemblies
    return assembliesWithCorrection.size >= 3;
};

/**
 * Promote a pattern to global if it qualifies
 * Call this after saving a correction to auto-promote common patterns
 */
export const promoteToGlobalIfQualifies = async (
    originalValue: string,
    correctedValue: number
): Promise<boolean> => {
    const shouldPromote = await shouldPromoteToGlobal(originalValue, correctedValue);

    if (shouldPromote) {
        await saveGlobalCorrection(originalValue, correctedValue, 'batch');
        return true;
    }

    return false;
};

// ============================================================================
// EXPORT/IMPORT FUNCTIONS
// ============================================================================

/**
 * Export patterns to JSON for backup or sharing
 * @param assemblyName - Optional: export only this assembly, or all if omitted
 */
export const exportPatterns = async (assemblyName?: string): Promise<string> => {
    const db = await openDB();
    if (!db) return JSON.stringify({ patterns: [], exportedAt: Date.now() });

    const patterns: AmountCorrection[] = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);

        if (assemblyName) {
            const index = store.index('assembly');
            const request = index.getAll(assemblyName.toLowerCase());
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        } else {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        }
    });

    db.close();

    return JSON.stringify({
        patterns,
        exportedAt: Date.now(),
        version: 1,
        assembly: assemblyName || 'all'
    }, null, 2);
};

/**
 * Import patterns from JSON
 * @param json - JSON string from exportPatterns
 * @param targetAssembly - Optional: override assembly name for all imported patterns
 * @returns Number of patterns imported
 */
export const importPatterns = async (
    json: string,
    targetAssembly?: string
): Promise<{ imported: number; skipped: number }> => {
    const db = await openDB();
    if (!db) return { imported: 0, skipped: 0 };

    let data: { patterns: AmountCorrection[]; version?: number };
    try {
        data = JSON.parse(json);
    } catch {
        throw new Error('Invalid JSON format');
    }

    if (!Array.isArray(data.patterns)) {
        throw new Error('Invalid patterns format - expected { patterns: [...] }');
    }

    let imported = 0;
    let skipped = 0;

    for (const pattern of data.patterns) {
        // Skip invalid entries
        if (!pattern.originalValue || pattern.correctedValue === undefined) {
            skipped++;
            continue;
        }

        // Override assembly if specified
        const assemblyToUse = targetAssembly?.toLowerCase() || pattern.assemblyName;

        // Check if this exact pattern already exists
        const existing = await suggestCorrection(assemblyToUse, pattern.originalValue);
        if (existing && existing.suggestedAmount === pattern.correctedValue) {
            skipped++;
            continue;
        }

        // Save the pattern with new ID and timestamp
        await saveAmountCorrection(
            assemblyToUse,
            pattern.originalValue,
            pattern.correctedValue,
            pattern.memberId,
            pattern.source || 'batch'
        );
        imported++;
    }

    return { imported, skipped };
};

// ============================================================================
// NAME ALIAS LEARNING
// ============================================================================

export interface NameAlias {
    id: string;
    assemblyName: string;
    extractedName: string;       // What AI extracted (e.g., "PST ADDO J")
    correctMemberId: string;     // The correct member ID
    correctMemberName: string;   // Full name for display
    timestamp: number;
    source: 'verification' | 'manual';
}

/**
 * Save a name alias correction
 * When user links "PST ADDO J" to member "PASTOR JONATHAN ADDO MENSAH",
 * we learn this alias for future matching.
 */
export const saveNameAlias = async (
    assemblyName: string,
    extractedName: string,
    correctMemberId: string,
    correctMemberName: string,
    source: 'verification' | 'manual' = 'verification'
): Promise<void> => {
    const normalizedExtracted = extractedName.trim().toUpperCase();

    const alias: NameAlias = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        assemblyName: assemblyName.toLowerCase(),
        extractedName: normalizedExtracted,
        correctMemberId,
        correctMemberName,
        timestamp: Date.now(),
        source
    };

    const db = await openDB();
    if (!db) return;

    return new Promise((resolve, reject) => {
        const tx = db.transaction(ALIAS_STORE_NAME, 'readwrite');
        const store = tx.objectStore(ALIAS_STORE_NAME);
        store.add(alias);

        tx.oncomplete = () => {
            db.close();
            console.log(`[NameAlias] Learned: "${extractedName}" → ${correctMemberName}`);
            resolve();
        };
        tx.onerror = () => reject(tx.error);
    });
};

/**
 * Get a learned name alias for an extracted name
 * Returns the most frequently corrected member for this alias
 */
export const getNameAlias = async (
    assemblyName: string,
    extractedName: string
): Promise<{ memberId: string; memberName: string; count: number } | null> => {
    const normalizedExtracted = extractedName.trim().toUpperCase();

    const db = await openDB();
    if (!db) return null;

    const aliases: NameAlias[] = await new Promise((resolve, reject) => {
        const tx = db.transaction(ALIAS_STORE_NAME, 'readonly');
        const store = tx.objectStore(ALIAS_STORE_NAME);
        const index = store.index('assembly_extracted');
        const request = index.getAll([assemblyName.toLowerCase(), normalizedExtracted]);

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });

    db.close();

    if (aliases.length === 0) return null;

    // Count occurrences of each member ID
    const memberCounts = new Map<string, { name: string; count: number }>();
    for (const alias of aliases) {
        const existing = memberCounts.get(alias.correctMemberId);
        if (existing) {
            existing.count++;
        } else {
            memberCounts.set(alias.correctMemberId, {
                name: alias.correctMemberName,
                count: 1
            });
        }
    }

    // Return the most common match
    let bestMatch: { id: string; name: string; count: number } | null = null;
    for (const [id, data] of memberCounts) {
        if (!bestMatch || data.count > bestMatch.count) {
            bestMatch = { id, name: data.name, count: data.count };
        }
    }

    return bestMatch ? { memberId: bestMatch.id, memberName: bestMatch.name, count: bestMatch.count } : null;
};

// ============================================================================
// AUTO-CORRECT STREAK DETECTION
// ============================================================================

/**
 * Check if an OCR pattern should be auto-corrected
 * Returns the suggested value if the pattern has been corrected 3+ times to the same value
 */
export const shouldAutoCorrect = async (
    assemblyName: string,
    originalValue: string
): Promise<{ autoCorrect: boolean; suggestedValue: number; correctionCount: number } | null> => {
    const suggestion = await suggestCorrection(assemblyName, originalValue);

    if (!suggestion) return null;

    // Auto-correct threshold: 3+ corrections with high agreement
    if (suggestion.occurrences >= 3 && suggestion.confidence >= 0.7) {
        return {
            autoCorrect: true,
            suggestedValue: suggestion.suggestedAmount,
            correctionCount: suggestion.occurrences
        };
    }

    return {
        autoCorrect: false,
        suggestedValue: suggestion.suggestedAmount,
        correctionCount: suggestion.occurrences
    };
};

/**
 * Get total correction count for an assembly (for UI display)
 */
export const getCorrectionCount = async (assemblyName: string): Promise<number> => {
    const corrections = await getCorrectionsForAssembly(assemblyName);
    return corrections.length;
};

/**
 * Get all aliases for an assembly (for debugging/display)
 */
export const getAliasesForAssembly = async (assemblyName: string): Promise<NameAlias[]> => {
    const db = await openDB();
    if (!db) return [];

    return new Promise((resolve, reject) => {
        const tx = db.transaction(ALIAS_STORE_NAME, 'readonly');
        const store = tx.objectStore(ALIAS_STORE_NAME);
        const index = store.index('assembly');
        const request = index.getAll(assemblyName.toLowerCase());

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);

        tx.oncomplete = () => db.close();
    });
};
