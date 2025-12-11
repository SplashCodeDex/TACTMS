/**
 * Amount Validator Service
 * Detects and suggests corrections for OCR-misread amounts
 */

import type { TitheRecordB, TransactionLogEntry, AmountValidation, MemberTitheHistory } from '@/types';

// Re-export types for convenience
export type { AmountValidation, MemberTitheHistory } from '@/types';

// Common OCR misreadings for numbers
const OCR_NUMBER_CORRECTIONS: Record<string, number> = {
    'S0': 50,
    '5O': 50,
    '1OO': 100,
    '10O': 100,
    '1O0': 100,
    '2OO': 200,
    '20O': 200,
    '5OO': 500,
    '50O': 500,
    '1OOO': 1000,
    '100O': 1000,
    '10OO': 1000,
    '1O00': 1000,
};

/**
 * Common tithe amounts in Ghana (GHS)
 * These are the most frequently observed tithe values.
 * Used to "snap" OCR-extracted amounts when close to a known pattern.
 */
const COMMON_TITHE_AMOUNTS = [
    5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 100,
    120, 150, 200, 250, 300, 400, 500, 600, 700, 800, 1000,
    1500, 2000, 3000, 5000, 10000
];

/** Assembly-specific learned patterns (in-memory cache) */
const assemblyPatternCache: Map<string, number[]> = new Map();

/**
 * Learn assembly-specific common amounts from transaction history
 * Returns the top 20 most common amounts for the assembly
 */
export const learnAssemblyPatterns = (
    assemblyName: string,
    transactionLogs: TransactionLogEntry[]
): number[] => {
    const freq: Record<number, number> = {};

    for (const log of transactionLogs) {
        if (!log || !log.titheListData) continue;
        // Filter by assembly
        if (log.assemblyName.toLowerCase() !== assemblyName.toLowerCase()) continue;

        for (const record of log.titheListData) {
            const amount = Number(record["Transaction Amount"]) || 0;
            if (amount > 0) {
                freq[amount] = (freq[amount] || 0) + 1;
            }
        }
    }

    // Return top 20 most common amounts
    const patterns = Object.entries(freq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([amt]) => Number(amt));

    // Cache for future use
    if (patterns.length > 0) {
        assemblyPatternCache.set(assemblyName, patterns);
    }

    return patterns;
};

/**
 * Get a member's typical/signature amount if they have consistent payments
 * Returns null if the member doesn't have a consistent pattern
 */
export const getMemberTypicalAmount = (history: MemberTitheHistory): number | null => {
    if (history.occurrences < 3) return null;

    // Guard against division by zero
    if (history.averageAmount <= 0) return null;

    // Low standard deviation relative to average = consistent payer
    const coefficientOfVariation = history.standardDeviation / history.averageAmount;

    if (coefficientOfVariation < 0.15) {
        // Very consistent: always pays roughly the same
        return Math.round(history.averageAmount);
    }

    // Check if min === max (always pays exact same)
    if (history.minAmount === history.maxAmount) {
        return history.minAmount;
    }

    return null;
};

/**
 * Snap an amount to the nearest common tithe value if within tolerance
 * @param amount - The extracted amount
 * @param tolerancePercent - Maximum deviation (default 8%)
 * @param assemblyPatterns - Optional assembly-specific patterns to prioritize
 * @returns The snapped amount or null if no close match
 */
export const snapToCommonAmount = (
    amount: number,
    tolerancePercent: number = 8,
    assemblyPatterns?: number[]
): { snappedAmount: number; deviation: number; isAssemblyPattern: boolean } | null => {
    if (amount <= 0) return null;

    // Prioritize assembly patterns if available
    const patterns = assemblyPatterns && assemblyPatterns.length > 0
        ? [...new Set([...assemblyPatterns, ...COMMON_TITHE_AMOUNTS])]
        : COMMON_TITHE_AMOUNTS;

    let closestMatch: { amount: number; deviation: number; isAssemblyPattern: boolean } | null = null;

    for (const common of patterns) {
        if (common <= 0) continue; // Guard against division by zero
        const deviation = Math.abs(amount - common) / common * 100;
        if (deviation <= tolerancePercent) {
            const isAssemblyPattern = assemblyPatterns?.includes(common) ?? false;
            // Prefer assembly patterns (they get a boost)
            const effectiveDeviation = isAssemblyPattern ? deviation * 0.7 : deviation;

            if (!closestMatch || effectiveDeviation < (closestMatch.isAssemblyPattern ? closestMatch.deviation * 0.7 : closestMatch.deviation)) {
                closestMatch = { amount: common, deviation, isAssemblyPattern };
            }
        }
    }

    if (closestMatch) {
        return {
            snappedAmount: closestMatch.amount,
            deviation: closestMatch.deviation,
            isAssemblyPattern: closestMatch.isAssemblyPattern
        };
    }

    return null;
};

/**
 * Get cached assembly patterns (or empty array if not learned yet)
 */
export const getAssemblyPatterns = (assemblyName: string): number[] => {
    return assemblyPatternCache.get(assemblyName) || [];
};

