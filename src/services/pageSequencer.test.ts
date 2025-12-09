/**
 * Tests for Page Sequencer Service
 * @file pageSequencer.test.ts
 */
import { describe, it, expect } from "vitest";
import {
    analyzePageInfo,
    sequencePages,
    detectDuplicatePages,
    mergeDuplicateExtractions,
    SET_SIZE,
    getSetNumber,
    getSetRange,
    detectAmountDiscrepancies,
} from "./pageSequencer";
import { TitheRecordB } from "../types";


// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Create a mock TitheRecordB entry
 */
const createMockEntry = (
    no: number,
    name: string,
    amount: number = 0,
    confidence: number = 0.5
): TitheRecordB => ({
    "No.": no,
    "Transaction Type": "Individual Tithe-[Income]",
    "Payment Source Type": "Registered Member",
    "Membership Number": name,
    "Transaction Date ('DD-MMM-YYYY')": "01-Dec-2025",
    "Currency": "GHS",
    "Exchange Rate": 1,
    "Payment Method": "Cash",
    "Transaction Amount": amount,
    "Narration/Description": "Tithe for 01-Dec-2025",
    "Confidence": confidence,
});

/**
 * Create a mock page (SET) with sequential entries
 */
const createMockPage = (
    startNo: number,
    count: number,
    namePrefix: string = "Member"
): TitheRecordB[] => {
    return Array.from({ length: count }, (_, i) =>
        createMockEntry(startNo + i, `${namePrefix} ${startNo + i}`, 10 * (i + 1))
    );
};

// ============================================================================
// analyzePageInfo TESTS
// ============================================================================

describe("analyzePageInfo", () => {
    it("returns correct info for empty entries", () => {
        const result = analyzePageInfo([]);
        expect(result.pageNumber).toBeNull();
        expect(result.startingNo).toBe(0);
        expect(result.endingNo).toBe(0);
        expect(result.entryCount).toBe(0);
    });

    it("detects correct range for SET1 (1-31)", () => {
        const entries = createMockPage(1, 31);
        const result = analyzePageInfo(entries);

        expect(result.startingNo).toBe(1);
        expect(result.endingNo).toBe(31);
        expect(result.entryCount).toBe(31);
    });

    it("detects correct range for SET2 (32-62)", () => {
        const entries = createMockPage(32, 31);
        const result = analyzePageInfo(entries);

        expect(result.startingNo).toBe(32);
        expect(result.endingNo).toBe(62);
        expect(result.entryCount).toBe(31);
    });

    it("handles partial page extractions", () => {
        const entries = createMockPage(5, 10); // Only members 5-14
        const result = analyzePageInfo(entries);

        expect(result.startingNo).toBe(5);
        expect(result.endingNo).toBe(14);
        expect(result.entryCount).toBe(10);
    });

    it("handles unsorted entry numbers", () => {
        const entries = [
            createMockEntry(5, "Member 5"),
            createMockEntry(3, "Member 3"),
            createMockEntry(7, "Member 7"),
            createMockEntry(1, "Member 1"),
        ];
        const result = analyzePageInfo(entries);

        expect(result.startingNo).toBe(1);
        expect(result.endingNo).toBe(7);
    });
});

// ============================================================================
// sequencePages TESTS
// ============================================================================

