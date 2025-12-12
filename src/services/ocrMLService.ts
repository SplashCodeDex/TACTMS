/**
 * ML-Based OCR Correction Service
 *
 * Uses TensorFlow.js to train a character-level neural network
 * that learns OCR error patterns and suggests corrections.
 *
 * Key Features:
 * - Learns from user corrections over time
 * - Generalizes to unseen inputs (e.g., learns "1OO"→100 can predict "3OO"→300)
 * - Persists model to IndexedDB for offline use
 */

import * as tf from '@tensorflow/tfjs';
import { MAX_OCR_TRAINING_EXAMPLES } from '@/constants';

// ============================================================================
// TYPES
// ============================================================================

interface TrainingExample {
    input: string;      // OCR-extracted: "1OO"
    output: number;     // User-corrected: 100
}

interface PredictionResult {
    suggestedAmount: number;
    confidence: number;
    method: 'ml' | 'fallback';
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Character vocabulary for encoding
const CHAR_VOCAB = '0123456789OoIilSsBbGg. ';
const VOCAB_SIZE = CHAR_VOCAB.length;
const MAX_INPUT_LENGTH = 10;  // Max characters in amount string
const MAX_TRAINING_EXAMPLES = MAX_OCR_TRAINING_EXAMPLES; // Use centralized constant
const MODEL_SAVE_KEY = 'tactms-ocr-ml-model';
const TRAINING_DATA_KEY = 'tactms-ocr-training-data';

// ============================================================================
// ENCODING/DECODING
// ============================================================================

/**
 * Encode a character to a one-hot vector
 */
const charToIndex = (char: string): number => {
    const idx = CHAR_VOCAB.indexOf(char);
    return idx >= 0 ? idx : VOCAB_SIZE - 1; // Unknown chars map to last slot
};

/**
 * Encode a string to a tensor of shape [MAX_INPUT_LENGTH, VOCAB_SIZE]
 */
const encodeInput = (input: string): number[][] => {
    const encoded: number[][] = [];
    const paddedInput = input.slice(0, MAX_INPUT_LENGTH).padEnd(MAX_INPUT_LENGTH, ' ');

    for (const char of paddedInput) {
        const oneHot = new Array(VOCAB_SIZE).fill(0);
        oneHot[charToIndex(char)] = 1;
        encoded.push(oneHot);
    }

    return encoded;
};

/**
 * Normalize output amount for training (log scale for better learning)
 */
const normalizeAmount = (amount: number): number => {
    return Math.log10(Math.max(1, amount)) / 6; // Assumes max ~1,000,000
};

/**
 * Denormalize prediction back to amount
 */
const denormalizeAmount = (normalized: number): number => {
    return Math.round(Math.pow(10, normalized * 6));
};

// ============================================================================
// MODEL ARCHITECTURE
// ============================================================================

let model: tf.LayersModel | null = null;
let trainingData: TrainingExample[] = [];

/**
 * Create a new model architecture
 */
const createModel = (): tf.LayersModel => {
    const newModel = tf.sequential();

    // Input: [MAX_INPUT_LENGTH, VOCAB_SIZE]
    newModel.add(tf.layers.flatten({
        inputShape: [MAX_INPUT_LENGTH, VOCAB_SIZE]
    }));

    // Hidden layers
    newModel.add(tf.layers.dense({
        units: 64,
        activation: 'relu',
        kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
    }));

    newModel.add(tf.layers.dropout({ rate: 0.2 }));

    newModel.add(tf.layers.dense({
        units: 32,
        activation: 'relu'
    }));

    // Output: single normalized amount
    newModel.add(tf.layers.dense({
        units: 1,
        activation: 'sigmoid'
    }));

    newModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae']
    });

    return newModel;
};

// ============================================================================
// PERSISTENCE
// ============================================================================

/**
 * Save model to IndexedDB
 */
export const saveModel = async (): Promise<void> => {
    if (!model) return;

    try {
        await model.save(`indexeddb://${MODEL_SAVE_KEY}`);
        localStorage.setItem(TRAINING_DATA_KEY, JSON.stringify(trainingData));
        console.log('ML model saved successfully');
    } catch (err) {
        console.warn('Failed to save ML model:', err);
    }
};

/**
 * Load model from IndexedDB
 */
