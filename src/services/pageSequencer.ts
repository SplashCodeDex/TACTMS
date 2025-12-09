/**
 * Page Sequencer Service
 * Intelligently sequences and merges multi-page tithe book scans
 *
 * Per WhyThisApp.md lines 16-21:
 * - Each SET contains 31 members (rows 1-31, 32-62, etc.)
 * - Page numbering continues sequentially
 * - The NO column continues from where the previous SET ended
 */

import { TitheRecordB } from "../types";
import { getOCRAwareSimilarity } from "../utils/stringUtils";

// ============================================================================
// SET CONSTANTS AND DETECTION (Per WhyThisApp.md lines 16-21)
// ============================================================================

/** Per WhyThisApp.md: Each SET contains exactly 31 members */
export const SET_SIZE = 31;

/**
 * Determine which SET a member belongs to based on their number.
 * SET1: 1-31, SET2: 32-62, SET3: 63-93, etc.
 *
 * @param memberNo - The member's row number from the tithe book
 * @returns The SET number (1, 2, 3, ...)
 */
export const getSetNumber = (memberNo: number): number => {
    if (memberNo <= 0) return 0;
    return Math.ceil(memberNo / SET_SIZE);
};

/**
 * Get the member number range for a given SET.
 *
 * @param setNumber - The SET number (1, 2, 3, ...)
 * @returns Object with start and end member numbers
 */
export const getSetRange = (setNumber: number): { start: number; end: number } => {
    if (setNumber <= 0) return { start: 0, end: 0 };
    const start = (setNumber - 1) * SET_SIZE + 1;
    const end = setNumber * SET_SIZE;
    return { start, end };
};

// ============================================================================
// PAGE INFO INTERFACES
// ============================================================================

export interface PageInfo {
    pageNumber: number | null;
    startingNo: number;
    endingNo: number;
    entryCount: number;
    entries: TitheRecordB[];
    /** Which SET this page belongs to (1, 2, 3...) */
    setNumber: number;
    /** Percentage of SET covered (0-100) */
    setCoverage: number;
}

export interface SequenceResult {
    merged: TitheRecordB[];
    pageOrder: number[];
    duplicatesRemoved: number;
    gapsDetected: number[];
    confidence: number;
}

/**
 * Analyze a single extraction to determine page info including SET data
 */
export const analyzePageInfo = (entries: TitheRecordB[]): PageInfo => {
    if (entries.length === 0) {
        return {
            pageNumber: null,
            startingNo: 0,
            endingNo: 0,
            entryCount: 0,
            entries,
            setNumber: 0,
            setCoverage: 0
        };
    }

    // Get row numbers
    const rowNumbers = entries
        .map(e => {
            const no = e["No."];
            return typeof no === 'number' ? no : parseInt(String(no)) || 0;
        })
        .filter(n => n > 0)
        .sort((a, b) => a - b);

    const startingNo = rowNumbers[0] || 0;
    const endingNo = rowNumbers[rowNumbers.length - 1] || 0;

    // Determine SET from starting number
    const setNumber = getSetNumber(startingNo);

    // Calculate SET coverage (what % of the 31 members are present)
    let setCoverage = 0;
    if (setNumber > 0) {
        const setRange = getSetRange(setNumber);
        const membersInSet = rowNumbers.filter(n => n >= setRange.start && n <= setRange.end);
        setCoverage = Math.round((membersInSet.length / SET_SIZE) * 100);
    }

    return {
        pageNumber: null, // Will try to detect from extraction metadata
        startingNo,
        endingNo,
        entryCount: entries.length,
        entries,
        setNumber,
        setCoverage
    };
};


/**
 * Sequence multiple page extractions into correct order
 */