describe("sequencePages", () => {
    it("returns empty result for no extractions", () => {
        const result = sequencePages([]);

        expect(result.merged).toEqual([]);
        expect(result.pageOrder).toEqual([]);
        expect(result.confidence).toBe(0);
    });

    it("returns single page unchanged", () => {
        const page1 = createMockPage(1, 10);
        const result = sequencePages([page1]);

        expect(result.merged.length).toBe(10);
        expect(result.pageOrder).toEqual([0]);
        expect(result.duplicatesRemoved).toBe(0);
        expect(result.confidence).toBe(1);
    });

    it("sequences two pages correctly by starting number", () => {
        const page1 = createMockPage(1, 5); // Members 1-5
        const page2 = createMockPage(6, 5); // Members 6-10

        // Pass in wrong order
        const result = sequencePages([page2, page1]);

        expect(result.merged.length).toBe(10);
        expect(result.pageOrder).toEqual([1, 0]); // page1 first, then page2

        // Verify ordering
        const firstMember = result.merged[0]["No."];
        expect(firstMember).toBe(1);
    });

    it("sequences three SETs (31 members each) correctly", () => {
        const set1 = createMockPage(1, 31, "SET1-Member");
        const set2 = createMockPage(32, 31, "SET2-Member");
        const set3 = createMockPage(63, 31, "SET3-Member");

        // Pass in scrambled order
        const result = sequencePages([set3, set1, set2]);

        expect(result.merged.length).toBe(93);
        expect(result.pageOrder).toEqual([1, 2, 0]); // set1(idx=1), set2(idx=2), set3(idx=0)
    });

    it("removes duplicates when same member appears in multiple extractions", () => {
        const page1 = createMockPage(1, 5);
        const page2 = [
            createMockEntry(4, "Member 4", 50, 0.9), // Duplicate with higher amount
            createMockEntry(5, "Member 5", 60, 0.8), // Duplicate
            createMockEntry(6, "Member 6", 70),
        ];

        const result = sequencePages([page1, page2]);

        expect(result.duplicatesRemoved).toBe(2);
        expect(result.merged.length).toBe(6); // 5 + 3 - 2 duplicates
    });

    it("detects gaps in member numbering (>5)", () => {
        const page1 = createMockPage(1, 5); // Members 1-5
        const page2 = createMockPage(15, 5); // Members 15-19 (gap of 9)

        const result = sequencePages([page1, page2]);

        expect(result.gapsDetected.length).toBeGreaterThan(0);
        expect(result.gapsDetected).toContain(5); // Gap after member 5
    });

    it("does not detect small gaps (<=5)", () => {
        const page1 = createMockPage(1, 5); // Members 1-5
        const page2 = createMockPage(8, 5); // Members 8-12 (gap of 2)

        const result = sequencePages([page1, page2]);

        expect(result.gapsDetected.length).toBe(0);
    });
});

// ============================================================================
// detectDuplicatePages TESTS
// ============================================================================

describe("detectDuplicatePages", () => {
    it("returns empty groups for single extraction", () => {
        const page1 = createMockPage(1, 10);
        const result = detectDuplicatePages([page1]);

        expect(result.duplicateGroups).toEqual([]);
        expect(result.unique).toEqual([0]);
    });

    it("detects two identical pages as duplicates", () => {
        const page1 = createMockPage(1, 10, "Member");
        const page2 = createMockPage(1, 10, "Member"); // Same data

        const result = detectDuplicatePages([page1, page2]);

        expect(result.duplicateGroups.length).toBe(1);
        expect(result.duplicateGroups[0]).toContain(0);
        expect(result.duplicateGroups[0]).toContain(1);
    });

    it("identifies unique pages from different SETs", () => {
        const set1 = createMockPage(1, 10, "SET1-Member");
        const set2 = createMockPage(32, 10, "SET2-Member");

        const result = detectDuplicatePages([set1, set2]);

        expect(result.duplicateGroups.length).toBe(0);
        expect(result.unique.length).toBe(2);
    });

    it("handles mixed unique and duplicate pages", () => {
        const page1 = createMockPage(1, 10, "Member");
        const page1Dup = createMockPage(1, 10, "Member"); // Duplicate of page1
        const page2 = createMockPage(32, 10, "SET2-Member"); // Unique

        const result = detectDuplicatePages([page1, page1Dup, page2]);

        expect(result.duplicateGroups.length).toBe(1);
        expect(result.duplicateGroups[0]).toContain(0);
        expect(result.duplicateGroups[0]).toContain(1);
        expect(result.unique).toContain(2);
    });

    it("detects pages with slight OCR variations as duplicates", () => {
        const page1 = [
            createMockEntry(1, "MENSAH KOFI AGYEMAN"),
            createMockEntry(2, "OWUSU AMA"),
            createMockEntry(3, "ASANTE KWAME"),
        ];
        const page2 = [
            createMockEntry(1, "MENSAH K0FI AGYEMAN"), // OCR error: 0 instead of O
            createMockEntry(2, "OWUSU AMA"),
            createMockEntry(3, "ASANTE KWARNE"), // OCR error: R instead of M
        ];

        const result = detectDuplicatePages([page1, page2]);

        // Should detect as duplicates due to similar names and same starting No.
        expect(result.duplicateGroups.length).toBe(1);
    });
});

// ============================================================================
// mergeDuplicateExtractions TESTS
// ============================================================================

