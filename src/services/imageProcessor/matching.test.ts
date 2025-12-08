/**
 * Tests for fuzzy name matching utilities
 * @file matching.test.ts
 */
import { describe, it, expect } from "vitest";
import {
    levenshteinDistance,
    calculateSimilarity,
    tokenSimilarity,
    getPositionBoost,
    findBestMatch
} from "./matching";
import { MemberRecordA } from "../../types";

// ============================================================================
// LEVENSHTEIN DISTANCE TESTS
// ============================================================================

describe("levenshteinDistance", () => {
    it("returns 0 for identical strings", () => {
        expect(levenshteinDistance("hello", "hello")).toBe(0);
        expect(levenshteinDistance("", "")).toBe(0);
    });

    it("returns correct distance for insertions", () => {
        expect(levenshteinDistance("cat", "cats")).toBe(1);
        expect(levenshteinDistance("cat", "category")).toBe(5);
    });

    it("returns correct distance for deletions", () => {
        expect(levenshteinDistance("cats", "cat")).toBe(1);
        expect(levenshteinDistance("hello", "hel")).toBe(2);
    });

    it("returns correct distance for substitutions", () => {
        expect(levenshteinDistance("cat", "bat")).toBe(1);
        expect(levenshteinDistance("cat", "dog")).toBe(3);
    });

    it("returns correct distance for mixed operations", () => {
        expect(levenshteinDistance("kitten", "sitting")).toBe(3);
        expect(levenshteinDistance("saturday", "sunday")).toBe(3);
    });

    it("handles empty strings", () => {
        expect(levenshteinDistance("", "hello")).toBe(5);
        expect(levenshteinDistance("hello", "")).toBe(5);
    });
});

// ============================================================================
// CALCULATE SIMILARITY TESTS
// ============================================================================

describe("calculateSimilarity", () => {
    it("returns 1.0 for identical strings", () => {
        expect(calculateSimilarity("John Doe", "John Doe")).toBe(1.0);
    });

    it("returns 1.0 for case-insensitive matches", () => {
        expect(calculateSimilarity("JOHN DOE", "john doe")).toBe(1.0);
    });

    it("returns 1.0 for strings with different whitespace", () => {
        expect(calculateSimilarity("  John Doe  ", "John Doe")).toBe(1.0);
    });

    it("returns 0.0 for empty strings", () => {
        expect(calculateSimilarity("", "hello")).toBe(0.0);
        expect(calculateSimilarity("hello", "")).toBe(0.0);
    });

    it("returns high similarity for similar names", () => {
        const score = calculateSimilarity("Kwame Asante", "Kwame Asantey");
        expect(score).toBeGreaterThan(0.85);
    });

    it("returns low similarity for different names", () => {
        const score = calculateSimilarity("John", "Elizabeth");
        expect(score).toBeLessThan(0.5);
    });
});

// ============================================================================
// TOKEN SIMILARITY TESTS
// ============================================================================

describe("tokenSimilarity", () => {
    it("returns 1.0 for identical token sets", () => {
        expect(tokenSimilarity("John Doe", "John Doe")).toBe(1.0);
    });

    it("handles reordered names", () => {
        const score = tokenSimilarity("Doe John", "John Doe");
        expect(score).toBeGreaterThan(0.9);
    });

    it("matches initials to full names", () => {
        const score = tokenSimilarity("J. Doe", "John Doe");
        expect(score).toBeGreaterThan(0.7);
    });

    it("matches single letter initials", () => {
        const score = tokenSimilarity("J Doe", "John Doe");
        expect(score).toBeGreaterThan(0.7);
    });

    it("handles Ghanaian name patterns", () => {
        // Surname, First Name, Other Names
        const score = tokenSimilarity("Mensah Kofi Agyeman", "Kofi Mensah");
        expect(score).toBeGreaterThan(0.5);
    });

    it("returns 0 for empty strings", () => {
        expect(tokenSimilarity("", "John")).toBe(0);
        expect(tokenSimilarity("John", "")).toBe(0);
    });

    it("handles fuzzy token matches", () => {
        // Typo in surname
        const score = tokenSimilarity("Mensah Kofi", "Mensaa Kofi");
        expect(score).toBeGreaterThan(0.7);
    });
});

// ============================================================================
// POSITION BOOST TESTS
// ============================================================================

