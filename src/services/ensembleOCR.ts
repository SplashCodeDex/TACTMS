/**
 * Ensemble OCR Correction Service
 *
 * Combines multiple correction strategies:
 * 1. Exact pattern matching (handwritingLearning)
 * 2. Character substitution (charSubstitutionEngine)
 * 3. Neural network (ocrMLService)
 *
 * Uses weighted voting when multiple methods agree.
 */

import { predictWithSubstitution, learnFromCorrection as learnSubstitution } from '@/services/charSubstitutionEngine';
import { predictCorrection as predictML, addTrainingExample as trainML } from '@/services/ocrMLService';
import type { EnsemblePrediction } from '@/types';

// Re-export for convenience
export type { EnsemblePrediction } from '@/types';

// ============================================================================
// ENSEMBLE PREDICTION
// ============================================================================

/**
 * Get prediction using ensemble of methods
 * Returns the best prediction based on confidence and agreement
 */
export const predictEnsemble = async (
    input: string
): Promise<EnsemblePrediction | null> => {
    const predictions: { value: number; confidence: number; method: string }[] = [];

    // Method 1: Character Substitution
    const charSubResult = predictWithSubstitution(input);
    if (charSubResult) {
        predictions.push({
            value: charSubResult.correctedValue,
            confidence: charSubResult.confidence,
            method: 'char_substitution'
        });
    }

    // Method 2: Neural Network (ML)
    try {
        const mlResult = await predictML(input);
        if (mlResult && mlResult.confidence > 0.5) {
            predictions.push({
                value: mlResult.suggestedAmount,
                confidence: mlResult.confidence,
                method: 'ml'
            });
        }
    } catch {
        // ML not available
    }

    if (predictions.length === 0) {
        return null;
    }

    // Calculate agreement
    const values = predictions.map(p => p.value);
    const uniqueValues = [...new Set(values)];

    // Cache ML prediction lookup (avoid 3x find() calls)
    const mlPrediction = predictions.find(p => p.method === 'ml');

    // Helper: build breakdown object
    const buildBreakdown = () => ({
        charSub: charSubResult ? { value: charSubResult.correctedValue, confidence: charSubResult.confidence } : undefined,
        ml: mlPrediction ? { value: mlPrediction.value, confidence: mlPrediction.confidence } : undefined
    });

    // If all methods agree, boost confidence
    if (uniqueValues.length === 1 && predictions.length > 1) {
        // All agree on same value!
        const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
        const boostedConfidence = Math.min(0.98, avgConfidence + 0.1);

        return {
            suggestedAmount: uniqueValues[0],
            confidence: boostedConfidence,
            method: 'ensemble',
            agreementScore: predictions.length,
            breakdown: buildBreakdown()
        };
    }

    // Methods disagree - use weighted voting
    const valueVotes = new Map<number, number>();
    for (const pred of predictions) {
        const current = valueVotes.get(pred.value) || 0;
        valueVotes.set(pred.value, current + pred.confidence);
    }

    // Find value with highest weighted vote
    let bestValue = 0;
    let bestScore = 0;
    for (const [value, score] of valueVotes) {
        if (score > bestScore) {
            bestScore = score;
            bestValue = value;
        }
    }

    // Get the prediction that gave us this value
    const winningPred = predictions.find(p => p.value === bestValue)!;

    return {
        suggestedAmount: bestValue,
        confidence: Math.min(0.9, winningPred.confidence), // Slight penalty for disagreement
        method: winningPred.method as 'char_substitution' | 'ml',
        agreementScore: predictions.filter(p => p.value === bestValue).length,
        breakdown: buildBreakdown()
    };
};

// ============================================================================
// ENSEMBLE TRAINING
// ============================================================================

/**
 * Train all ensemble methods with a correction
 */
export const trainEnsemble = async (
    original: string,
    corrected: number
): Promise<void> => {
    // Train character substitution (sync)
    learnSubstitution(original, corrected);

    // Train ML (async, fire-and-forget)
    try {
        trainML(original, corrected);
    } catch {
        // ML not available
    }
};

// ============================================================================
// ENSEMBLE STATS
// ============================================================================

export const getEnsembleStats = async (): Promise<{
    charSubPatterns: number;
    mlExamples: number;
    mlModelLoaded: boolean;
}> => {
    const { getSubstitutionStats } = await import('./charSubstitutionEngine');
    const { getModelStatus } = await import('./ocrMLService');

    const charStats = getSubstitutionStats();
    const mlStats = getModelStatus();

    return {
        charSubPatterns: charStats.totalPatterns,
        mlExamples: mlStats.trainingExamples,
        mlModelLoaded: mlStats.isModelLoaded
    };
};
