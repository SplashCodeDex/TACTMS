import { MemberRecordA, TitheRecordB, ConcatenationConfig } from "../types";
import { formatDateDDMMMYYYY } from "../lib/dataTransforms";

export const createTitheList = (
  members: MemberRecordA[],
  config: ConcatenationConfig,
  selectedDate: Date,
  descriptionTemplate: string,
  amountMappingColumn?: string | null,
): TitheRecordB[] => {
  const formattedDate = formatDateDDMMMYYYY(selectedDate);
  const description = descriptionTemplate.replace(/\{DD-MMM-YYYY\}/gi, formattedDate);

  const getConcatenatedMemberName = (member: MemberRecordA, config: ConcatenationConfig): string => {
    const isProcessingRawData = !!(member["First Name"] || member["Surname"]);
    let namePart = "";
    if (config.Title && member.Title) namePart += `${member.Title} `;
    if (config["First Name"] && member["First Name"]) namePart += `${member["First Name"]} `;
    if (config.Surname && member.Surname) namePart += `${member.Surname} `;
    if (config["Other Names"] && member["Other Names"]) namePart += `${member["Other Names"]} `;
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

    if (concatenatedName === "()" && !namePart && !member["Membership Number"] && !member["Old Membership Number"]) {
      concatenatedName = "";
    }

    return concatenatedName;
  };

  const getTransactionAmount = (member: MemberRecordA, amountMappingColumn?: string | null): number | string => {
    let transactionAmount: number | string = "";
    if (amountMappingColumn && member[amountMappingColumn] !== undefined && member[amountMappingColumn] !== null) {
      const rawAmount = member[amountMappingColumn];
      if (typeof rawAmount === "number") {
        transactionAmount = rawAmount >= 0 ? rawAmount : "";
      } else if (typeof rawAmount === "string" && rawAmount.trim() !== "") {
        const cleaned = rawAmount.replace(/[^0-9.-]+/g, "");
        const parsedAmount = parseFloat(cleaned);
        transactionAmount = !isNaN(parsedAmount) && parsedAmount >= 0 ? parsedAmount : "";
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
      memberDetails: member,
    };
  });
};

export const parseMemberId = (rawId: string): string => {
  if (!rawId) return "";
  const trimmed = rawId.trim();
  const match = trimmed.match(/\(([^)]+)\)$/);
  if (match) {
    return match[1].trim();
  }
  return trimmed;
};

/**
 * Validation result for TACMS export compliance
 */
export interface TACMSValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recordsWithoutAmount: number;
  recordsWithoutId: number;
}

/**
 * Validates that a tithe list is ready for TACMS import
 * Checks required fields, date format, and data integrity
 */
export const validateTitheListForTACMS = (list: TitheRecordB[]): TACMSValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  let recordsWithoutAmount = 0;
  let recordsWithoutId = 0;

  if (!list || list.length === 0) {
    errors.push("Tithe list is empty");
    return { valid: false, errors, warnings, recordsWithoutAmount, recordsWithoutId };
  }

  const dateRegex = /^\d{2}-[A-Z]{3}-\d{4}$/;

  list.forEach((record, idx) => {
    const rowNum = record["No."] || idx + 1;

    // Check Membership Number format (must have ID in parentheses for registered members)
    const memNum = record["Membership Number"] || "";
    if (!memNum) {
      errors.push(`Row ${rowNum}: Missing Membership Number`);
      recordsWithoutId++;
    } else if (!memNum.includes("(") && record["Payment Source Type"] === "Registered Member") {
      // Registered members should have ID in format: Name (ID)
      warnings.push(`Row ${rowNum}: Membership Number should include ID in parentheses for registered members`);
    }

    // Check Transaction Amount
    if (record["Transaction Amount"] === "" || record["Transaction Amount"] === undefined) {
      recordsWithoutAmount++;
    }

    // Check date format
    const dateVal = record["Transaction Date ('DD-MMM-YYYY')"];
    if (!dateVal) {
      errors.push(`Row ${rowNum}: Missing Transaction Date`);
    } else if (!dateRegex.test(dateVal)) {
      errors.push(`Row ${rowNum}: Invalid date format '${dateVal}'. Expected DD-MMM-YYYY (e.g., 02-NOV-2025)`);
    }

    // Check required fixed fields
    if (record["Transaction Type"] !== "Individual Tithe-[Income]") {
      warnings.push(`Row ${rowNum}: Unexpected Transaction Type '${record["Transaction Type"]}'`);
    }
    if (record.Currency !== "GHS") {
      warnings.push(`Row ${rowNum}: Currency is '${record.Currency}', expected 'GHS'`);
    }
  });

  // Summary warnings
  if (recordsWithoutAmount > 0) {
    warnings.push(`${recordsWithoutAmount} record(s) have no Transaction Amount entered`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    recordsWithoutAmount,
    recordsWithoutId
  };
};

/**
 * Title alias mapping for normalization
 */
const TITLE_ALIASES: Record<string, string[]> = {
  "DEACONESS": ["DCNS", "DEAC", "DCN", "DEAS"],
  "ELDER": ["ELD", "ELDR"],
  "PASTOR": ["PST", "PS", "PTR"],
  "APOSTLE": ["APT", "APST"],
  "OVERSEER": ["OVS", "OVSR"],
  "DEACON": ["DCN"],
  "EVANGELIST": ["EVG", "EVNG"],
  "REVEREND": ["REV", "REVD"],
  "SISTER": ["SIS", "SR"],
  "BROTHER": ["BRO", "BR"],
  "MADAM": ["MDM"],
  "MAAME": ["MAAME"]
};

/**
 * Normalizes a title to its canonical form for consistent matching
 */
export const normalizeTitleForMatching = (title: string): string => {
  if (!title) return "";
  const upper = title.toUpperCase().trim().replace(/\.$/g, "");

  for (const [canonical, aliases] of Object.entries(TITLE_ALIASES)) {
    if (aliases.includes(upper) || upper === canonical) {
      return canonical;
    }
  }

  return upper;
};