describe("mergeDuplicateExtractions", () => {
    it("returns empty array for empty group", () => {
        const result = mergeDuplicateExtractions([], []);
        expect(result).toEqual([]);
    });

    it("returns single extraction unchanged", () => {
        const page1 = createMockPage(1, 5);
        const result = mergeDuplicateExtractions([page1], [0]);

        expect(result.length).toBe(5);
        expect(result).toEqual(page1);
    });

    it("uses extraction with most entries as base", () => {
        const page1 = createMockPage(1, 3); // 3 entries
        const page2 = createMockPage(1, 5); // 5 entries

        const result = mergeDuplicateExtractions([page1, page2], [0, 1]);

        expect(result.length).toBe(5); // Takes the longer one
    });

    it("averages confidence from duplicate extractions", () => {
        const page1 = [createMockEntry(1, "Member 1", 10, 0.6)];
        const page2 = [createMockEntry(1, "Member 1", 10, 0.8)];

        const result = mergeDuplicateExtractions([page1, page2], [0, 1]);

        expect(result[0].Confidence).toBeCloseTo(0.7, 1); // Average of 0.6 and 0.8
    });

    it("handles entries with no matching duplicates using distinct names", () => {
        // Use very different names to ensure no fuzzy match
        const page1 = [
            createMockEntry(1, "MENSAH KOFI AGYEMAN", 10, 0.5),
            createMockEntry(2, "OWUSU ABENA SERWAA", 20, 0.5),
        ];
        const page2 = [
            createMockEntry(1, "MENSAH KOFI AGYEMAN", 10, 0.9), // Exact match
            // No entry for OWUSU ABENA SERWAA
        ];

        const result = mergeDuplicateExtractions([page1, page2], [0, 1]);

        expect(result.length).toBe(2);
        expect(result[0].Confidence).toBeCloseTo(0.7, 1); // Averaged (0.5 + 0.9) / 2
        expect(result[1].Confidence).toBe(0.5); // Unchanged - no match found
    });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("pageSequencer integration", () => {
    it("handles realistic 3-image batch scenario from WhyThisApp.md", () => {
        // Scenario: Assembly with 93 members in 3 SETs
        // Image1: Page 9 (SET1: members 1-31)
        // Image2: Page 11 (SET2: members 32-62)
        // Image3: Page 12 (SET3: members 63-93)

        const set1 = createMockPage(1, 31, "SET1");
        const set2 = createMockPage(32, 31, "SET2");
        const set3 = createMockPage(63, 31, "SET3");

        // Simulate extraction order might not match page order
        const extractions = [set2, set3, set1]; // Wrong order

        const result = sequencePages(extractions);

        expect(result.merged.length).toBe(93);
        expect(result.gapsDetected.length).toBe(0);
        expect(result.confidence).toBeGreaterThan(0.7);

        // Verify correct sequencing
        expect(result.merged[0]["No."]).toBe(1);
        expect(result.merged[30]["No."]).toBe(31);
        expect(result.merged[31]["No."]).toBe(32);
        expect(result.merged[92]["No."]).toBe(93);
    });

    it("handles duplicate image uploads with cross-validation", () => {
        // User accidentally uploads same page twice
        const page1 = createMockPage(1, 10);
        const page1Dup = createMockPage(1, 10); // Duplicate
        const page2 = createMockPage(11, 10); // Different page

        // First detect duplicates
        const dupResult = detectDuplicatePages([page1, page1Dup, page2]);
        expect(dupResult.duplicateGroups.length).toBe(1);

        // Merge duplicates
        const merged = mergeDuplicateExtractions([page1, page1Dup, page2], dupResult.duplicateGroups[0]);
        expect(merged.length).toBe(10);

        // Sequence remaining
        const remaining = [merged, page2];
        const seqResult = sequencePages(remaining);

        expect(seqResult.merged.length).toBe(20);
    });
});

// ============================================================================
// SET DETECTION TESTS (Per WhyThisApp.md lines 16-21)
// ============================================================================

describe("SET detection functions", () => {
    describe("SET_SIZE constant", () => {
        it("is 31 per WhyThisApp.md", () => {
            expect(SET_SIZE).toBe(31);
        });
    });

    describe("getSetNumber", () => {
        it("returns 1 for members 1-31", () => {
            expect(getSetNumber(1)).toBe(1);
            expect(getSetNumber(15)).toBe(1);
            expect(getSetNumber(31)).toBe(1);
        });

        it("returns 2 for members 32-62", () => {
            expect(getSetNumber(32)).toBe(2);
            expect(getSetNumber(45)).toBe(2);
            expect(getSetNumber(62)).toBe(2);
        });

        it("returns 3 for members 63-93", () => {
            expect(getSetNumber(63)).toBe(3);
            expect(getSetNumber(80)).toBe(3);
            expect(getSetNumber(93)).toBe(3);
        });

        it("returns 0 for invalid member numbers", () => {
            expect(getSetNumber(0)).toBe(0);
            expect(getSetNumber(-1)).toBe(0);
        });
    });

    describe("getSetRange", () => {
        it("returns 1-31 for SET 1", () => {
            const range = getSetRange(1);
            expect(range.start).toBe(1);
            expect(range.end).toBe(31);
        });

        it("returns 32-62 for SET 2", () => {
            const range = getSetRange(2);
            expect(range.start).toBe(32);
            expect(range.end).toBe(62);
        });

        it("returns 63-93 for SET 3", () => {
            const range = getSetRange(3);
            expect(range.start).toBe(63);
            expect(range.end).toBe(93);
        });

        it("returns 0-0 for invalid SET numbers", () => {
            const range = getSetRange(0);
            expect(range.start).toBe(0);
            expect(range.end).toBe(0);
        });
    });

    describe("analyzePageInfo SET data", () => {
        it("identifies SET number from starting member", () => {
            const entries = createMockPage(32, 10); // Members 32-41
            const result = analyzePageInfo(entries);

            expect(result.setNumber).toBe(2);
        });

        it("calculates SET coverage correctly", () => {
            const entries = createMockPage(1, 31); // Full SET 1
            const result = analyzePageInfo(entries);

            expect(result.setCoverage).toBe(100);
        });

        it("calculates partial SET coverage", () => {
            const entries = createMockPage(1, 15); // About half of SET 1
            const result = analyzePageInfo(entries);

            expect(result.setCoverage).toBeCloseTo(48, 0); // 15/31 ≈ 48%
        });
    });
});

// ============================================================================
// AMOUNT DISCREPANCY DETECTION TESTS (Per WhyThisApp.md line 79)
// ============================================================================

describe("detectAmountDiscrepancies", () => {
    it("returns empty array for single page", () => {
        const page1 = createMockPage(1, 5);
        const result = detectAmountDiscrepancies([page1], [0]);

        expect(result).toEqual([]);
    });

    it("detects no discrepancies when amounts match", () => {
        const page1 = [
            createMockEntry(1, "Member 1", 100),
            createMockEntry(2, "Member 2", 50),
        ];
        const page2 = [
            createMockEntry(1, "Member 1", 100), // Same amount
            createMockEntry(2, "Member 2", 50),  // Same amount
        ];

        const result = detectAmountDiscrepancies([page1, page2], [0, 1]);

        expect(result.length).toBe(0);
    });

    it("detects discrepancies when amounts differ", () => {
        const page1 = [
            createMockEntry(1, "Member 1", 100),
            createMockEntry(2, "Member 2", 50),
        ];
        const page2 = [
            createMockEntry(1, "Member 1", 150), // Different!
            createMockEntry(2, "Member 2", 50),  // Same
        ];

        const result = detectAmountDiscrepancies([page1, page2], [0, 1]);

        expect(result.length).toBe(1);
        expect(result[0].memberNo).toBe(1);
        expect(result[0].amounts).toContain(100);
        expect(result[0].amounts).toContain(150);
    });

    it("suggests most common amount when majority agrees", () => {
        const page1 = [createMockEntry(1, "Member 1", 100)];
        const page2 = [createMockEntry(1, "Member 1", 100)];
        const page3 = [createMockEntry(1, "Member 1", 150)]; // Outlier

        const result = detectAmountDiscrepancies([page1, page2, page3], [0, 1, 2]);

        expect(result.length).toBe(1);
        expect(result[0].suggestedAmount).toBe(100); // Most common
        expect(result[0].confidence).toBeCloseTo(0.67, 1); // 2/3 agreement
    });

    it("provides human-readable message", () => {
        const page1 = [createMockEntry(5, "Test Member", 100)];
        const page2 = [createMockEntry(5, "Test Member", 200)];

        const result = detectAmountDiscrepancies([page1, page2], [0, 1]);

        expect(result[0].message).toContain("Member #5");
        expect(result[0].message).toContain("100");
        expect(result[0].message).toContain("200");
    });
});
