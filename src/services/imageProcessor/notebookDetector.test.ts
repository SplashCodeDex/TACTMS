/**
 * Tests for notebook detection and extraction
 * @file notebookDetector.test.ts
 */
import { describe, it, expect } from "vitest";
import { cleanNotebookAmount } from "@/utils/stringUtils";

// ============================================================================
// CLEAN NOTEBOOK AMOUNT TESTS
// ============================================================================

describe("cleanNotebookAmount", () => {
    describe("w notation handling", () => {
        it("converts '10.w' to 1000", () => {
            expect(cleanNotebookAmount("10.w")).toBe(1000);
        });

        it("converts '5.w' to 500", () => {
            expect(cleanNotebookAmount("5.w")).toBe(500);
        });

        it("converts '100.w' to 10000", () => {
            expect(cleanNotebookAmount("100.w")).toBe(10000);
        });

        it("converts '20.w' to 2000", () => {
            expect(cleanNotebookAmount("20.w")).toBe(2000);
        });

        it("handles uppercase 'W'", () => {
            expect(cleanNotebookAmount("10.W")).toBe(1000);
            expect(cleanNotebookAmount("5.W")).toBe(500);
        });

        it("handles 'w' without dot", () => {
            expect(cleanNotebookAmount("10w")).toBe(1000);
            expect(cleanNotebookAmount("5w")).toBe(500);
        });

        it("handles space before w", () => {
            expect(cleanNotebookAmount("10 w")).toBe(1000);
        });

        it("handles colon before w", () => {
            expect(cleanNotebookAmount("10:w")).toBe(1000);
        });
    });

    describe("standard amount handling", () => {
        it("passes through regular numbers", () => {
            expect(cleanNotebookAmount("100")).toBe(100);
            expect(cleanNotebookAmount("50")).toBe(50);
            expect(cleanNotebookAmount("10")).toBe(10);
        });

        it("handles number type input", () => {
            expect(cleanNotebookAmount(100)).toBe(100);
            expect(cleanNotebookAmount(50)).toBe(50);
        });

        it("handles empty string as 0", () => {
            expect(cleanNotebookAmount("")).toBe(0);
        });

        it("handles null/undefined as 0", () => {
            expect(cleanNotebookAmount(null)).toBe(0);
            expect(cleanNotebookAmount(undefined)).toBe(0);
        });

        it("handles dashes as 0", () => {
            expect(cleanNotebookAmount("-")).toBe(0);
            expect(cleanNotebookAmount("--")).toBe(0);
        });
    });

    describe("OCR fallback", () => {
        it("falls back to cleanOCRAmount for non-w patterns", () => {
            // These should use standard OCR cleaning
            expect(cleanNotebookAmount("1oo")).toBe(100); // o→0
            expect(cleanNotebookAmount("5l")).toBe(51);   // l→1
        });
    });
});
