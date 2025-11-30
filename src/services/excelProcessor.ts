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
  // Match "30", "30.5", "30 years", "Age: 30", "30yrs"
  const match = ageString.match(/(?:age:?\s*)?(\d+(?:\.\d+)?)\s*(?:years?|yrs?)?/i);
  return match ? Math.floor(parseFloat(match[1])) : null;
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
        // Remove everything that is NOT a digit, dot, or minus sign
        // This handles "GH₵ 1,000.00", "$500", etc.
        const cleaned = rawAmount.replace(/[^0-9.-]+/g, "");
        const parsedAmount = parseFloat(cleaned);
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
    const rawVal = String(m["Membership Number"] || "").trim();
    return parseMemberId(rawVal);
  };

  const getOldMemberId = (m: MemberRecordA) => {
    const rawVal = String(m["Old Membership Number"] || "").trim();
    return parseMemberId(rawVal);
  };

  const newMembers: MemberRecordA[] = [];
  const changedMembers: ChangedMemberDetail[] = [];
  const unidentifiableNewMembers: MemberRecordA[] = [];
  const unidentifiableMasterMembers: MemberRecordA[] = [];

  // Track which master records have been matched (by their primary ID AND reference)
  const matchedMasterRecords = new Set<MemberRecordA>();

  // 1. Index Master Data by Current ID and Old ID
  const masterById = new Map<string, MemberRecordA>();
  let maxCustomOrder = 0;

  masterData.forEach((m) => {
    if (m.customOrder && m.customOrder > maxCustomOrder) {
      maxCustomOrder = m.customOrder;
    }

    const currentId = getMemberId(m);
    const oldId = getOldMemberId(m);

    // Index by Current ID
    if (currentId) {
      // Handle composite IDs if any (though usually strictly one ID per field)
      const parts = currentId.split("|").map(p => p.trim()).filter(p => p);
      parts.forEach(part => {
        if (!masterById.has(part)) {
          masterById.set(part, m);
        }
      });
    }

    // Index by Old ID (for linking history)
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

  let newMemberOrder = maxCustomOrder + 1;

  // 2. Process New Data
  newData.forEach((newRecord) => {
    const newCurrentId = getMemberId(newRecord);
    const newOldId = getOldMemberId(newRecord);

    let matchedMasterRecord: MemberRecordA | undefined;

    // SMART ID MATCHING STRATEGY
    // Check 1: Does New.CurrentID match any Master Record?
    if (newCurrentId) {
      const parts = newCurrentId.split("|").map(p => p.trim()).filter(p => p);
      for (const part of parts) {
        if (masterById.has(part)) {
          matchedMasterRecord = masterById.get(part);
          break;
        }
      }
    }

    // Check 2: Does New.OldID match any Master Record? (If not already matched)
    if (!matchedMasterRecord && newOldId) {
      const parts = newOldId.split("|").map(p => p.trim()).filter(p => p);
      for (const part of parts) {
        if (masterById.has(part)) {
          matchedMasterRecord = masterById.get(part);
          break;
        }
      }
    }

    // Ensure we haven't already matched this specific master record (prevent double matching)
    if (matchedMasterRecord && matchedMasterRecords.has(matchedMasterRecord)) {
      // If this master record is already matched, we treat this as a NEW member (or a duplicate in the upload file).
      // For safety, we treat it as NEW to avoid overwriting the previous match.
      matchedMasterRecord = undefined;
    }

    if (matchedMasterRecord) {
      // Mark as matched
      matchedMasterRecords.add(matchedMasterRecord);
      const masterId = String(matchedMasterRecord["Membership Number"] || "").trim();

      // Check for changes
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

      if (changes.length > 0) {
        // Determine match type
        let matchType: 'ID' | 'OldID' = 'ID';
        const currentId = getMemberId(newRecord);
        if (!currentId) {
          // If no current ID, but matched, must be via Old ID (or name fallback if we had it, but we don't anymore)
          matchType = 'OldID';
        } else {
          // If Current ID exists, check if it matches Master's Current ID
          const parts = currentId.split("|").map(p => p.trim()).filter(p => p);
          const masterCurrentId = String(matchedMasterRecord["Membership Number"] || "").trim();
          // Simple check: if new ID is in master's ID (or vice versa due to composite), it's an ID match.
          // If not, it implies we matched via Old ID.
          // A more robust way: capture how we matched in the matching loop.
          // But since we know the logic:
          // 1. Try Match by Current ID
          // 2. Try Match by Old ID

          // Let's rely on the fact that if newCurrentId matches master, it's 'ID'.
          // If newCurrentId DOES NOT match master, but we have a match, it MUST be 'OldID'.

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

        changedMembers.push({
          memberId: masterId,
          oldRecord: matchedMasterRecord,
          newRecord: newRecord,
          changes,
          matchType,
        });
      }
    } else {
      // No match found -> New Member
      if (!newCurrentId && !newOldId) {
        unidentifiableNewMembers.push(newRecord);
      } else {
        newMembers.push({ ...newRecord, customOrder: newMemberOrder++ });
      }
    }
  });

  return {
    newMembers,
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

  // Sanitize data to prevent CSV/Formula injection
  const sanitizeForExcel = (value: any): any => {
    if (typeof value === 'string') {
      // If string starts with =, +, -, or @, prepend a single quote to force it as text
      if (/^[=+\-@]/.test(value)) {
        return `'${value}`;
      }
    }
    return value;
  };

  const sanitizedData = data.map(row => {
    const newRow: any = {};
    Object.keys(row).forEach(key => {
      newRow[key] = sanitizeForExcel(row[key as keyof TitheRecordB]);
    });
    return newRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(sanitizedData);

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
