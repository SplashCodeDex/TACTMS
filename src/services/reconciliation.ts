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

import { getSimilarity } from "../utils/stringUtils";
import { FuzzyMatchResult } from "../types";

export const findMemberByName = (
  rawName: string,
  masterData: MemberRecordA[],
  threshold: number = 0.8
): FuzzyMatchResult | null => {
  if (!rawName || !masterData.length) return null;

  const normalizedRawName = rawName.toLowerCase().trim();
  let bestMatch: FuzzyMatchResult | null = null;

  for (const member of masterData) {
    // Construct the full name from the master record for comparison
    // Try different combinations: First Surname, Surname First, etc.
    const firstName = (member["First Name"] || "").trim();
    const surname = (member.Surname || "").trim();
    const otherNames = (member["Other Names"] || "").trim();

    const combinations = [
      `${firstName} ${surname}`,
      `${surname} ${firstName}`,
      `${firstName} ${otherNames} ${surname}`,
      `${surname} ${firstName} ${otherNames}`,
      `${firstName} ${surname} ${otherNames}`
    ];

    for (const nameCombo of combinations) {
      const normalizedCombo = nameCombo.toLowerCase().trim();
      if (!normalizedCombo) continue;

      const score = getSimilarity(normalizedRawName, normalizedCombo);

      if (score >= threshold) {
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = {
            member,
            score,
            matchedName: nameCombo
          };
        }
      }
    }
  }

  return bestMatch;
};