export const loadModel = async (): Promise<boolean> => {
    try {
        model = await tf.loadLayersModel(`indexeddb://${MODEL_SAVE_KEY}`);
        const savedData = localStorage.getItem(TRAINING_DATA_KEY);
        if (savedData) {
            trainingData = JSON.parse(savedData);
        }
        console.log('ML model loaded successfully');
        return true;
    } catch {
        console.log('No saved ML model found, will create new one');
        model = null;
        return false;
    }
};

// ============================================================================
// TRAINING
// ============================================================================

/**
 * Add a training example (call when user makes a correction)
 * Note: Duplicates are intentionally allowed - they help weight common patterns in ML training
 */
export const addTrainingExample = (
    ocrInput: string,
    correctedAmount: number
): void => {
    // Don't add if they're the same (no correction made)
    const parsed = parseFloat(ocrInput);
    if (!isNaN(parsed) && parsed === correctedAmount) {
        return;
    }

    trainingData.push({
        input: ocrInput.toUpperCase(),
        output: correctedAmount
    });

    // Cap training data to prevent unbounded growth
    // Remove oldest examples when limit is reached
    if (trainingData.length > MAX_TRAINING_EXAMPLES) {
        trainingData = trainingData.slice(-MAX_TRAINING_EXAMPLES);
    }

    // Auto-train if we have enough new examples
    if (trainingData.length % 10 === 0 && trainingData.length >= 10) {
        trainModel().catch(console.warn);
    }
};

/**
 * Train the model on accumulated examples
 */
export const trainModel = async (): Promise<{ loss: number; accuracy: number } | null> => {
    if (trainingData.length < 5) {
        console.log('Need at least 5 examples to train');
        return null;
    }

    // Initialize model if needed
    if (!model) {
        model = createModel();
    }

    // Prepare training data
    const xs = trainingData.map(ex => encodeInput(ex.input));
    const ys = trainingData.map(ex => normalizeAmount(ex.output));

    const xTensor = tf.tensor3d(xs);
    const yTensor = tf.tensor2d(ys.map(y => [y]));

    try {
        // Train
        const history = await model.fit(xTensor, yTensor, {
            epochs: 50,
            batchSize: Math.min(32, trainingData.length),
            shuffle: true,
            verbose: 0
        });

        // Get final metrics
        const finalLoss = history.history.loss[history.history.loss.length - 1] as number;
        const finalMae = history.history.mae[history.history.mae.length - 1] as number;

        // Save after training
        await saveModel();

        return { loss: finalLoss, accuracy: 1 - finalMae };
    } finally {
        xTensor.dispose();
        yTensor.dispose();
    }
};

// ============================================================================
// PREDICTION
// ============================================================================

/**
 * Predict a correction for an OCR input
 */
export const predictCorrection = async (
    ocrInput: string
): Promise<PredictionResult | null> => {
    // Try to load model if not in memory
    if (!model) {
        const loaded = await loadModel();
        if (!loaded || !model) {
            return null; // No model available
        }
    }

    // Need minimum training data for reliable predictions
    if (trainingData.length < 10) {
        return null;
    }

    const encoded = encodeInput(ocrInput.toUpperCase());
    const inputTensor = tf.tensor3d([encoded]);

    try {
        const prediction = model.predict(inputTensor) as tf.Tensor;
        const normalizedValue = (await prediction.data())[0];
        prediction.dispose();

        const suggestedAmount = denormalizeAmount(normalizedValue);

        // Calculate confidence based on how close prediction is to training examples
        const similarExamples = trainingData.filter(ex =>
            ex.input.replace(/[0-9]/g, '') === ocrInput.toUpperCase().replace(/[0-9]/g, '')
        );
        const confidence = Math.min(0.9, 0.5 + (similarExamples.length * 0.1));

        return {
            suggestedAmount,
            confidence,
            method: 'ml'
        };
    } finally {
        inputTensor.dispose();
    }
};

/**
 * Get model status for debugging/UI
 */
export const getModelStatus = (): {
    trainingExamples: number;
    isModelLoaded: boolean;
    lastTrainedAt?: number;
} => {
    return {
        trainingExamples: trainingData.length,
        isModelLoaded: model !== null
    };
};

/**
 * Clear all training data and model (for testing)
 */
export const resetModel = async (): Promise<void> => {
    trainingData = [];
    model?.dispose();
    model = null;
    localStorage.removeItem(TRAINING_DATA_KEY);
    try {
        await tf.io.removeModel(`indexeddb://${MODEL_SAVE_KEY}`);
    } catch {
        // Model didn't exist
    }
};