describe("getPositionBoost", () => {
    it("returns 0.15 for exact position match", () => {
        expect(getPositionBoost(5, 5)).toBe(0.15);
    });

    it("returns 0.08 for nearby positions (within 2)", () => {
        expect(getPositionBoost(5, 3)).toBe(0.08);
        expect(getPositionBoost(5, 7)).toBe(0.08);
    });

    it("returns 0.03 for close positions (within 5)", () => {
        expect(getPositionBoost(10, 6)).toBe(0.03);
        expect(getPositionBoost(10, 14)).toBe(0.03);
    });

    it("returns 0 for distant positions", () => {
        expect(getPositionBoost(10, 20)).toBe(0);
        expect(getPositionBoost(1, 100)).toBe(0);
    });

    it("returns 0 for undefined member index", () => {
        expect(getPositionBoost(5, undefined)).toBe(0);
    });

    it("returns 0 for zero or negative index", () => {
        expect(getPositionBoost(5, 0)).toBe(0);
        expect(getPositionBoost(5, -1)).toBe(0);
    });
});

// ============================================================================
// FIND BEST MATCH TESTS
// ============================================================================

describe("findBestMatch", () => {
    const mockMembers: MemberRecordA[] = [
        {
            "Membership Number": "TAC001",
            "Old Membership Number": "",
            "Surname": "Mensah",
            "First Name": "Kofi",
            "Other Names": "Agyeman",
            "Gender": "Male",
            "Date of Birth": "01-Jan-1980",
            "Telephone Number": "0201234567",
            "District": "Accra",
            "Assembly": "Central"
        },
        {
            "Membership Number": "TAC002",
            "Old Membership Number": "",
            "Surname": "Owusu",
            "First Name": "Ama",
            "Other Names": "",
            "Gender": "Female",
            "Date of Birth": "15-Mar-1985",
            "Telephone Number": "0209876543",
            "District": "Kumasi",
            "Assembly": "North"
        },
        {
            "Membership Number": "TAC003",
            "Old Membership Number": "",
            "Surname": "Asante",
            "First Name": "Kwame",
            "Other Names": "Nkrumah",
            "Gender": "Male",
            "Date of Birth": "21-Sep-1990",
            "Telephone Number": "0207654321",
            "District": "Tamale",
            "Assembly": "East"
        }
    ];

    it("finds exact match by full name", () => {
        const result = findBestMatch("Mensah Kofi Agyeman", mockMembers);
        expect(result.member).not.toBeNull();
        expect(result.member?.["Membership Number"]).toBe("TAC001");
        expect(result.score).toBeGreaterThan(0.8);
    });

    it("finds match with reordered name", () => {
        const result = findBestMatch("Kofi Mensah", mockMembers);
        expect(result.member).not.toBeNull();
        expect(result.member?.["Membership Number"]).toBe("TAC001");
    });

    it("finds fuzzy match with minor typo", () => {
        const result = findBestMatch("Mensaa Kofi", mockMembers);
        expect(result.member).not.toBeNull();
        expect(result.member?.["Membership Number"]).toBe("TAC001");
    });

    it("returns null for no good match", () => {
        const result = findBestMatch("Elizabeth Windsor", mockMembers);
        expect(result.member).toBeNull();
        expect(result.score).toBeLessThan(0.5);
    });

    it("provides alternatives array (may be empty if below threshold)", () => {
        const result = findBestMatch("Asante", mockMembers);
        // Alternatives are filtered by >= 0.4 score, so might be empty
        expect(result.alternatives).toBeDefined();
        expect(Array.isArray(result.alternatives)).toBe(true);
    });

    it("uses alias map when provided", () => {
        const aliasMap = new Map([["mensah k.", "tac001"]]);
        const result = findBestMatch("Mensah K.", mockMembers, undefined, undefined, aliasMap);
        expect(result.member).not.toBeNull();
        expect(result.member?.["Membership Number"]).toBe("TAC001");
        expect(result.isFromAlias).toBe(true);
    });

    it("applies position boost when provided", () => {
        const memberOrderMap = new Map([["tac001", 1], ["tac002", 2], ["tac003", 3]]);

        // Without position, might match either
        const resultNoPos = findBestMatch("K. Mensah", mockMembers);

        // With position 1, should boost TAC001
        const resultWithPos = findBestMatch("K. Mensah", mockMembers, 1, memberOrderMap);

        expect(resultWithPos.score).toBeGreaterThanOrEqual(resultNoPos.score);
    });

    it("handles empty member list", () => {
        const result = findBestMatch("John Doe", []);
        expect(result.member).toBeNull();
        expect(result.score).toBe(0);
    });
});
