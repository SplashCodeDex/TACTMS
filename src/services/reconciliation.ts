import { MemberRecordA, MembershipReconciliationReport, ChangedMemberDetail } from "../types";
import { parseMemberId } from "./titheList";

export const reconcileMembers = (
  newData: MemberRecordA[],
  masterData: MemberRecordA[],
): Omit<MembershipReconciliationReport, "previousFileDate"> => {
  const getMemberId = (m: MemberRecordA) => {
    const rawVal = String(m["Membership Number"] || "").trim();
    return parseMemberId(rawVal);
  };

  const getOldMemberId = (m: MemberRecordA) => {
    const rawVal = String(m["Old Membership Number"] || "").trim();
    return parseMemberId(rawVal);
  };

  const newMembers: MemberRecordA[] = [];
  const changedMembers: ChangedMemberDetail[] = [];
  const conflicts: import("../types").ConflictingMemberDetail[] = [];
  const unidentifiableNewMembers: MemberRecordA[] = [];
  const unidentifiableMasterMembers: MemberRecordA[] = [];

  const matchedMasterRecords = new Set<MemberRecordA>();

  const masterById = new Map<string, MemberRecordA>();
  let maxCustomOrder = 0;

  masterData.forEach((m) => {
    if (m.customOrder && m.customOrder > maxCustomOrder) {
      maxCustomOrder = m.customOrder;
    }

    const currentId = getMemberId(m);
    const oldId = getOldMemberId(m);

    if (currentId) {
      const parts = currentId.split("|").map(p => p.trim()).filter(p => p);
      parts.forEach(part => {
        if (!masterById.has(part)) {
          masterById.set(part, m);
        }
      });
    }

    if (oldId) {
      const parts = oldId.split("|").map(p => p.trim()).filter(p => p);
      parts.forEach(part => {
        if (!masterById.has(part)) {
          masterById.set(part, m);
        }
      });
    }

    if (!currentId && !oldId) {
      unidentifiableMasterMembers.push(m);
    }
  });

  const masterByName = new Map<string, MemberRecordA>();
  masterData.forEach((m) => {
    const nameKey = `${m.Surname || ""}|${m["First Name"] || ""}`.toLowerCase();
    if (m.Surname && m["First Name"]) {
      masterByName.set(nameKey, m);
    }
  });

  let newMemberOrder = maxCustomOrder + 1;

  newData.forEach((newRecord) => {
    const newCurrentId = getMemberId(newRecord);
    const newOldId = getOldMemberId(newRecord);

    let matchedMasterRecord: MemberRecordA | undefined;

    if (newCurrentId) {
      const parts = newCurrentId.split("|").map(p => p.trim()).filter(p => p);
      for (const part of parts) {
        if (masterById.has(part)) {
          matchedMasterRecord = masterById.get(part);
          break;
        }
      }
    }

    if (!matchedMasterRecord && newOldId) {
      const parts = newOldId.split("|").map(p => p.trim()).filter(p => p);
      for (const part of parts) {
        if (masterById.has(part)) {
          matchedMasterRecord = masterById.get(part);
          break;
        }
      }
    }

    if (matchedMasterRecord && matchedMasterRecords.has(matchedMasterRecord)) {
      matchedMasterRecord = undefined;
    }

    if (matchedMasterRecord) {
      matchedMasterRecords.add(matchedMasterRecord);
      const masterId = String(matchedMasterRecord["Membership Number"] || "").trim();

      const changes: { field: string; oldValue: any; newValue: any }[] = [];
      const fieldsToCheck: (keyof MemberRecordA)[] = [
        "First Name",
        "Surname",
        "Other Names",
        "Title",
        "Gender",
        "Marital Status",
        "Type of Marriage",
        "Age",
        "Place of Birth",
        "Hometown",
        "Hometown Region",
        "Nationality",
        "Email",
        "Phone Number",
        "Whatsapp Number",
        "Other Phone Numbers",
        "Postal Address",
        "Residential Address",
        "Zip Code",
        "Digital Address",
        "Baptized By",
        "Place of Baptism",
        "Date of Baptism (DD-MMM-YYYY)",
        "Previous Denomination",
        "Languages Spoken",
        "Spiritual Gifts",
        "Level of Education",
        "Course Studied",
        "Type of Employment",
        "Place of Work",
        "Profession/Occupation",
        "Is Communicant? (Yes/No)",
        "Any Spiritual Gifts? (Yes/No)",
        "Holy Spirit Baptism? (Yes/No)",
        "Water Baptism? (Yes/No)",
        "Right Hand of Fellowship? (Yes/No)",
        "Salaried Staff Ministers (SSNIT Number)",
        "Membership Number",
        "Old Membership Number",
      ];

      fieldsToCheck.forEach((field) => {
        const newVal = String(newRecord[field] || "").trim();
        const oldVal = String(matchedMasterRecord![field] || "").trim();
        if (newVal !== oldVal) {
          changes.push({
            field: String(field),
            oldValue: oldVal,
            newValue: newVal,
          });
        }
      });

      let matchType: 'ID' | 'OldID' = 'ID';
      const currentId = getMemberId(newRecord);
      if (!currentId) {
        matchType = 'OldID';
      } else {
        const parts = currentId.split("|").map(p => p.trim()).filter(p => p);
        const masterCurrentId = String(matchedMasterRecord["Membership Number"] || "").trim();
        let isIdMatch = false;
        if (masterCurrentId) {
          const masterParts = masterCurrentId.split("|").map(p => p.trim());
          if (parts.some(p => masterParts.includes(p))) {
            isIdMatch = true;
          }
        }
        if (!isIdMatch) {
          matchType = 'OldID';
        }
      }

      if (changes.length > 0) {
        changedMembers.push({
          memberId: masterId,
          oldRecord: matchedMasterRecord,
          newRecord: newRecord,
          changes,
          matchType,
        });
      }
    } else {
      const nameKey = `${newRecord.Surname || ""}|${newRecord["First Name"] || ""}`.toLowerCase();
      if (newRecord.Surname && newRecord["First Name"] && masterByName.has(nameKey)) {
        conflicts.push({
          newRecord: newRecord,
          existingMember: masterByName.get(nameKey)!,
        });
      } else {
        if (!newCurrentId && !newOldId) {
          unidentifiableNewMembers.push(newRecord);
        } else {
          newMembers.push({ ...newRecord, customOrder: newMemberOrder++ });
        }
      }
    }
  });

  return {
    newMembers,
    changedMembers,
    conflicts,
    unidentifiableNewMembers,
    unidentifiableMasterMembers,
  };
};

