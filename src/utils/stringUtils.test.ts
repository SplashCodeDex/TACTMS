import { describe, it, expect } from 'vitest';
import { levenshteinDistance, getSimilarity } from './stringUtils';

describe('stringUtils', () => {
    describe('levenshteinDistance', () => {
        it('should return 0 for identical strings', () => {
            expect(levenshteinDistance('hello', 'hello')).toBe(0);
        });

        it('should calculate correct distance for insertions', () => {
            expect(levenshteinDistance('hello', 'helloo')).toBe(1);
        });

        it('should calculate correct distance for deletions', () => {
            expect(levenshteinDistance('hello', 'hell')).toBe(1);
        });

        it('should calculate correct distance for substitutions', () => {
            expect(levenshteinDistance('hello', 'hallo')).toBe(1);
        });

        it('should handle empty strings', () => {
            expect(levenshteinDistance('', 'hello')).toBe(5);
            expect(levenshteinDistance('hello', '')).toBe(5);
            expect(levenshteinDistance('', '')).toBe(0);
        });
    });

    describe('getSimilarity', () => {
        it('should return 1.0 for identical strings', () => {
            expect(getSimilarity('hello', 'hello')).toBe(1.0);
        });

        it('should return 0.0 for completely different strings (if length matches distance)', () => {
            // Note: Levenshtein distance can be max(len(a), len(b)).
            // If a='abc', b='def', distance is 3. Max length is 3. Similarity = (3-3)/3 = 0.
            expect(getSimilarity('abc', 'def')).toBe(0.0);
        });

        it('should return a value between 0 and 1', () => {
            const sim = getSimilarity('kitten', 'sitting');
            expect(sim).toBeGreaterThan(0);
            expect(sim).toBeLessThan(1);
        });

        it('should be case sensitive (helper handles case normalization usually, but function itself is raw)', () => {
            // Based on implementation:
            // const distance = levenshteinDistance(a, b);
            // return (maxLength - distance) / maxLength;
            // 'A' vs 'a' -> distance 1.
            expect(getSimilarity('A', 'a')).toBe(0.0);
        });
    });
});
