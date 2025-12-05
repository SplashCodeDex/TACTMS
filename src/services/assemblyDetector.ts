/**
 * Assembly Detector Service
 * Uses fuzzy name matching to detect which assembly a set of names belongs to
 */

import { MemberDatabase, MemberRecordA } from "../types";
import { getOCRAwareSimilarity, getTokenSimilarity } from "../utils/stringUtils";

export interface AssemblyDetectionResult {
    assemblyName: string;
    confidence: number;
    matchedMembers: number;
    totalNamesChecked: number;
}

export interface DetectionSummary {
    topMatch: AssemblyDetectionResult | null;
    allMatches: AssemblyDetectionResult[];
    isConfident: boolean; // True if top match has > 70% confidence
}

/**
 * Detect which assembly a list of names most likely belongs to
 * @param extractedNames Names extracted from tithe book image
 * @param memberDatabase All assemblies' member databases
 * @param sampleSize How many names to check (default: 5 for speed)
 */
export const detectAssemblyFromNames = (
    extractedNames: string[],
    memberDatabase: MemberDatabase,
    sampleSize: number = 5
): DetectionSummary => {
    if (!extractedNames.length || !Object.keys(memberDatabase).length) {
        return { topMatch: null, allMatches: [], isConfident: false };
    }

    // Take first N names as sample
    const namesToCheck = extractedNames.slice(0, sampleSize);
    const results: AssemblyDetectionResult[] = [];

    // Check each assembly
    for (const [assemblyName, masterListData] of Object.entries(memberDatabase)) {
        const members = masterListData.data || [];
        if (members.length === 0) continue;

        let matchedCount = 0;
        let totalScore = 0;

        for (const extractedName of namesToCheck) {
            const bestMatch = findBestMemberMatch(extractedName, members);
            if (bestMatch && bestMatch.score >= 0.7) {
                matchedCount++;
                totalScore += bestMatch.score;
            }
        }

        const confidence = namesToCheck.length > 0
            ? (matchedCount / namesToCheck.length) * (totalScore / Math.max(matchedCount, 1))
            : 0;

        results.push({
            assemblyName,
            confidence,
            matchedMembers: matchedCount,
            totalNamesChecked: namesToCheck.length
        });
    }

    // Sort by confidence descending
    results.sort((a, b) => b.confidence - a.confidence);

    const topMatch = results.length > 0 ? results[0] : null;
    const isConfident = topMatch !== null && topMatch.confidence >= 0.7;

    return {
        topMatch,
        allMatches: results.filter(r => r.confidence > 0),
        isConfident
    };
};

/**
 * Find best matching member for a given name
 */
const findBestMemberMatch = (
    name: string,
    members: MemberRecordA[]
): { member: MemberRecordA; score: number } | null => {
    let bestMatch: { member: MemberRecordA; score: number } | null = null;

    for (const member of members) {
        const firstName = (member["First Name"] || "").trim();
        const surname = (member.Surname || "").trim();
        const otherNames = (member["Other Names"] || "").trim();

        const combinations = [
            `${firstName} ${surname}`,
            `${surname} ${firstName}`,
            `${firstName} ${otherNames} ${surname}`,
            `${surname} ${firstName} ${otherNames}`,
        ];

        for (const combo of combinations) {
            const ocrResult = getOCRAwareSimilarity(name, combo);
            const tokenScore = getTokenSimilarity(name, combo);
            const score = Math.max(ocrResult.score, tokenScore);

            if (score > (bestMatch?.score || 0)) {
                bestMatch = { member, score };
            }
        }
    }

    return bestMatch;
};

/**
 * Quick assembly detection from image extraction results
 * Call this after processTitheImageWithValidation
 */
export const detectAssemblyFromExtraction = (
    entries: Array<{ "Membership Number": string }>,
    memberDatabase: MemberDatabase
): DetectionSummary => {
    // Extract names from the "Membership Number" field (which contains the raw name before reconciliation)
    const names = entries
        .map(e => e["Membership Number"])
        .filter(n => n && typeof n === "string");

    return detectAssemblyFromNames(names, memberDatabase);
};

/**
 * Get confidence badge color based on detection confidence
 */
export const getConfidenceBadgeColor = (confidence: number): string => {
    if (confidence >= 0.85) return "bg-green-100 text-green-800";
    if (confidence >= 0.7) return "bg-blue-100 text-blue-800";
    if (confidence >= 0.5) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
};
