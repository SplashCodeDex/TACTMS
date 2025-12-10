/**
 * Fuzzy name matching utilities
 * Extracted from imageProcessor.ts for reusability
 */
import { MemberRecordA } from "../../types";
import { ScoredMember, MatchResult } from "./types";

// ============================================================================
// STRING SIMILARITY ALGORITHMS
// ============================================================================

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j - 1] + 1,
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1
                );
            }
        }
    }
    return dp[m][n];
}

/**
 * Calculate similarity score between 0 and 1
 */
export function calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    const distance = levenshteinDistance(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);
    return 1 - (distance / maxLen);
}

/**
 * Token-based similarity scoring
 * Splits names into tokens and scores based on overlap
 * Handles initials like "J." matching "John"
 */
export function tokenSimilarity(str1: string, str2: string): number {
    const tokens1 = str1.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    const tokens2 = str2.toLowerCase().split(/\s+/).filter(t => t.length > 0);

    if (tokens1.length === 0 || tokens2.length === 0) return 0;

    let matches = 0;
    const usedTokens = new Set<number>();

    for (const t1 of tokens1) {
        const isInitial = t1.length <= 2 && (t1.endsWith('.') || t1.length === 1);
        const cleanT1 = t1.replace('.', '');

        let bestTokenMatch = 0;
        let bestTokenIndex = -1;

        for (let i = 0; i < tokens2.length; i++) {
            if (usedTokens.has(i)) continue;

            const t2 = tokens2[i];

            // Exact match
            if (cleanT1 === t2.replace('.', '')) {
                if (1.0 > bestTokenMatch) {
                    bestTokenMatch = 1.0;
                    bestTokenIndex = i;
                }
            }
            // Initial matches start of token (J → John)
            else if (isInitial && t2.startsWith(cleanT1)) {
                if (0.7 > bestTokenMatch) {
                    bestTokenMatch = 0.7;
                    bestTokenIndex = i;
                }
            }
            // Fuzzy match for similar tokens
            else {
                const sim = calculateSimilarity(cleanT1, t2);
                if (sim > 0.75 && sim > bestTokenMatch) {
                    bestTokenMatch = sim * 0.9;
                    bestTokenIndex = i;
                }
            }
        }

        if (bestTokenIndex >= 0) {
            matches += bestTokenMatch;
            usedTokens.add(bestTokenIndex);
        }
    }

    return matches / Math.max(tokens1.length, tokens2.length);
}

// ============================================================================
// POSITIONAL MATCHING
// ============================================================================

/**
 * Positional boost for members near the extracted position
 * Members closer to the expected position get a score boost
 */
export function getPositionBoost(
    extractedPosition: number,
    memberIndex: number | undefined
): number {
    if (!memberIndex || memberIndex <= 0) return 0;

    const distance = Math.abs(extractedPosition - memberIndex);

    if (distance === 0) return 0.15;  // Exact position match
    if (distance <= 2) return 0.08;   // Very close (within 2 positions)
    if (distance <= 5) return 0.03;   // Nearby (within 5 positions)
    return 0;
}

// ============================================================================
// MEMBER MATCHING
// ============================================================================

/**
 * Find best matching member from database based on extracted name
 * Enhanced with token-based matching, positional hints, aliases, and alternatives
 */
export function findBestMatch(
    extractedName: string,
    members: MemberRecordA[],
    extractedPosition?: number,
    memberOrderMap?: Map<string, number>,
    aliasMap?: Map<string, string>
): MatchResult {
    const cleanedExtracted = extractedName.toLowerCase().trim();

    // Check learned aliases FIRST - if we have a known mapping, use it
    if (aliasMap && aliasMap.has(cleanedExtracted)) {
        const aliasedMemberId = aliasMap.get(cleanedExtracted)!;
        const member = members.find(m => {
            const memberId = (m["Membership Number"] || m["Old Membership Number"] || "").toLowerCase();
            return memberId === aliasedMemberId;
        });
        if (member) {
            console.log(`Alias match: "${extractedName}" → "${member["First Name"]} ${member.Surname}"`);
            return {
                member,
                score: 0.98,
                alternatives: [],
                isFromAlias: true
            };
        }
    }

    // Score all members (fuzzy matching)
    const scoredMembers: ScoredMember[] = [];

    for (const member of members) {
        // Build various name combinations to match against
        const nameParts = [
            member.Surname,
            member["First Name"],
            member["Other Names"],
        ].filter(Boolean);

        const fullName = nameParts.join(" ").toLowerCase();
        const reverseName = [...nameParts].reverse().join(" ").toLowerCase();
        const surnameFirst = `${member.Surname || ''} ${member["First Name"] || ''}`.toLowerCase().trim();
        const firstSurname = `${member["First Name"] || ''} ${member.Surname || ''}`.toLowerCase().trim();

        // Calculate Levenshtein similarity for each combination
        const levenshteinScores = [
            calculateSimilarity(cleanedExtracted, fullName),
            calculateSimilarity(cleanedExtracted, reverseName),
            calculateSimilarity(cleanedExtracted, surnameFirst),
            calculateSimilarity(cleanedExtracted, firstSurname),
        ];
        const bestLevenshtein = Math.max(...levenshteinScores);

        // Calculate token-based similarity
        const tokenScores = [
            tokenSimilarity(cleanedExtracted, fullName),
            tokenSimilarity(cleanedExtracted, surnameFirst),
            tokenSimilarity(cleanedExtracted, firstSurname),
        ];
        const bestToken = Math.max(...tokenScores);

        // Get positional boost if available
        let positionBoost = 0;
        if (extractedPosition && memberOrderMap) {
            const memberId = (member["Membership Number"] || member["Old Membership Number"] || "").toLowerCase();
            const memberPosition = memberOrderMap.get(memberId);
            positionBoost = getPositionBoost(extractedPosition, memberPosition);
        }

        // Weighted final score: 55% Levenshtein + 35% Token + 10% Position
        const finalScore = (bestLevenshtein * 0.55) + (bestToken * 0.35) + positionBoost;

        scoredMembers.push({ member, score: finalScore });
    }

    // Sort by score descending
    scoredMembers.sort((a, b) => b.score - a.score);

    // Get top match and alternatives
    const bestMatch = scoredMembers[0];
    const alternatives = scoredMembers.slice(1, 4);

    // Threshold: only return match if score is decent
    return {
        member: bestMatch && bestMatch.score >= 0.5 ? bestMatch.member : null,
        score: bestMatch?.score || 0,
        alternatives: alternatives.filter(a => a.score >= 0.4)
    };
}

