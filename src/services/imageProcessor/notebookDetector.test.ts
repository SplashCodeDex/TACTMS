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
    describe("w notation handling - 'w' = '00' after decimal (e.g., 10.w = 10.00 = 10)", () => {
        it("converts '10.w' to 10 (meaning 10.00 cedis)", () => {
            expect(cleanNotebookAmount("10.w")).toBe(10);
        });

        it("converts '5.w' to 5 (meaning 5.00 cedis)", () => {
            expect(cleanNotebookAmount("5.w")).toBe(5);
        });

        it("converts '100.w' to 100 (meaning 100.00 cedis)", () => {
            expect(cleanNotebookAmount("100.w")).toBe(100);
        });

        it("converts '20.w' to 20 (meaning 20.00 cedis)", () => {
            expect(cleanNotebookAmount("20.w")).toBe(20);
        });

        it("handles uppercase 'W'", () => {
            expect(cleanNotebookAmount("10.W")).toBe(10);
            expect(cleanNotebookAmount("5.W")).toBe(5);
        });

        it("handles 'w' without dot", () => {
            expect(cleanNotebookAmount("10w")).toBe(10);
            expect(cleanNotebookAmount("5w")).toBe(5);
        });

        it("handles space before w", () => {
            expect(cleanNotebookAmount("10 w")).toBe(10);
        });

        it("handles colon before w", () => {
            expect(cleanNotebookAmount("10:w")).toBe(10);
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
