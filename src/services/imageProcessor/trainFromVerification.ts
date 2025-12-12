/**
 * Training Helper for Tithe Extraction
 *
 * Automatically trains the ensemble OCR from verified batch corrections.
 * Call this after users verify/correct extracted amounts.
 */

import { trainEnsemble } from '@/services/ensembleOCR';
import type { TitheRecordB } from '@/types';

/**
 * Automatically trains ensemble from verified corrections
 *
 * @param original - The original extracted records (before user corrections)
 * @param corrected - The corrected records (after user verification)
 * @returns Number of corrections that were used for training
 */
export const trainFromVerifiedBatch = async (
    original: TitheRecordB[],
    corrected: TitheRecordB[]
): Promise<number> => {
    let trainingCount = 0;

    for (let i = 0; i < Math.min(original.length, corrected.length); i++) {
        const origAmount = original[i]["Transaction Amount"];
        const corrAmount = corrected[i]["Transaction Amount"];

        // Only train if the amount was changed and both are valid numbers
        if (
            origAmount !== corrAmount &&
            typeof origAmount === 'number' &&
            typeof corrAmount === 'number' &&
            origAmount > 0 // Skip 0 → X corrections (not OCR errors, just empty cells)
        ) {
            try {
                // Train the ensemble with the raw string representation
                await trainEnsemble(String(origAmount), corrAmount);
                trainingCount++;
                console.log(
                    `[trainFromVerifiedBatch] Trained: "${origAmount}" → ${corrAmount}`
                );
            } catch (error) {
                console.warn(
                    `[trainFromVerifiedBatch] Failed to train "${origAmount}" → ${corrAmount}:`,
                    error
                );
            }
        }
    }

    if (trainingCount > 0) {
        console.log(
            `[trainFromVerifiedBatch] Trained ensemble with ${trainingCount} corrections`
        );
    }

    return trainingCount;
};

/**
 * Train from a single correction (for immediate learning)
 *
 * @param originalRaw - The raw OCR text (e.g., "1OO")
 * @param correctedAmount - The correct numeric amount (e.g., 100)
 */
export const trainSingleCorrection = async (
    originalRaw: string,
    correctedAmount: number
): Promise<void> => {
    await trainEnsemble(originalRaw, correctedAmount);
    console.log(
        `[trainSingleCorrection] Trained: "${originalRaw}" → ${correctedAmount}`
    );
};
