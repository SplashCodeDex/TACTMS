/**
 * Amount Validator Service
 * Detects and suggests corrections for OCR-misread amounts
 */

import { TitheRecordB, TransactionLogEntry } from "../types";

export interface AmountValidation {
    originalAmount: number;
    suggestedAmount?: number;
    confidence: number;
    reason: 'ocr_artifact' | 'unusual_high' | 'unusual_low' | 'anomaly' | 'valid';
    message?: string;
}

export interface MemberTitheHistory {
    memberId: string;
    averageAmount: number;
    standardDeviation: number; // For 2σ anomaly detection
    minAmount: number;
    maxAmount: number;
    lastAmount: number;
    occurrences: number;
}

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

    // Amount looks valid
    return {
        originalAmount: numAmount,
        confidence: 1.0,
        reason: 'valid'
    };
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
