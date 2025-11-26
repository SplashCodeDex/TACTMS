import * as XLSX from "xlsx";
import {
  MemberRecordA,
  TitheRecordB,
  ConcatenationConfig,
  MembershipReconciliationReport,
  ChangedMemberDetail,
} from "../types";

export const parseAgeStringToYears = (
  ageString: string | undefined,
): number | null => {
  if (!ageString || typeof ageString !== "string") return null;
  // Match "30", "30 years", "Age: 30", "30yrs"
  const match = ageString.match(/(?:age:?\s*)?(\d+)\s*(?:years?|yrs?)?/i);
  return match ? parseInt(match[1], 10) : null;
};

// Helper to format date as DD-MMM-YYYY
export const formatDateDDMMMYYYY = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = date
    .toLocaleString("default", { month: "short" })
    .toUpperCase();
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export const filterMembersByAge = (
  members: MemberRecordA[],
  minAge?: number,
  maxAge?: number,
): MemberRecordA[] => {
  if (minAge === undefined && maxAge === undefined) {
    return members; // Return all members if no age range is specified
  }
  return members.filter((member) => {
    // Use the robust helper function
    const age = parseAgeStringToYears(member.Age);
    if (age === null) {
      return false; // Exclude members with non-numeric or unparseable age
    }

    const isAboveMin = minAge === undefined || age >= minAge;
    const isBelowMax = maxAge === undefined || age <= maxAge;

    return isAboveMin && isBelowMax;
  });
};