export const sequencePages = (
    extractions: TitheRecordB[][]
): SequenceResult => {
    if (extractions.length === 0) {
        return { merged: [], pageOrder: [], duplicatesRemoved: 0, gapsDetected: [], confidence: 0 };
    }

    if (extractions.length === 1) {
        return {
            merged: extractions[0],
            pageOrder: [0],
            duplicatesRemoved: 0,
            gapsDetected: [],
            confidence: 1
        };
    }

    // Analyze each page
    const pages = extractions.map((entries, idx) => ({
        index: idx,
        info: analyzePageInfo(entries)
    }));

    // Sort by starting number
    pages.sort((a, b) => a.info.startingNo - b.info.startingNo);

    // Merge entries, removing duplicates
    const merged: TitheRecordB[] = [];
    const seenNames = new Map<string, TitheRecordB>();
    let duplicatesRemoved = 0;
    const gapsDetected: number[] = [];

    for (const page of pages) {
        for (const entry of page.info.entries) {
            const name = String(entry["Membership Number"]).toLowerCase().trim();
            // const no = typeof entry["No."] === 'number' ? entry["No."] : parseInt(String(entry["No."])) || 0;

            // Check for duplicate
            const existing = seenNames.get(name);
            if (existing) {
                // Keep the one with higher confidence or non-zero amount
                const existingAmount = typeof existing["Transaction Amount"] === 'number'
                    ? existing["Transaction Amount"] : 0;
                const newAmount = typeof entry["Transaction Amount"] === 'number'
                    ? entry["Transaction Amount"] : 0;

                if (newAmount > existingAmount ||
                    (entry.Confidence || 0) > (existing.Confidence || 0)) {
                    // Replace with better entry
                    const idx = merged.findIndex(e =>
                        String(e["Membership Number"]).toLowerCase().trim() === name
                    );
                    if (idx !== -1) {
                        merged[idx] = entry;
                    }
                }
                duplicatesRemoved++;
            } else {
                seenNames.set(name, entry);
                merged.push(entry);
            }
        }
    }

    // Detect gaps in numbering
    const allNumbers = merged
        .map(e => typeof e["No."] === 'number' ? e["No."] : parseInt(String(e["No."])) || 0)
        .filter(n => n > 0)
        .sort((a, b) => a - b);

    for (let i = 1; i < allNumbers.length; i++) {
        const gap = allNumbers[i] - allNumbers[i - 1];
        if (gap > 5) { // Report gaps larger than 5
            gapsDetected.push(allNumbers[i - 1]);
        }
    }

    // Calculate confidence
    const confidence = calculateSequenceConfidence(pages, duplicatesRemoved, gapsDetected.length);

    return {
        merged,
        pageOrder: pages.map(p => p.index),
        duplicatesRemoved,
        gapsDetected,
        confidence
    };
};

/**
 * Detect if multiple extractions are from the same page
 */
export const detectDuplicatePages = (
    extractions: TitheRecordB[][]
): { duplicateGroups: number[][]; unique: number[] } => {
    if (extractions.length < 2) {
        return { duplicateGroups: [], unique: [0] };
    }

    const pages = extractions.map((entries, idx) => ({
        index: idx,
        info: analyzePageInfo(entries),
        firstNames: entries.slice(0, 3).map(e => String(e["Membership Number"]).toLowerCase())
    }));

    const duplicateGroups: number[][] = [];
    const processed = new Set<number>();

    for (let i = 0; i < pages.length; i++) {
        if (processed.has(i)) continue;

        const group = [i];
        for (let j = i + 1; j < pages.length; j++) {
            if (processed.has(j)) continue;

            // Check if pages are duplicates
            if (arePagesEquivalent(pages[i], pages[j])) {
                group.push(j);
                processed.add(j);
            }
        }

        if (group.length > 1) {
            duplicateGroups.push(group);
        }
        processed.add(i);
    }

    const unique = pages
        .map(p => p.index)
        .filter(idx => !duplicateGroups.flat().includes(idx) ||
            duplicateGroups.some(g => g[0] === idx));

    return { duplicateGroups, unique };
};

/**
 * Check if two page extractions are equivalent (same page)
 */
const arePagesEquivalent = (
    page1: { info: PageInfo; firstNames: string[] },
    page2: { info: PageInfo; firstNames: string[] }
): boolean => {
    // Same starting number
    if (page1.info.startingNo !== page2.info.startingNo) return false;

    // Compare first few names
    let matchCount = 0;
    for (const name1 of page1.firstNames) {
        for (const name2 of page2.firstNames) {
            const similarity = getOCRAwareSimilarity(name1, name2);
            if (similarity.score >= 0.8) {
                matchCount++;
                break;
            }
        }
    }

    return matchCount >= 2; // At least 2 matching names
};

/**
 * Calculate confidence score for sequencing
 */
const calculateSequenceConfidence = (
    pages: Array<{ index: number; info: PageInfo }>,
    duplicates: number,
    gaps: number
): number => {
    let confidence = 1.0;

    // Reduce confidence for duplicates
    const duplicateRatio = duplicates / (pages.reduce((sum, p) => sum + p.info.entryCount, 0) || 1);
    confidence -= duplicateRatio * 0.3;

    // Reduce confidence for gaps
    confidence -= gaps * 0.1;

    // Reduce confidence for many pages (more chances for error)
    if (pages.length > 3) {
        confidence -= (pages.length - 3) * 0.05;
    }

    return Math.max(0.3, Math.min(1, confidence));
};

/**
 * Merge duplicate page extractions by averaging confidence
 */
