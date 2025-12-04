/// <reference types="vitest/globals" />
import {
    validateTitheBookImage,
    validateExtractedTitheData,
    normalizeTitle,
    cleanOCRName,
    TITLE_ALIASES
} from "./imageValidator";

describe("normalizeTitle", () => {
    it("should normalize DCNS to DEACONESS", () => {
        expect(normalizeTitle("DCNS")).toBe("DEACONESS");
        expect(normalizeTitle("Dcns")).toBe("DEACONESS");
        expect(normalizeTitle("dcns")).toBe("DEACONESS");
    });

    it("should normalize ELD to ELDER", () => {
        expect(normalizeTitle("ELD")).toBe("ELDER");
        expect(normalizeTitle("ELDR")).toBe("ELDER");
    });

    it("should normalize PST to PASTOR", () => {
        expect(normalizeTitle("PST")).toBe("PASTOR");
        expect(normalizeTitle("PS")).toBe("PASTOR");
    });

    it("should keep canonical titles unchanged", () => {
        expect(normalizeTitle("DEACONESS")).toBe("DEACONESS");
        expect(normalizeTitle("ELDER")).toBe("ELDER");
        expect(normalizeTitle("PASTOR")).toBe("PASTOR");
    });

    it("should handle empty and unknown titles", () => {
        expect(normalizeTitle("")).toBe("");
        expect(normalizeTitle("UNKNOWN")).toBe("UNKNOWN");
    });

    it("should remove trailing periods", () => {
        expect(normalizeTitle("MR.")).toBe("MR");
        expect(normalizeTitle("MRS.")).toBe("MRS");
    });
});

describe("cleanOCRName", () => {
    it("should remove OCR artifacts", () => {
        // cleanOCRName removes the artifacts, joining adjacent characters
        expect(cleanOCRName("John|Doe")).toBe("JohnDoe");
        expect(cleanOCRName("Jane\\Smith")).toBe("JaneSmith");
    });

    it("should normalize multiple spaces", () => {
        expect(cleanOCRName("John   Doe")).toBe("John Doe");
        expect(cleanOCRName("  Jane  Smith  ")).toBe("Jane Smith");
    });

    it("should remove leading/trailing punctuation", () => {
        expect(cleanOCRName("-John Doe-")).toBe("John Doe");
        expect(cleanOCRName(".Jane Smith.")).toBe("Jane Smith");
    });

    it("should handle empty strings", () => {
        expect(cleanOCRName("")).toBe("");
    });
});

describe("validateExtractedTitheData", () => {
    it("should detect valid tithe data", () => {
        const data = [
            { "No.": 1, Name: "John Doe", Amount: 100, Confidence: 0.95 },
            { "No.": 2, Name: "Jane Smith", Amount: 50, Confidence: 0.85 }
        ];

        const result = validateExtractedTitheData(data);

        expect(result.isValidFormat).toBe(true);
        expect(result.hasNameColumn).toBe(true);
        expect(result.hasAmountData).toBe(true);
        expect(result.rowCount).toBe(2);
        expect(result.confidenceScore).toBeCloseTo(0.9, 1);
    });

    it("should handle empty data", () => {
        const result = validateExtractedTitheData([]);

        expect(result.isValidFormat).toBe(false);
        expect(result.rowCount).toBe(0);
    });

    it("should detect missing amounts", () => {
        const data = [
            { "No.": 1, Name: "John Doe", Amount: 0, Confidence: 0.95 }
        ];

        const result = validateExtractedTitheData(data);

        expect(result.hasAmountData).toBe(false);
        expect(result.hasNameColumn).toBe(true);
    });
});

describe("TITLE_ALIASES", () => {
    it("should have all expected canonical titles", () => {
        expect(TITLE_ALIASES.DEACONESS).toBeDefined();
        expect(TITLE_ALIASES.ELDER).toBeDefined();
        expect(TITLE_ALIASES.PASTOR).toBeDefined();
        expect(TITLE_ALIASES.APOSTLE).toBeDefined();
        expect(TITLE_ALIASES.OVERSEER).toBeDefined();
    });

    it("should have common abbreviations", () => {
        expect(TITLE_ALIASES.DEACONESS).toContain("DCNS");
        expect(TITLE_ALIASES.ELDER).toContain("ELD");
        expect(TITLE_ALIASES.PASTOR).toContain("PST");
    });
});
