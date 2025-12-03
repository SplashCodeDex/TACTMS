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