/**
 * Validate an amount and suggest corrections if needed
 */
export const validateAmount = (
    amount: number | string,
    memberHistory?: MemberTitheHistory
): AmountValidation => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    // Check for NaN or invalid
    if (isNaN(numAmount) || numAmount < 0) {
        return {
            originalAmount: numAmount || 0,
            suggestedAmount: 0,
            confidence: 0.5,
            reason: 'ocr_artifact',
            message: 'Invalid amount detected'
        };
    }

    // Check for OCR artifacts in string form
    if (typeof amount === 'string') {
        const upperAmount = amount.toUpperCase().trim();
        if (OCR_NUMBER_CORRECTIONS[upperAmount]) {
            return {
                originalAmount: numAmount,
                suggestedAmount: OCR_NUMBER_CORRECTIONS[upperAmount],
                confidence: 0.85,
                reason: 'ocr_artifact',
                message: `Possible OCR error: "${amount}" → ${OCR_NUMBER_CORRECTIONS[upperAmount]}`
            };
        }
    }

    // If we have member history, check against their typical range
    if (memberHistory && memberHistory.occurrences >= 3) {
        const { averageAmount, standardDeviation, minAmount, maxAmount } = memberHistory;

        // Statistical anomaly detection: flag amounts >2σ from average
        if (standardDeviation > 0 && numAmount > 0) {
            const zScore = Math.abs(numAmount - averageAmount) / standardDeviation;
            if (zScore > 2) {
                const direction = numAmount > averageAmount ? 'higher' : 'lower';
                return {
                    originalAmount: numAmount,
                    suggestedAmount: Math.round(averageAmount),
                    confidence: 0.7,
                    reason: 'anomaly',
                    message: `Amount is ${zScore.toFixed(1)}σ ${direction} than average (GHS ${averageAmount})`
                };
            }
        }

        // Fallback: Check for unusually high amount (3x max)
        if (numAmount > maxAmount * 3) {
            return {
                originalAmount: numAmount,
                suggestedAmount: Math.round(averageAmount),
                confidence: 0.6,
                reason: 'unusual_high',
                message: `Amount is 3x higher than usual max (${maxAmount}). Typical: ${averageAmount}`
            };
        }

        // Fallback: Check for unusually low amount (but not zero - zero is valid for "didn't tithe")
        if (numAmount > 0 && numAmount < minAmount * 0.3 && minAmount > 10) {
            return {
                originalAmount: numAmount,
                suggestedAmount: Math.round(averageAmount),
                confidence: 0.5,
                reason: 'unusual_low',
                message: `Amount seems low compared to usual min (${minAmount}). Typical: ${averageAmount}`
            };
        }
    }

    // Check if amount is close to a common tithe value (snap suggestion)
    const snapResult = snapToCommonAmount(numAmount);
    if (snapResult && snapResult.snappedAmount !== numAmount) {
        return {
            originalAmount: numAmount,
            suggestedAmount: snapResult.snappedAmount,
            confidence: 0.75,
            reason: 'ocr_artifact',
            message: `Amount ${numAmount} is close to common value ${snapResult.snappedAmount} (${snapResult.deviation.toFixed(1)}% off)`
        };
    }

    // Amount looks valid
    return {
        originalAmount: numAmount,
        confidence: 1.0,
        reason: 'valid'
    };
};

/**
 * Validate with learned corrections (async version)
 * Checks handwriting learning database first for known patterns
 * Uses member history to weight suggestions (context-aware)
 */
