/**
 * Character Substitution Engine
 *
 * Learns character-level OCR error patterns (e.g., O→0, I→1, S→5)
 * and applies them to correct new inputs.
 *
 * This is designed to work ALONGSIDE the neural network as an ensemble.
 */

import type { SubstitutionPattern } from '@/types';

// Re-export for convenience
export type { SubstitutionPattern } from '@/types';

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface SubstitutionResult {
    correctedValue: number;
    confidence: number;
    substitutionsApplied: string[];
    method: 'char_substitution';
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY = 'tactms-char-substitutions';

// Common OCR substitutions as baseline (pre-seeded)
const BASELINE_SUBSTITUTIONS: Record<string, string> = {
    'O': '0', 'o': '0',
    'I': '1', 'l': '1', 'i': '1',
    'S': '5', 's': '5',
    'B': '8', 'b': '8',
    'G': '6', 'g': '6',
    'Z': '2', 'z': '2',
    'T': '7',
};

// Learned substitutions with frequency tracking
let learnedSubstitutions: Map<string, SubstitutionPattern> = new Map();

/**
 * Load substitutions from localStorage
 */
export const loadSubstitutions = (): void => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const data = JSON.parse(saved) as SubstitutionPattern[];
            learnedSubstitutions = new Map(data.map(p => [`${p.from}→${p.to}`, p]));
        }
    } catch {
        // Start fresh
    }
};

/**
 * Save substitutions to localStorage
 */
const saveSubstitutions = (): void => {
    try {
        const data = Array.from(learnedSubstitutions.values());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        // Storage full or unavailable
    }
};

// ============================================================================
// LEARNING
// ============================================================================

/**
 * Learn substitutions from a correction
 *
 * Example: "1OO" → 100 teaches: O→0 (twice)
 */
export const learnFromCorrection = (
    original: string,
    corrected: number
): void => {
    const correctedStr = String(corrected);
    const originalUpper = original.toUpperCase();

    // Pad to same length for alignment
    if (originalUpper.length !== correctedStr.length) {
        // Can't align, skip learning
        return;
    }

    for (let i = 0; i < originalUpper.length; i++) {
        const fromChar = originalUpper[i];
        const toChar = correctedStr[i];

        // Only learn if characters are different
        if (fromChar !== toChar) {
            const key = `${fromChar}→${toChar}`;
            const existing = learnedSubstitutions.get(key);

            if (existing) {
                existing.frequency++;
                if (!existing.contexts.includes(original)) {
                    existing.contexts.push(original);
                    // Keep only last 10 contexts
                    if (existing.contexts.length > 10) {
                        existing.contexts.shift();
                    }
                }
            } else {
                learnedSubstitutions.set(key, {
                    from: fromChar,
                    to: toChar,
                    frequency: 1,
                    contexts: [original]
                });
            }
        }
    }

    saveSubstitutions();
};

// ============================================================================
// PREDICTION
// ============================================================================

/**
 * Get all possible substitutions for a character (sorted by frequency)
 */
const getSubstitutionsFor = (char: string): { to: string; frequency: number }[] => {
    const results: { to: string; frequency: number }[] = [];

    // Check learned substitutions first
    for (const pattern of learnedSubstitutions.values()) {
        if (pattern.from === char.toUpperCase()) {
            results.push({ to: pattern.to, frequency: pattern.frequency });
        }
    }

    // Add baseline if not already learned
    const baseline = BASELINE_SUBSTITUTIONS[char];
    if (baseline && !results.some(r => r.to === baseline)) {
        results.push({ to: baseline, frequency: 0.5 }); // Lower weight for baseline
    }

    return results.sort((a, b) => b.frequency - a.frequency);
};

/**
 * Apply learned substitutions to predict correction
 */
export const predictWithSubstitution = (input: string): SubstitutionResult | null => {
    const inputUpper = input.toUpperCase();
    let corrected = '';
    const substitutionsApplied: string[] = [];
    let totalFrequency = 0;
    let substitutionCount = 0;

    for (const char of inputUpper) {
        // If it's already a digit, keep it
        if (/[0-9]/.test(char)) {
            corrected += char;
            continue;
        }

        // Try to find a substitution
        const subs = getSubstitutionsFor(char);
        if (subs.length > 0) {
            corrected += subs[0].to;
            substitutionsApplied.push(`${char}→${subs[0].to}`);
            totalFrequency += subs[0].frequency;
            substitutionCount++;
        } else {
            // Unknown character, can't substitute
            return null;
        }
    }

    // Parse the result
    const value = parseFloat(corrected);
    if (isNaN(value)) {
        return null;
    }

    // Calculate confidence based on substitution frequencies
    const avgFrequency = substitutionCount > 0 ? totalFrequency / substitutionCount : 0;
    const confidence = Math.min(0.95, 0.5 + (avgFrequency / 20)); // More occurrences = higher confidence

    return {
        correctedValue: value,
        confidence,
        substitutionsApplied,
        method: 'char_substitution'
    };
};

/**
 * Get statistics about learned substitutions
 */
export const getSubstitutionStats = (): {
    totalPatterns: number;
    topSubstitutions: SubstitutionPattern[];
} => {
    const patterns = Array.from(learnedSubstitutions.values());
    return {
        totalPatterns: patterns.length,
        topSubstitutions: patterns
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 10)
    };
};

/**
 * Clear all learned substitutions (for testing)
 */
export const resetSubstitutions = (): void => {
    learnedSubstitutions.clear();
    localStorage.removeItem(STORAGE_KEY);
};

// Initialize on load
loadSubstitutions();
