import * as XLSX from "xlsx";
import {
  MemberRecordA,
  TitheRecordB,
  ConcatenationConfig,
  MembershipReconciliationReport,
} from "../types";

export const parseAgeStringToYears = (
  ageString: string | undefined,
): number | null => {
  if (!ageString || typeof ageString !== "string") return null;
  const match = ageString.match(/^(\d+)\s*years?/i);
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
    // Extract age number from a string like "30 years" or "30 years 5 months"
    const ageMatch = member.Age?.match(/(\d+)/);
    if (!ageMatch) {
      return false; // Exclude members with non-numeric age
    }
    const age = parseInt(ageMatch[1], 10);

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
  const getMemberId = (m: MemberRecordA) => {
    const membershipNumber = String(m["Membership Number"] || m["Old Membership Number"] || "").trim();
    if (membershipNumber) return membershipNumber;

    // Fallback to First Name + Surname if no membership number
    const firstName = String(m["First Name"] || "").trim();
    const surname = String(m.Surname || "").trim();
    if (firstName && surname) return `${firstName}-${surname}`;
    return ""; // No identifiable ID
  };

  const masterMemberIds = new Set(
    masterData.map(getMemberId).filter((id) => id),
  );
  const newMemberIds = new Set(newData.map(getMemberId).filter((id) => id));

  const newMembers: MemberRecordA[] = newData.filter((m) => {
    const id = getMemberId(m);
    return id && !masterMemberIds.has(id);
  });

  const missingMembers: MemberRecordA[] = masterData.filter((m) => {
    const id = getMemberId(m);
    return id && !newMemberIds.has(id);
  });

  return {
    newMembers,
    missingMembers,
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