export const createTitheList = (
  members: MemberRecordA[],
  config: ConcatenationConfig,
  selectedDate: Date,
  descriptionTemplate: string,
  amountMappingColumn?: string | null,
): TitheRecordB[] => {
  const formattedDate = formatDateDDMMMYYYY(selectedDate);
  const description = descriptionTemplate.replace(
    /{DD-MMM-YYYY}/gi,
    formattedDate,
  );

  const getConcatenatedMemberName = (member: MemberRecordA, config: ConcatenationConfig): string => {
    const isProcessingRawData = !!(member["First Name"] || member["Surname"]);
    let namePart = "";
    if (config.Title && member.Title) namePart += `${member.Title} `;
    if (config["First Name"] && member["First Name"])
      namePart += `${member["First Name"]} `;
    if (config.Surname && member.Surname) namePart += `${member.Surname} `;
    if (config["Other Names"] && member["Other Names"])
      namePart += `${member["Other Names"]} `;
    namePart = namePart.trim();

    let numberPart = "";
    if (config["Membership Number"]) {
      const mainMemberNum = member["Membership Number"]?.trim() || "";
      const oldMemberNum = member["Old Membership Number"]?.trim() || "";

      if (mainMemberNum && oldMemberNum) {
        numberPart = `(${mainMemberNum}|${oldMemberNum})`;
      } else if (mainMemberNum) {
        numberPart = isProcessingRawData ? `(${mainMemberNum})` : mainMemberNum;
      } else if (oldMemberNum) {
        numberPart = `(${oldMemberNum})`;
      }
    }

    let concatenatedName = namePart;
    if (numberPart) {
      concatenatedName = namePart ? `${namePart} ${numberPart}` : numberPart;
    }

    concatenatedName = concatenatedName.trim();
    if (
      concatenatedName === "()" &&
      !namePart &&
      !member["Membership Number"] &&
      !member["Old Membership Number"]
    ) {
      concatenatedName = "";
    }
    return concatenatedName;
  };

  const getTransactionAmount = (member: MemberRecordA, amountMappingColumn?: string | null): number | string => {
    let transactionAmount: number | string = "";
    if (
      amountMappingColumn &&
      member[amountMappingColumn] !== undefined &&
      member[amountMappingColumn] !== null
    ) {
      const rawAmount = member[amountMappingColumn];
      if (typeof rawAmount === "number") {
        transactionAmount = rawAmount >= 0 ? rawAmount : "";
      } else if (typeof rawAmount === "string" && rawAmount.trim() !== "") {
        const parsedAmount = parseFloat(rawAmount.trim().replace(/,/g, ""));
        transactionAmount =
          !isNaN(parsedAmount) && parsedAmount >= 0 ? parsedAmount : "";
      }
    }
    return transactionAmount;
  };

  return members.map((member, index) => {
    const concatenatedName = getConcatenatedMemberName(member, config);
    const transactionAmount = getTransactionAmount(member, amountMappingColumn);

    return {
      "No.": member["No."] || index + 1,
      "Transaction Type": "Individual Tithe-[Income]",
      "Payment Source Type": "Registered Member",
      "Membership Number": concatenatedName,
      "Transaction Date ('DD-MMM-YYYY')": formattedDate,
      Currency: "GHS",
      "Exchange Rate": 1,
      "Payment Method": "Cash",
      "Transaction Amount": transactionAmount,
      "Narration/Description": description,
    };
  });
};
export const reconcileMembers = (
  newData: MemberRecordA[],
  masterData: MemberRecordA[],
): Omit<MembershipReconciliationReport, "previousFileDate"> => {
  // Helper to get ID (Membership Number)
  const getMemberId = (m: MemberRecordA) => {
    return String(m["Membership Number"] || m["Old Membership Number"] || "").trim();
  };

  // Helper to get Name Key (First Name + Surname)
  const getNameKey = (m: MemberRecordA) => {
    const firstName = String(m["First Name"] || "").trim().toLowerCase();
    const surname = String(m.Surname || "").trim().toLowerCase();
    if (firstName.length >= 2 && surname.length >= 2) {
      return `${firstName}-${surname}`;
    }
    return "";
  };

  // 1. Index Master Data
  const masterById = new Map<string, MemberRecordA>();
  const masterByName = new Map<string, MemberRecordA[]>(); // Allow duplicates for name
  const unidentifiableMasterMembers: MemberRecordA[] = [];
  let maxCustomOrder = 0;

  masterData.forEach((m) => {
    const id = getMemberId(m);
    const nameKey = getNameKey(m);

    if (id) masterById.set(id, m);
    if (nameKey) {
      if (!masterByName.has(nameKey)) masterByName.set(nameKey, []);
      masterByName.get(nameKey)!.push(m);
    }

    if (!id && !nameKey) unidentifiableMasterMembers.push(m);

    if (m.customOrder !== undefined && m.customOrder > maxCustomOrder) {
      maxCustomOrder = m.customOrder;
    }
  });

  const newMembers: MemberRecordA[] = [];
  const missingMembers: MemberRecordA[] = [];
  const changedMembers: ChangedMemberDetail[] = [];
  const unidentifiableNewMembers: MemberRecordA[] = [];

  // Track which master records have been matched to avoid double counting
  const matchedMasterIds = new Set<string>();
  const matchedMasterNames = new Set<string>(); // To track name matches if ID didn't match

  let newMemberOrder = maxCustomOrder + 1;

  // 2. Process New Data
  newData.forEach((newRecord) => {
    const newId = getMemberId(newRecord);
    const newNameKey = getNameKey(newRecord);
    let matchedMasterRecord: MemberRecordA | undefined;

    // PASS 1: Match by ID
    if (newId && masterById.has(newId)) {
      matchedMasterRecord = masterById.get(newId);
      matchedMasterIds.add(newId);
    }
    // PASS 2: Match by Name (if no ID match found)
    else if (newNameKey && masterByName.has(newNameKey)) {
      // Find a master record with this name that hasn't been matched by ID yet
      const candidates = masterByName.get(newNameKey)!;
      // Simple heuristic: take the first one that isn't matched yet
      // (Could be improved with fuzzy matching or other heuristics)
      matchedMasterRecord = candidates.find(c => {
        const cId = getMemberId(c);
        // If candidate has an ID, check if it was already matched
        if (cId) return !matchedMasterIds.has(cId);
        // If candidate has no ID, we can potentially match it (but need to be careful about duplicates)
        // For now, let's assume if we match by name, we consume that name instance.
        // But since we don't have unique IDs for name-only records, we need a way to track specific instances.
        // Let's rely on object reference equality for now if possible, or just skip complex duplicate handling for this pass.
        return true;
      });

      // If we found a match, we need to mark it as matched.
      // Since we might not have an ID, we can't use matchedMasterIds easily for ID-less records.
      // But if the master record *did* have an ID, we should add it to matchedMasterIds so it doesn't get marked as missing later.
      if (matchedMasterRecord) {
        const matchId = getMemberId(matchedMasterRecord);
        if (matchId) matchedMasterIds.add(matchId);
        // We also need to ensure we don't match this same master record again by name to another new record.
        // This simple logic might match the same master record to multiple new records if they share a name.
        // To fix this properly, we should remove the candidate from the list or track matched references.
        // Let's remove it from the candidate list for this scope.
        const index = candidates.indexOf(matchedMasterRecord);
        if (index > -1) {
          candidates.splice(index, 1); // Remove it so it can't be matched again
        }
      }
    }

    if (matchedMasterRecord) {
      // Check for changes
      const oldRecord = matchedMasterRecord;
      const changes: { field: string; oldValue: any; newValue: any }[] = [];
      const allKeys = new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)]);

      allKeys.forEach((key) => {
        const oldValue = oldRecord[key];
        const newValue = newRecord[key];
        if (String(oldValue) !== String(newValue)) {
          changes.push({ field: key, oldValue, newValue });
        }
      });

      if (changes.length > 0) {
        // Use the ID from the master record if available, otherwise the new ID, otherwise name key
        const memberId = getMemberId(oldRecord) || newId || newNameKey;
        changedMembers.push({ memberId, oldRecord, newRecord: { ...newRecord, customOrder: oldRecord.customOrder }, changes });
      }
    } else {
      // No match found -> New Member
      if (!newId && !newNameKey) {
        unidentifiableNewMembers.push(newRecord);
      } else {
        newMembers.push({ ...newRecord, customOrder: newMemberOrder++ });
      }
    }
  });

  // 3. Identify Missing Members
  // Any master record that wasn't matched is missing
  masterData.forEach((masterRecord) => {
    const id = getMemberId(masterRecord);
    const nameKey = getNameKey(masterRecord);

    // If it was matched by ID, it's not missing
    if (id && matchedMasterIds.has(id)) return;

    // If it was matched by Name (and removed from the candidate list), it's not missing.
    // Wait, we modified the candidate list in masterByName.
    // So if we check masterByName, we can see if this record is still there?
    // No, masterByName holds references.
    // Let's use a simpler approach:
    // If we matched it in Pass 2, we need to know.
    // The issue is tracking "matched by name" for ID-less records.

    // REVISED STRATEGY for Missing Detection:
    // We need a set of "matched master objects".
    // But we can't easily hash objects.
    // Let's assume for now that if it has an ID, matchedMasterIds handles it.
    // If it DOES NOT have an ID, we check if its name key still has candidates in masterByName.
    // Actually, we popped them from masterByName in Pass 2.
    // So if we iterate through masterData:
    // 1. If it has ID and ID is in matchedMasterIds -> Matched.
    // 2. If it has NO ID, check if it is still present in masterByName[nameKey].
    //    If it IS present, it means it wasn't consumed by a new record -> Missing.
    //    If it is NOT present (because we spliced it out), it was matched -> Not missing.

    if (id) {
      // Handled by matchedMasterIds check above
      if (!matchedMasterIds.has(id)) missingMembers.push(masterRecord);
    } else if (nameKey) {
      // Check if this specific object instance is still in the candidates list
      const candidates = masterByName.get(nameKey);
      if (candidates && candidates.includes(masterRecord)) {
        missingMembers.push(masterRecord);
      }
    } else {
      // Unidentifiable master members are ignored or handled separately?
      // For now, let's not mark them as missing to avoid noise, or maybe we should?
      // The original logic didn't seem to track unidentifiables in missing list explicitly?
      // Let's stick to identifiable ones.
    }
  });

  return {
    newMembers,
    missingMembers,
    changedMembers,
    unidentifiableNewMembers,
    unidentifiableMasterMembers,
  };
};

export const exportToExcel = (data: TitheRecordB[], fileName?: string): void => {
  if (!data || data.length === 0) {
    console.error("No data provided to export.");
    return;
  }

  const actualFileName = fileName && fileName.trim() !== "" ? fileName : "exported_data"; // Use default if fileName is empty or undefined

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-fit columns for better readability
  const allKeys = new Set<string>();
  data.forEach((row) => Object.keys(row).forEach((key) => allKeys.add(key)));

  const colWidths = Array.from(allKeys).map((key) => {
    let maxLength = key.length;
    data.forEach((row) => {
      const value = row[key as keyof TitheRecordB];
      if (value != null && String(value).length > maxLength) {
        maxLength = String(value).length;
      }
    });
    return { wch: maxLength + 3 }; // +3 for a little padding
  });
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Exported Data");
  XLSX.writeFile(workbook, `${actualFileName}.xlsx`);
};