export const validateAmountWithLearning = async (
    amount: number | string,
    assemblyName: string,
    memberHistory?: MemberTitheHistory
): Promise<AmountValidation> => {
    const { suggestCorrection } = await import('./handwritingLearning');

    // If amount is a string, check learned corrections first
    if (typeof amount === 'string') {
        const learnedSuggestion = await suggestCorrection(assemblyName, amount);

        if (learnedSuggestion && learnedSuggestion.confidence > 0.5) {
            let adjustedConfidence = learnedSuggestion.confidence;
            let contextNote = '';

            // Context-aware: Boost confidence if suggestion matches member's typical payment
            if (memberHistory && memberHistory.occurrences >= 3) {
                const { averageAmount, standardDeviation } = memberHistory;
                const suggestedValue = learnedSuggestion.suggestedAmount;

                // Check if suggestion is within 1σ of member's average
                const deviation = standardDeviation > 0
                    ? Math.abs(suggestedValue - averageAmount) / standardDeviation
                    : 0;

                if (deviation <= 1) {
                    // Suggestion matches member's typical payment - boost confidence
                    adjustedConfidence = Math.min(0.98, adjustedConfidence + 0.15);
                    contextNote = ` (matches typical payment of GHS ${Math.round(averageAmount)})`;
                } else if (deviation > 2) {
                    // Suggestion is unusual for this member - reduce confidence
                    adjustedConfidence = Math.max(0.4, adjustedConfidence - 0.2);
                    contextNote = ` (unusual for this member who typically pays GHS ${Math.round(averageAmount)})`;
                }
            }

            return {
                originalAmount: parseFloat(amount) || 0,
                suggestedAmount: learnedSuggestion.suggestedAmount,
                confidence: adjustedConfidence,
                reason: 'ocr_artifact',
                message: `Learned correction: "${amount}" → ${learnedSuggestion.suggestedAmount} (seen ${learnedSuggestion.occurrences}x)${contextNote}`
            };
        }
    }

    // Context-aware: If member always pays the same amount, suggest it
    if (memberHistory && memberHistory.occurrences >= 5) {
        const { averageAmount, standardDeviation, minAmount, maxAmount } = memberHistory;
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

        // Very consistent payer (low variance)
        if (standardDeviation < averageAmount * 0.1 && minAmount === maxAmount) {
            // Member always pays exact same amount
            if (!isNaN(numAmount) && numAmount !== averageAmount) {
                return {
                    originalAmount: numAmount,
                    suggestedAmount: averageAmount,
                    confidence: 0.9,
                    reason: 'member_pattern',
                    message: `This member always pays GHS ${averageAmount} (${memberHistory.occurrences} consecutive payments)`
                };
            }
        }
    }

    // Try Ensemble prediction (combines char substitution + ML neural network)
    if (typeof amount === 'string') {
        try {
            const { predictEnsemble } = await import('./ensembleOCR');
            const ensemblePrediction = await predictEnsemble(amount);

            if (ensemblePrediction && ensemblePrediction.confidence > 0.6) {
                const methodNote = ensemblePrediction.agreementScore > 1
                    ? ` (${ensemblePrediction.agreementScore} methods agree)`
                    : ` (${ensemblePrediction.method})`;

                return {
                    originalAmount: parseFloat(amount) || 0,
                    suggestedAmount: ensemblePrediction.suggestedAmount,
                    confidence: ensemblePrediction.confidence,
                    reason: 'ocr_artifact',
                    message: `AI correction: "${amount}" → ${ensemblePrediction.suggestedAmount}${methodNote}`
                };
            }
        } catch {
            // Ensemble not available, continue to fallback
        }
    }

    // Fall back to standard validation
    return validateAmount(amount, memberHistory);
};

/**
 * Build member tithe history from transaction logs
 */
export const buildMemberHistory = (
    memberId: string,
    transactionLogs: TransactionLogEntry[]
): MemberTitheHistory | null => {
    const amounts: number[] = [];

    for (const log of transactionLogs) {
        if (!log || !log.titheListData) continue;
        for (const record of log.titheListData) {
            // Check if this record belongs to the member
            const recordMemberId = record["Membership Number"] || "";
            if (recordMemberId.includes(memberId) || memberId.includes(recordMemberId.split("(")[0].trim())) {
                const amount = typeof record["Transaction Amount"] === 'number'
                    ? record["Transaction Amount"]
                    : parseFloat(String(record["Transaction Amount"])) || 0;
                if (amount > 0) {
                    amounts.push(amount);
                }
            }
        }
    }

    if (amounts.length === 0) return null;

    const averageAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    // Calculate standard deviation for anomaly detection
    const squaredDiffs = amounts.map(amount => Math.pow(amount - averageAmount, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / amounts.length;
    const standardDeviation = Math.sqrt(avgSquaredDiff);

    return {
        memberId,
        averageAmount: Math.round(averageAmount),
        standardDeviation: Math.round(standardDeviation),
        minAmount: Math.min(...amounts),
        maxAmount: Math.max(...amounts),
        lastAmount: amounts[amounts.length - 1],
        occurrences: amounts.length
    };
};

/**
 * Validate all amounts in an extraction result
 */
export const validateExtractedAmounts = (
    entries: TitheRecordB[],
    transactionLogs?: TransactionLogEntry[]
): Map<number, AmountValidation> => {
    const validations = new Map<number, AmountValidation>();

    entries.forEach((entry, index) => {
        const amount = entry["Transaction Amount"];
        const memberId = entry["Membership Number"];

        // Build history if we have logs
        const history = transactionLogs
            ? buildMemberHistory(memberId, transactionLogs)
            : undefined;

        validations.set(index, validateAmount(amount, history || undefined));
    });

    return validations;
};

/**
 * Get validation badge styling
 */
export const getValidationBadgeStyle = (validation: AmountValidation): {
    className: string;
    icon: 'check' | 'warning' | 'alert';
} => {
    switch (validation.reason) {
        case 'valid':
            return { className: 'bg-green-100 text-green-800', icon: 'check' };
        case 'ocr_artifact':
            return { className: 'bg-red-100 text-red-800', icon: 'alert' };
        case 'anomaly':
            return { className: 'bg-purple-100 text-purple-800', icon: 'warning' };
        case 'unusual_high':
        case 'unusual_low':
            return { className: 'bg-yellow-100 text-yellow-800', icon: 'warning' };
        default:
            return { className: 'bg-gray-100 text-gray-800', icon: 'check' };
    }
};
