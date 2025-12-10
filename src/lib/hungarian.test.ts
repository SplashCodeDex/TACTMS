/// <reference types="vitest/globals" />
/**
 * hungarian.test.ts
 * Tests for the Hungarian algorithm implementation
 */

import { describe, it, expect } from 'vitest';
import { solveAssignment, getAssignmentScore } from './hungarian';

// ============================================================================
// TESTS: solveAssignment - Basic Functionality
// ============================================================================

describe('solveAssignment', () => {
    it('handles empty matrix', () => {
        const result = solveAssignment([]);
        expect(result).toEqual([]);
    });

    it('handles matrix with empty rows', () => {
        const result = solveAssignment([[], []]);
        expect(result).toEqual([-1, -1]);
    });

    it('solves 2x2 simple assignment', () => {
        const scoreMatrix = [
            [0.9, 0.1],
            [0.2, 0.8]
        ];
        const result = solveAssignment(scoreMatrix);

        // Optimal: row 0 -> col 0; row 1 -> col 1 (total: 1.7)
        expect(result).toEqual([0, 1]);
    });

    it('solves 2x2 assignment requiring swap', () => {
        const scoreMatrix = [
            [0.3, 0.9],  // Best for row 0 is col 1
            [0.2, 0.8]   // Best for row 1 is also col 1
        ];
        const result = solveAssignment(scoreMatrix);

        // Hungarian should find: row 0 -> col 1 (0.9), row 1 -> col 0 (0.2)
        // Total: 1.1 (vs greedy which would double-assign col 1)
        expect(result[0]).not.toBe(result[1]); // No duplicate assignment

        const total = getAssignmentScore(scoreMatrix, result);
        expect(total).toBeGreaterThanOrEqual(1.0);
    });

    it('solves 3x3 matrix', () => {
        const scoreMatrix = [
            [0.9, 0.1, 0.2],
            [0.3, 0.8, 0.1],
            [0.2, 0.3, 0.7]
        ];
        const result = solveAssignment(scoreMatrix);

        // Optimal: row 0->0, row 1->1, row 2->2 (total: 2.4)
        expect(result).toEqual([0, 1, 2]);
    });

    it('handles ties correctly', () => {
        const scoreMatrix = [
            [0.5, 0.5],
            [0.5, 0.5]
        ];
        const result = solveAssignment(scoreMatrix);

        // Either assignment is valid, but no duplicates
        expect(result[0]).not.toBe(result[1]);
        expect([0, 1]).toContain(result[0]);
        expect([0, 1]).toContain(result[1]);
    });
});

// ============================================================================
// TESTS: solveAssignment - Rectangular Matrices
// ============================================================================

describe('solveAssignment - rectangular matrices', () => {
    it('handles more rows than columns (more names than members)', () => {
        const scoreMatrix = [
            [0.9, 0.1],
            [0.2, 0.8],
            [0.3, 0.4]  // This row should get -1 (unassigned)
        ];
        const result = solveAssignment(scoreMatrix);

        // 3 rows, 2 columns -> one row must be unassigned (-1)
        expect(result.length).toBe(3);
        expect(result.filter(r => r === -1).length).toBe(1);

        // The assigned ones should not conflict
        const assigned = result.filter(r => r >= 0);
        expect(new Set(assigned).size).toBe(assigned.length);
    });

    it('handles more columns than rows (more members than names)', () => {
        const scoreMatrix = [
            [0.9, 0.1, 0.5],
            [0.2, 0.8, 0.3]
        ];
        const result = solveAssignment(scoreMatrix);

        // 2 rows, 3 columns -> all rows should be assigned
        expect(result.length).toBe(2);
        expect(result.every(r => r >= 0 && r < 3)).toBe(true);
        expect(result[0]).not.toBe(result[1]);
    });

    it('handles single row', () => {
        const scoreMatrix = [[0.5, 0.8, 0.3]];
        const result = solveAssignment(scoreMatrix);

        // Should pick highest score (column 1)
        expect(result).toEqual([1]);
    });

    it('handles single column', () => {
        const scoreMatrix = [[0.5], [0.8], [0.3]];
        const result = solveAssignment(scoreMatrix);

        // Only one column available, highest scoring row should get it
        expect(result.length).toBe(3);
        expect(result.filter(r => r === 0).length).toBe(1);
        expect(result.filter(r => r === -1).length).toBe(2);
    });
});

// ============================================================================
// TESTS: solveAssignment - Real-world Scenarios
// ============================================================================

describe('solveAssignment - name matching scenarios', () => {
    it('prevents duplicate member assignment', () => {
        // Scenario: "MENSAH JOHN" and "MENSAH KOFI" both score high on "John Mensah"
        const scoreMatrix = [
            [0.85, 0.40],  // MENSAH JOHN: John Mensah (0.85), Kofi Mensah (0.40)
            [0.75, 0.90]   // MENSAH KOFI: John Mensah (0.75), Kofi Mensah (0.90)
        ];
        const result = solveAssignment(scoreMatrix);

        // Hungarian should assign: row 0 -> col 0 (John Mensah), row 1 -> col 1 (Kofi Mensah)
        expect(result).toEqual([0, 1]);

        const total = getAssignmentScore(scoreMatrix, result);
        expect(total).toBe(1.75); // 0.85 + 0.90 = optimal
    });

    it('handles low confidence matches', () => {
        const scoreMatrix = [
            [0.3, 0.2],  // Low confidence for both
            [0.2, 0.35]
        ];
        const result = solveAssignment(scoreMatrix);

        // Should still assign, but caller can threshold
        expect(result[0]).not.toBe(result[1]);
    });

    it('handles 31 members (typical tithe book page)', () => {
        const size = 31;
        const scoreMatrix: number[][] = [];

        for (let i = 0; i < size; i++) {
            scoreMatrix[i] = [];
            for (let j = 0; j < size; j++) {
                // High score on diagonal (simulating correct matches)
                scoreMatrix[i][j] = (i === j) ? 0.9 : 0.1 + Math.random() * 0.3;
            }
        }

        const result = solveAssignment(scoreMatrix);

        // Should be 1-to-1 assignment
        expect(result.length).toBe(size);
        expect(new Set(result).size).toBe(size); // All unique
        expect(result.every(r => r >= 0 && r < size)).toBe(true);
    });
});

// ============================================================================
// TESTS: getAssignmentScore
// ============================================================================

describe('getAssignmentScore', () => {
    it('calculates correct total score', () => {
        const scoreMatrix = [
            [0.9, 0.1],
            [0.2, 0.8]
        ];
        const assignment = [0, 1];

        expect(getAssignmentScore(scoreMatrix, assignment)).toBeCloseTo(1.7);
    });

    it('handles unassigned rows (-1)', () => {
        const scoreMatrix = [
            [0.9, 0.1],
            [0.2, 0.8],
            [0.5, 0.6]
        ];
        const assignment = [0, 1, -1];

        // Only count assigned rows
        expect(getAssignmentScore(scoreMatrix, assignment)).toBeCloseTo(1.7);
    });

    it('handles empty assignment', () => {
        expect(getAssignmentScore([], [])).toBe(0);
    });
});