export const mergeDuplicateExtractions = (
    extractions: TitheRecordB[][],
    duplicateGroup: number[]
): TitheRecordB[] => {
    if (duplicateGroup.length === 0) return [];
    if (duplicateGroup.length === 1) return extractions[duplicateGroup[0]];

    // Use the extraction with most entries as base
    const baseIdx = duplicateGroup.reduce((best, idx) =>
        extractions[idx].length > extractions[best].length ? idx : best
        , duplicateGroup[0]);

    const base = extractions[baseIdx];
    const others = duplicateGroup.filter(i => i !== baseIdx).map(i => extractions[i]);

    // Enhance base entries with data from duplicates
    return base.map(entry => {
        const name = String(entry["Membership Number"]).toLowerCase();
        const matches = others.flatMap(ext =>
            ext.filter(e => {
                const otherName = String(e["Membership Number"]).toLowerCase();
                return getOCRAwareSimilarity(name, otherName).score >= 0.8;
            })
        );

        if (matches.length === 0) return entry;

        // Average confidence
        const allConfidences = [entry.Confidence || 0.5, ...matches.map(m => m.Confidence || 0.5)];
        const avgConfidence = allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length;

        return { ...entry, Confidence: avgConfidence };
    });
};

// ============================================================================
// CROSS-VALIDATION: AMOUNT DISCREPANCY DETECTION (Per WhyThisApp.md line 79)
// ============================================================================

/**
 * Report of amount discrepancies found across duplicate images.
 * Per WhyThisApp.md: "The AI will cross-validate the data to boost accuracy
 * if multiple images of the same page is provided"
 */
export interface DiscrepancyReport {
    /** Member's row number in the tithe book */
    memberNo: number;
    /** Member's name/ID */
    memberName: string;
    /** Different amounts found across images */
    amounts: number[];
    /** Suggested correct amount (most common or averaged) */
    suggestedAmount: number;
    /** Confidence in the suggestion (0-1) */
    confidence: number;
    /** Human-readable description of the discrepancy */
    message: string;
}

/**
 * Detect amount discrepancies across duplicate page extractions.
 * When multiple images of the same page are uploaded, compare amounts
 * and flag when they differ beyond a threshold.
 *
 * @param extractions - All page extractions
 * @param duplicateGroup - Indices of pages that are duplicates of each other
 * @returns Array of discrepancy reports for manual review
 */
export const detectAmountDiscrepancies = (
    extractions: TitheRecordB[][],
    duplicateGroup: number[]
): DiscrepancyReport[] => {
    if (duplicateGroup.length < 2) return [];

    const discrepancies: DiscrepancyReport[] = [];
    const baseExtraction = extractions[duplicateGroup[0]];

    // For each entry in the base extraction
    for (const baseEntry of baseExtraction) {
        const memberNo = typeof baseEntry["No."] === 'number'
            ? baseEntry["No."]
            : parseInt(String(baseEntry["No."])) || 0;
        const memberName = String(baseEntry["Membership Number"]);
        const baseAmount = typeof baseEntry["Transaction Amount"] === 'number'
            ? baseEntry["Transaction Amount"]
            : parseFloat(String(baseEntry["Transaction Amount"])) || 0;

        // Collect amounts from all duplicate pages
        const amounts: number[] = [baseAmount];

        for (let i = 1; i < duplicateGroup.length; i++) {
            const otherExtraction = extractions[duplicateGroup[i]];
            const matchingEntry = otherExtraction.find(e => {
                const otherNo = typeof e["No."] === 'number'
                    ? e["No."]
                    : parseInt(String(e["No."])) || 0;
                return otherNo === memberNo;
            });

            if (matchingEntry) {
                const otherAmount = typeof matchingEntry["Transaction Amount"] === 'number'
                    ? matchingEntry["Transaction Amount"]
                    : parseFloat(String(matchingEntry["Transaction Amount"])) || 0;
                amounts.push(otherAmount);
            }
        }

        // Check for discrepancies (amounts differ by more than 10%)
        const uniqueAmounts = [...new Set(amounts)];
        if (uniqueAmounts.length > 1 && amounts.filter(a => a > 0).length > 0) {
            // Calculate suggested amount (most common, or average if no majority)
            const amountCounts = new Map<number, number>();
            for (const amount of amounts) {
                amountCounts.set(amount, (amountCounts.get(amount) || 0) + 1);
            }

            // Find the most common amount
            let suggestedAmount = amounts[0];
            let maxCount = 0;
            for (const [amount, count] of amountCounts) {
                if (count > maxCount) {
                    maxCount = count;
                    suggestedAmount = amount;
                }
            }

            // If no clear winner, use average of non-zero amounts
            if (maxCount === 1) {
                const nonZeroAmounts = amounts.filter(a => a > 0);
                if (nonZeroAmounts.length > 0) {
                    suggestedAmount = Math.round(
                        nonZeroAmounts.reduce((a, b) => a + b, 0) / nonZeroAmounts.length
                    );
                }
            }

            // Calculate confidence based on agreement
            const agreementRatio = maxCount / amounts.length;
            const confidence = agreementRatio;

            discrepancies.push({
                memberNo,
                memberName,
                amounts: uniqueAmounts,
                suggestedAmount,
                confidence,
                message: `Member #${memberNo}: Found different amounts (${uniqueAmounts.join(', ')}). Suggested: ${suggestedAmount}`
            });
        }
    }

    return discrepancies;
};
