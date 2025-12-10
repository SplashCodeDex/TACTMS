/**
 * Tests for Handwriting Learning Service
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock IndexedDB for tests
const mockDB = {
    corrections: new Map<string, any>()
};

// Mock the indexedDB global
const mockIndexedDB = {
    open: vi.fn().mockImplementation(() => {
        const request = {
            result: {
                transaction: vi.fn().mockImplementation((storeName, mode) => ({
                    objectStore: vi.fn().mockImplementation(() => ({
                        add: vi.fn().mockImplementation((value) => {
                            mockDB.corrections.set(value.id, value);
                            return {
                                set onsuccess(cb: () => void) { cb(); },
                                set onerror(_: () => void) { }
                            };
                        }),
                        index: vi.fn().mockImplementation(() => ({
                            getAll: vi.fn().mockImplementation((key) => {
                                const results = Array.from(mockDB.corrections.values()).filter(c => {
                                    if (Array.isArray(key)) {
                                        return c.assemblyName === key[0] && c.originalValue === key[1];
                                    }
                                    return c.assemblyName === key;
                                });
                                return {
                                    result: results,
                                    set onsuccess(cb: () => void) { cb(); },
                                    set onerror(_: () => void) { }
                                };
                            })
                        })),
                        delete: vi.fn()
                    })),
                    set oncomplete(cb: () => void) { cb(); },
                    set onerror(_: () => void) { }
                })),
                close: vi.fn(),
                objectStoreNames: { contains: () => true }
            },
            set onsuccess(cb: () => void) { cb(); },
            set onerror(_: () => void) { },
            set onupgradeneeded(_: (e: any) => void) { }
        };
        return request;
    })
};

vi.stubGlobal('indexedDB', mockIndexedDB);

// Import after mocking
import {
    saveAmountCorrection,
    suggestCorrection,
    getMostCommonCorrections,
    clearCorrections,
    type AmountCorrection
} from './handwritingLearning';

describe('handwritingLearning', () => {
    beforeEach(() => {
        mockDB.corrections.clear();
    });

    describe('saveAmountCorrection', () => {
        it('saves a correction to the database', async () => {
            await saveAmountCorrection('Central', '1OO', 100);

            expect(mockDB.corrections.size).toBe(1);
            const saved = Array.from(mockDB.corrections.values())[0] as AmountCorrection;
            expect(saved.assemblyName).toBe('central');
            expect(saved.originalValue).toBe('1OO');
            expect(saved.correctedValue).toBe(100);
        });

        it('does not save if original equals corrected', async () => {
            await saveAmountCorrection('Central', '100', 100);
            expect(mockDB.corrections.size).toBe(0);
        });

        it('normalizes originalValue to uppercase', async () => {
            await saveAmountCorrection('Central', '5o', 50);
            const saved = Array.from(mockDB.corrections.values())[0] as AmountCorrection;
            expect(saved.originalValue).toBe('5O');
        });

        it('stores source type', async () => {
            await saveAmountCorrection('Central', '1OO', 100, undefined, 'batch');
            const saved = Array.from(mockDB.corrections.values())[0] as AmountCorrection;
            expect(saved.source).toBe('batch');
        });
    });

    describe('suggestCorrection', () => {
        it('returns null when no corrections exist', async () => {
            const result = await suggestCorrection('Central', '1OO');
            expect(result).toBeNull();
        });
    });

    describe('getMostCommonCorrections', () => {
        it('returns empty array for empty database', async () => {
            const result = await getMostCommonCorrections('Central');
            expect(result).toEqual([]);
        });
    });
});

describe('validateAmountWithLearning', () => {
    it('falls back to standard validation when no learned pattern exists', async () => {
        const { validateAmountWithLearning } = await import('./amountValidator');
        const result = await validateAmountWithLearning(100, 'Central');
        expect(result.reason).toBe('valid');
    });
});