// ============================================================================
// OPTIMAL ASSIGNMENT (HUNGARIAN ALGORITHM)
// ============================================================================

import { solveAssignment } from "@/lib/hungarian";

/**
 * Input for optimal matching
 */
export interface ExtractedNameInput {
    name: string;
    position: number;
}

/**
 * Result of optimal matching for a single extracted name
 */
export interface OptimalMatchResult {
    extractedName: string;
    position: number;
    matchedMember: MemberRecordA | null;
    confidence: number;
    alternatives: ScoredMember[];
}

/**
 * Find optimal 1-to-1 matches between extracted names and database members
 * Uses Hungarian algorithm for global optimal assignment (no duplicates)
 *
 * @param extractedNames - Array of extracted names with positions
 * @param members - Database members to match against
 * @param memberOrderMap - Optional position hints from existing order
 * @param aliasMap - Optional learned aliases
 * @returns Array of optimal matches
 */
export function findOptimalMatches(
    extractedNames: ExtractedNameInput[],
    members: MemberRecordA[],
    memberOrderMap?: Map<string, number>,
    aliasMap?: Map<string, string>
): OptimalMatchResult[] {
    if (extractedNames.length === 0 || members.length === 0) {
        return extractedNames.map(en => ({
            extractedName: en.name,
            position: en.position,
            matchedMember: null,
            confidence: 0,
            alternatives: []
        }));
    }

    // First, check for alias matches (these are 100% certain, skip Hungarian)
    const aliasMatches = new Map<number, { member: MemberRecordA; name: string }>();
    const remainingExtracted: { name: string; position: number; originalIndex: number }[] = [];

    for (let i = 0; i < extractedNames.length; i++) {
        const en = extractedNames[i];
        const cleanedName = en.name.toLowerCase().trim();

        if (aliasMap?.has(cleanedName)) {
            const aliasedMemberId = aliasMap.get(cleanedName)!;
            const member = members.find(m => {
                const memberId = (m["Membership Number"] || m["Old Membership Number"] || "").toLowerCase();
                return memberId === aliasedMemberId;
            });
            if (member) {
                aliasMatches.set(i, { member, name: en.name });
                continue;
            }
        }
        remainingExtracted.push({ ...en, originalIndex: i });
    }

    // Get members not already matched by alias
    const aliasMatchedMemberIds = new Set(
        Array.from(aliasMatches.values()).map(m =>
            (m.member["Membership Number"] || m.member["Old Membership Number"] || "").toLowerCase()
        )
    );
    const remainingMembers = members.filter(m => {
        const id = (m["Membership Number"] || m["Old Membership Number"] || "").toLowerCase();
        return !aliasMatchedMemberIds.has(id);
    });

    // Build score matrix for remaining names × remaining members
    const scoreMatrix: number[][] = [];
    const memberScores: Map<number, ScoredMember[]> = new Map(); // For alternatives

    for (let i = 0; i < remainingExtracted.length; i++) {
        const en = remainingExtracted[i];
        const cleanedExtracted = en.name.toLowerCase().trim();
        scoreMatrix[i] = [];
        const rowScores: ScoredMember[] = [];

        for (let j = 0; j < remainingMembers.length; j++) {
            const member = remainingMembers[j];
            const score = computeMemberScore(cleanedExtracted, member, en.position, memberOrderMap);
            scoreMatrix[i][j] = score;
            rowScores.push({ member, score });
        }

        // Sort for alternatives
        rowScores.sort((a, b) => b.score - a.score);
        memberScores.set(i, rowScores);
    }

    // Run Hungarian algorithm
    const assignment = solveAssignment(scoreMatrix);

    // Build results
    const results: OptimalMatchResult[] = new Array(extractedNames.length);

    // Add alias matches first (highest confidence)
    for (const [originalIndex, match] of aliasMatches) {
        results[originalIndex] = {
            extractedName: match.name,
            position: extractedNames[originalIndex].position,
            matchedMember: match.member,
            confidence: 0.98, // Alias matches are near-certain
            alternatives: []
        };
    }

    // Add Hungarian matches
    for (let i = 0; i < remainingExtracted.length; i++) {
        const originalIndex = remainingExtracted[i].originalIndex;
        const assignedCol = assignment[i];
        const alternatives = memberScores.get(i) || [];

        if (assignedCol >= 0 && assignedCol < remainingMembers.length) {
            const matchedMember = remainingMembers[assignedCol];
            const confidence = scoreMatrix[i][assignedCol];

            results[originalIndex] = {
                extractedName: remainingExtracted[i].name,
                position: remainingExtracted[i].position,
                matchedMember: confidence >= 0.5 ? matchedMember : null,
                confidence,
                alternatives: alternatives.slice(1, 4).filter(a => a.score >= 0.4)
            };
        } else {
            results[originalIndex] = {
                extractedName: remainingExtracted[i].name,
                position: remainingExtracted[i].position,
                matchedMember: null,
                confidence: 0,
                alternatives: alternatives.slice(0, 3).filter(a => a.score >= 0.4)
            };
        }
    }

    return results;
}