import { getOCRAwareSimilarity, getTokenSimilarity, OCR_CONFIDENCE_TIERS } from "../utils/stringUtils";
import { FuzzyMatchResult } from "../types";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { semanticCache } from "./semanticCache";
import { GEMINI_MODEL_NAME } from "@/constants";
import {
  stripTitles,
  ghanaianTokenSimilarity,
  areSurnameVariants,
  preprocessName
} from "@/lib/ghanaianNames";

/**
 * AI-powered semantic matching for difficult names
 */
const findMemberByAI = async (
  rawName: string,
  candidates: MemberRecordA[],
  apiKey: string
): Promise<FuzzyMatchResult | null> => {
  // Check cache first
  const cached = semanticCache.get(rawName);
  if (cached) {
    if (!cached.matchedMemberId) return null;

    // Find the member object from candidates
    const member = candidates.find(m =>
      String(m["Membership Number"]).includes(cached.matchedMemberId!)
    );

    if (member) {
      return {
        member,
        score: cached.confidence,
        matchedName: cached.rawName, // Use raw name as matched name for AI
        confidenceTier: cached.confidence > 0.8 ? 'high' : 'medium',
        matchSource: 'ai_semantic'
      };
    }
  }

  try {
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: GEMINI_MODEL_NAME });

    // Prepare candidates list for prompt (limit to top 20 to save tokens if list is huge)
    // In practice, we might want to filter candidates first, but for now we send a subset
    const candidateList = candidates.slice(0, 50).map(m => ({
      id: String(m["Membership Number"]),
      name: `${m["First Name"]} ${m.Surname} ${m["Other Names"] || ""}`.trim()
    }));

    const prompt = `
    You are an expert Ghanaian Name Reconciliation Agent.
    Task: Match the handwritten name "${rawName}" to one of the following database members.

    Consider:
    - OCR errors (e.g., '5' vs 'S', '1' vs 'I')
    - Ghanaian nicknames (e.g., Kojo = Cudjoe, Nana = Emmanuel/Samuel)
    - Abbreviations (e.g., 'Bro. J. Addo' = 'Jonathan Addo')
    - Cultural variations

    Candidates:
    ${JSON.stringify(candidateList, null, 2)}

    Output JSON ONLY:
    {
      "matchFound": boolean,
      "memberId": string | null,
      "confidence": number (0-1),
      "reason": string
    }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) return null;

    const response = JSON.parse(jsonMatch[0]);

    if (response.matchFound && response.memberId && response.confidence > 0.6) {
      // Cache the positive result
      semanticCache.set(rawName, response.memberId, response.confidence, GEMINI_MODEL_NAME);

      const member = candidates.find(m => String(m["Membership Number"]) === response.memberId);
      if (member) {
        return {
          member,
          score: response.confidence,
          matchedName: rawName,
          confidenceTier: response.confidence > 0.8 ? 'high' : 'medium',
          matchSource: 'ai_semantic'
        };
      }
    } else {
      // Cache the negative result to avoid re-querying
      semanticCache.set(rawName, null, 0, GEMINI_MODEL_NAME);
    }

  } catch (e) {
    console.warn("AI Semantic Match failed:", e);
  }

  return null;
};

/**
 * Enhanced member matching with two strategies:
 * 1. OCR-normalized Levenshtein comparison
 * 2. Token-based matching for different word orders
 *
 * Returns the best match above the threshold with confidence tier
 */
export const findMemberByName = async (
  rawName: string,
  masterData: MemberRecordA[],
  threshold: number = OCR_CONFIDENCE_TIERS.MEDIUM,
  apiKey?: string, // Optional API key for AI fallback
  assemblyName?: string // Optional assembly name for alias lookup
): Promise<FuzzyMatchResult | null> => {
  if (!rawName || !masterData.length) return null;

  // Strategy 0: Check learned name aliases first
  if (assemblyName) {
    try {
      const { getNameAlias } = await import("./handwritingLearning");
      const alias = await getNameAlias(assemblyName, rawName);
      if (alias && alias.count >= 2) {
        // Found a learned alias with 2+ occurrences
        const member = masterData.find(m =>
          String(m["Membership Number"]) === alias.memberId ||
          String(m["Old Membership Number"]) === alias.memberId
        );
        if (member) {
          console.log(`[Reconciliation] Using learned alias: "${rawName}" → ${alias.memberName} (seen ${alias.count}x)`);
          return {
            member,
            score: 0.95,
            matchedName: alias.memberName,
            confidenceTier: 'high',
            matchSource: 'fuzzy' // Could add 'alias' type in future
          };
        }
      }
    } catch {
      // Alias lookup failed, continue with other strategies
    }
  }

  // Preprocess and strip titles from raw name
  const cleanedRaw = stripTitles(preprocessName(rawName));

  // Strategy 1, 2, 3: Combined OCR-aware, token, and Ghanaian matching
  let bestMatch: FuzzyMatchResult | null = null;

  for (const member of masterData) {
    const firstName = (member["First Name"] || "").trim();
    const surname = (member.Surname || "").trim();
    const otherNames = (member["Other Names"] || "").trim();

    // Generate name combinations to compare against
    const combinations = [
      `${firstName} ${surname}`,
      `${surname} ${firstName}`,
      `${firstName} ${otherNames} ${surname}`,
      `${surname} ${firstName} ${otherNames}`,
      `${firstName} ${surname} ${otherNames}`,
      // Also try with title if present
      member.Title ? `${member.Title} ${firstName} ${surname}` : null,
    ].filter(Boolean) as string[];

    for (const nameCombo of combinations) {
      const cleanedCombo = stripTitles(nameCombo);

      // Strategy 1: OCR-normalized Levenshtein
      const ocrResult = getOCRAwareSimilarity(cleanedRaw, cleanedCombo);

      // Strategy 2: Token-based matching
      const tokenScore = getTokenSimilarity(cleanedRaw, cleanedCombo);

      // Strategy 3: Ghanaian-specific matching
      const ghanaianScore = ghanaianTokenSimilarity(cleanedRaw, cleanedCombo);

      // Surname variant boost
      const surnameBoost = areSurnameVariants(cleanedRaw, surname) ? 0.1 : 0;

      // Combined score: max of all methods + surname boost
      const score = Math.min(1.0, Math.max(ocrResult.score, tokenScore, ghanaianScore) + surnameBoost);

      if (score >= threshold) {
        if (!bestMatch || score > bestMatch.score) {
          const confidenceTier = score >= OCR_CONFIDENCE_TIERS.HIGH ? 'high'
            : score >= OCR_CONFIDENCE_TIERS.MEDIUM ? 'medium' : 'low';

          bestMatch = {
            member,
            score,
            matchedName: nameCombo,
            confidenceTier,
            matchSource: 'fuzzy'
          };
        }
      }
    }
  }

  // Strategy 3: AI Semantic Matching (The Neural Link)
  // If no match or low confidence match, and we have an API key, try AI
  if ((!bestMatch || bestMatch.confidenceTier === 'low') && apiKey) {
    // Only try AI if we haven't found a high confidence match
    // And if the raw name is long enough to be meaningful (> 3 chars)
    if (rawName.length > 3) {
      const aiMatch = await findMemberByAI(rawName, masterData, apiKey);
      if (aiMatch) {
        // If AI finds a match, it usually trumps a low-confidence fuzzy match
        // But we can compare scores if needed. For now, we assume AI is smarter.
        return aiMatch;
      }
    }
  }

  return bestMatch;
};

/**
 * Synchronous version for backwards compatibility.
 * Enhanced with Ghanaian name utilities for better matching.
 */
export const findMemberByNameSync = (
  rawName: string,
  masterData: MemberRecordA[],
  threshold: number = OCR_CONFIDENCE_TIERS.MEDIUM
): FuzzyMatchResult | null => {
  if (!rawName || !masterData.length) return null;

  // Preprocess and strip titles from raw name
  const cleanedRaw = stripTitles(preprocessName(rawName));

  let bestMatch: FuzzyMatchResult | null = null;

  for (const member of masterData) {
    const firstName = (member["First Name"] || "").trim();
    const surname = (member.Surname || "").trim();
    const otherNames = (member["Other Names"] || "").trim();

    const combinations = [
      `${firstName} ${surname}`,
      `${surname} ${firstName}`,
      `${firstName} ${otherNames} ${surname}`,
      `${surname} ${firstName} ${otherNames}`,
      `${firstName} ${surname} ${otherNames}`,
    ];

    for (const nameCombo of combinations) {
      const cleanedCombo = stripTitles(nameCombo);

      // Original scoring
      const ocrResult = getOCRAwareSimilarity(cleanedRaw, cleanedCombo);
      const tokenScore = getTokenSimilarity(cleanedRaw, cleanedCombo);

      // Ghanaian-specific scoring
      const ghanaianScore = ghanaianTokenSimilarity(cleanedRaw, cleanedCombo);

      // Surname variant boost
      const surnameBoost = areSurnameVariants(cleanedRaw, surname) ? 0.1 : 0;

      // Combined score: max of all methods + surname boost
      const score = Math.min(1.0, Math.max(ocrResult.score, tokenScore, ghanaianScore) + surnameBoost);

      if (score >= threshold) {
        if (!bestMatch || score > bestMatch.score) {
          const confidenceTier = score >= OCR_CONFIDENCE_TIERS.HIGH ? 'high'
            : score >= OCR_CONFIDENCE_TIERS.MEDIUM ? 'medium' : 'low';

          bestMatch = {
            member,
            score,
            matchedName: nameCombo,
            confidenceTier,
          };
        }
      }
    }
  }

  return bestMatch;
};

/**
 * Get top N fuzzy matches for suggestions when no exact match is found.
 * Returns candidates sorted by score in descending order.
 */
export const getTopFuzzyMatches = (
  rawName: string,
  masterData: MemberRecordA[],
  topN: number = 3,
  minScore: number = 0.3 // Lower threshold for suggestions
): FuzzyMatchResult[] => {
  if (!rawName || !masterData.length) return [];

  // Preprocess and strip titles from raw name
  const cleanedRaw = stripTitles(preprocessName(rawName));

  const allMatches: FuzzyMatchResult[] = [];

  for (const member of masterData) {
    const firstName = (member["First Name"] || "").trim();
    const surname = (member.Surname || "").trim();
    const otherNames = (member["Other Names"] || "").trim();

    const combinations = [
      `${firstName} ${surname}`,
      `${surname} ${firstName}`,
      `${firstName} ${otherNames} ${surname}`,
      `${surname} ${firstName} ${otherNames}`,
      `${firstName} ${surname} ${otherNames}`,
    ];

    let bestScoreForMember = 0;
    let bestCombo = "";

    for (const nameCombo of combinations) {
      const cleanedCombo = stripTitles(nameCombo);
      const ocrResult = getOCRAwareSimilarity(cleanedRaw, cleanedCombo);
      const tokenScore = getTokenSimilarity(cleanedRaw, cleanedCombo);
      const ghanaianScore = ghanaianTokenSimilarity(cleanedRaw, cleanedCombo);
      const surnameBoost = areSurnameVariants(cleanedRaw, surname) ? 0.1 : 0;
      const score = Math.min(1.0, Math.max(ocrResult.score, tokenScore, ghanaianScore) + surnameBoost);

      if (score > bestScoreForMember) {
        bestScoreForMember = score;
        bestCombo = nameCombo;
      }
    }

    if (bestScoreForMember >= minScore) {
      const confidenceTier = bestScoreForMember >= OCR_CONFIDENCE_TIERS.HIGH ? 'high'
        : bestScoreForMember >= OCR_CONFIDENCE_TIERS.MEDIUM ? 'medium' : 'low';

      allMatches.push({
        member,
        score: bestScoreForMember,
        matchedName: bestCombo,
        confidenceTier,
      });
    }
  }

  // Sort by score descending and take top N
  return allMatches
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
};
