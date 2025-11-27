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

// Helper to parse ID from "Name (ID)" format or return raw ID
export const parseMemberId = (rawId: string): string => {
  if (!rawId) return "";
  const trimmed = rawId.trim();
  // Match content inside the LAST pair of parentheses
  const match = trimmed.match(/\(([^)]+)\)$/);
  if (match) {
    return match[1].trim();
  }
  return trimmed;
};

export const reconcileMembers = (
  newData: MemberRecordA[],
  masterData: MemberRecordA[],
): Omit<MembershipReconciliationReport, "previousFileDate"> => {
  // Helper to get ID (Membership Number) - handles "Name (ID)" extraction
  const getMemberId = (m: MemberRecordA) => {
    const rawVal = String(m["Membership Number"] || m["Old Membership Number"] || "");
    return parseMemberId(rawVal);
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
  // We map BOTH "Membership Number" and "Old Membership Number" to the record
  const masterById = new Map<string, MemberRecordA>();
  const masterByName = new Map<string, MemberRecordA[]>(); // Allow duplicates for name
  const unidentifiableMasterMembers: MemberRecordA[] = [];
  let maxCustomOrder = 0;

  masterData.forEach((m) => {
    const id = String(m["Membership Number"] || "").trim();
    const oldId = String(m["Old Membership Number"] || "").trim();
    const nameKey = getNameKey(m);

    if (id) masterById.set(id, m);
    if (oldId) masterById.set(oldId, m); // Map old ID too!

    if (nameKey) {
      if (!masterByName.has(nameKey)) masterByName.set(nameKey, []);
      masterByName.get(nameKey)!.push(m);
    }

    if (!id && !oldId && !nameKey) unidentifiableMasterMembers.push(m);

    if (m.customOrder !== undefined && m.customOrder > maxCustomOrder) {
      maxCustomOrder = m.customOrder;
    }
  });

  const newMembers: MemberRecordA[] = [];
  const missingMembers: MemberRecordA[] = [];
  const changedMembers: ChangedMemberDetail[] = [];
  const unidentifiableNewMembers: MemberRecordA[] = [];

  // Track which master records have been matched (by their primary ID)
  const matchedMasterIds = new Set<string>();

  let newMemberOrder = maxCustomOrder + 1;

  // 2. Process New Data
  newData.forEach((newRecord) => {
    const rawId = getMemberId(newRecord); // Can be "ID" or "ID|OldID"
    const newNameKey = getNameKey(newRecord);
    let matchedMasterRecord: MemberRecordA | undefined;

    // PASS 1: Match by ID (Composite aware)
    if (rawId) {
      const parts = rawId.split("|").map(p => p.trim()).filter(p => p);
      for (const part of parts) {
        if (masterById.has(part)) {
          matchedMasterRecord = masterById.get(part);
          break; // Found a match
        }
      }
    }

    // PASS 2: Match by Name (if no ID match found)
    if (!matchedMasterRecord && newNameKey && masterByName.has(newNameKey)) {
      const candidates = masterByName.get(newNameKey)!;
      // Find a candidate that hasn't been matched yet
      matchedMasterRecord = candidates.find(c => {
        const cId = String(c["Membership Number"] || "").trim();
        return !matchedMasterIds.has(cId);
      });
    }

    if (matchedMasterRecord) {
      // Mark as matched
      const masterId = String(matchedMasterRecord["Membership Number"] || "").trim();
      if (masterId) matchedMasterIds.add(masterId);

      // Check for changes
      const changes: { field: string; oldValue: any; newValue: any }[] = [];
      const fieldsToCheck: (keyof MemberRecordA)[] = [
        "First Name",
        "Surname",
        "Title",
        "Gender",
        "Marital Status",
        "Type of Marriage",
        "Age",
        // Add other fields as needed
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

      if (changes.length > 0) {
        changedMembers.push({
          memberId: masterId,
          oldRecord: matchedMasterRecord,
          newRecord: newRecord,
          changes,
        });
      }
    } else {
      // No match found -> New Member
      if (!rawId && !newNameKey) {
        unidentifiableNewMembers.push(newRecord);
      } else {
        newMembers.push({ ...newRecord, customOrder: newMemberOrder++ });
      }
    }
  });

  // 3. Identify Missing Members
  masterData.forEach((masterRecord) => {
    const id = String(masterRecord["Membership Number"] || "").trim();
    // If it has an ID and wasn't matched, it's missing
    if (id && !matchedMasterIds.has(id)) {
      missingMembers.push(masterRecord);
    }
    // If it has no ID, we rely on name matching which is harder to track perfectly for missing
    // without unique IDs. For now, we assume if it has no ID, it's not "missing" in the strict sense
    // or we'd need more complex tracking.
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