/**
 * Compute score for a single extracted name vs member
 * Enhanced with Ghanaian name utilities for better matching
 */
function computeMemberScore(
    cleanedExtracted: string,
    member: MemberRecordA,
    extractedPosition: number,
    memberOrderMap?: Map<string, number>
): number {
    const nameParts = [
        member.Surname,
        member["First Name"],
        member["Other Names"],
    ].filter(Boolean);

    const fullName = nameParts.join(" ").toLowerCase();
    const reverseName = [...nameParts].reverse().join(" ").toLowerCase();
    const surnameFirst = `${member.Surname || ''} ${member["First Name"] || ''}`.toLowerCase().trim();
    const firstSurname = `${member["First Name"] || ''} ${member.Surname || ''}`.toLowerCase().trim();

    // Strip titles from extracted name for comparison
    const strippedExtracted = stripTitles(cleanedExtracted);

    // Levenshtein similarity (on stripped names)
    const levenshteinScores = [
        calculateSimilarity(strippedExtracted, stripTitles(fullName)),
        calculateSimilarity(strippedExtracted, stripTitles(reverseName)),
        calculateSimilarity(strippedExtracted, stripTitles(surnameFirst)),
        calculateSimilarity(strippedExtracted, stripTitles(firstSurname)),
    ];
    const bestLevenshtein = Math.max(...levenshteinScores);

    // Standard token similarity
    const tokenScores = [
        tokenSimilarity(strippedExtracted, fullName),
        tokenSimilarity(strippedExtracted, surnameFirst),
        tokenSimilarity(strippedExtracted, firstSurname),
    ];
    const bestToken = Math.max(...tokenScores);

    // Ghanaian-enhanced token similarity (handles day names, phonetics)
    const ghanaianScores = [
        ghanaianTokenSimilarity(strippedExtracted, fullName),
        ghanaianTokenSimilarity(strippedExtracted, surnameFirst),
        ghanaianTokenSimilarity(strippedExtracted, firstSurname),
    ];
    const bestGhanaian = Math.max(...ghanaianScores);

    // Surname variant check (e.g., Mensah == Mensa)
    let surnameBoost = 0;
    if (member.Surname) {
        const extractedTokens = tokenizeGhanaianName(strippedExtracted);
        for (const token of extractedTokens) {
            if (areSurnameVariants(token, member.Surname)) {
                surnameBoost = 0.1;
                break;
            }
        }
    }

    // Positional boost
    let positionBoost = 0;
    if (memberOrderMap) {
        const memberId = (member["Membership Number"] || member["Old Membership Number"] || "").toLowerCase();
        const memberPosition = memberOrderMap.get(memberId);
        positionBoost = getPositionBoost(extractedPosition, memberPosition);
    }

    // Weighted score:
    // 40% Levenshtein + 25% Standard Token + 20% Ghanaian Token + 10% Position + 5% Surname variants
    const score = (bestLevenshtein * 0.40)
        + (bestToken * 0.25)
        + (bestGhanaian * 0.20)
        + positionBoost
        + surnameBoost;

    return Math.min(score, 1.0); // Cap at 1.0
}

// Import Ghanaian name utilities
import {
    stripTitles,
    ghanaianTokenSimilarity,
    areSurnameVariants,
    tokenizeGhanaianName
} from "@/lib/ghanaianNames";
