import * as XLSX from "xlsx";
import { MemberRecordA, TitheRecordB } from "../types";
import { sanitizeForSpreadsheet, computeColumnWidths } from "./exportUtils";

export const parseExcelFile = (file: File): Promise<MemberRecordA[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          reject(new Error("File data is null"));
          return;
        }
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          reject(new Error("No sheets found in the Excel file."));
          return;
        }
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<MemberRecordA>(worksheet, {
          raw: false,
          dateNF: "dd-mmm-yyyy",
        });

        // Smart Parsing: Handle "Tithe List" exports where Name is combined with ID
        const processedData = smartParseMembers(jsonData).map(sanitizeRecord);

       // Normalize Title to avoid artifacts like 0
       const normalized = processedData.map((r) => ({
         ...r,
         Title: sanitizeTitle((r as any).Title),
       }));

        resolve(normalized);
      } catch (e: any) {
        reject(e);
      }
    };
    reader.onerror = (error) => {
      reject(error as any);
    };
    reader.readAsArrayBuffer(file);
  });
};

export const detectExcelFileType = (
  file: File,
): Promise<"MASTER_LIST" | "TITHE_LIST" | "UNKNOWN"> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          resolve("UNKNOWN");
          return;
        }
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          resolve("UNKNOWN");
          return;
        }
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!jsonData || jsonData.length === 0) {
          resolve("UNKNOWN");
          return;
        }

        const headers = (jsonData[0] as string[]).map(h => String(h).trim());

        // Check for Master List signatures
        // A.md: Membership Number, First Name, Surname
        const isMasterList =
          headers.includes("Membership Number") &&
          (headers.includes("First Name") || headers.includes("Surname"));

        // Check for Tithe List signatures
        // B.md: Transaction Type, Payment Source Type
        const isTitheList =
          headers.includes("Transaction Type") &&
          headers.includes("Payment Source Type");

        if (isMasterList) resolve("MASTER_LIST");
        else if (isTitheList) resolve("TITHE_LIST");
        else resolve("UNKNOWN");
      } catch (e) {
        console.error("Error detecting file type:", e);
        resolve("UNKNOWN");
      }
    };
    reader.onerror = () => resolve("UNKNOWN");
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Analyzes member data to guess the assembly name based on common location patterns
 * Examines Place of Birth, Hometown, Residential Address, and Place of Work fields
 */
export const guessAssemblyFromMembers = (members: MemberRecordA[]): string | null => {
  if (!members || members.length === 0) return null;

  const locationCounts = new Map<string, number>();

  // Known assembly keywords to look for
  const assemblyKeywords = [
    "jei krodua", "jei-krodua", "jk", "central", "maranatha", "ayiresu",
    "silom", "k2", "ofaankor", "kasoa", "tema", "accra"
  ];

  members.forEach(member => {
    // Collect all location-related fields
    const locations = [
      member["Place of Birth"],
      member.Hometown,
      member["Residential Address"],
      member["Place of Work"]
    ]
      .filter(Boolean)
      .map(loc => (loc as string).toLowerCase().trim());

    locations.forEach(loc => {
      // Check for known assembly keywords
      for (const keyword of assemblyKeywords) {
        if (loc.includes(keyword)) {
          const normalized = keyword.replace(/-/g, " ").trim();
          locationCounts.set(normalized, (locationCounts.get(normalized) || 0) + 1);
        }
      }

      // Also count the raw location
      if (loc.length > 2) {
        locationCounts.set(loc, (locationCounts.get(loc) || 0) + 1);
      }
    });
  });

  if (locationCounts.size === 0) return null;

  // Sort by count descending and return the most common
  const sorted = [...locationCounts.entries()].sort((a, b) => b[1] - a[1]);

  // Return if the top result has at least 20% of total members
  const topResult = sorted[0];
  if (topResult && topResult[1] >= members.length * 0.2) {
    // Capitalize properly
    return topResult[0]
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  return null;
};



const sanitizeText = (t: any): string => {
  if (t === undefined || t === null) return "";
  if (typeof t === "number") return t === 0 ? "" : String(t);
  const s = String(t).trim();
  if (s === "0" || s === "-" || s.toUpperCase() === "N/A" || s.toUpperCase() === "NA" || s.toLowerCase() === "null") return "";
  return s;
};

const sanitizeTitle = sanitizeText;

// Only sanitize known text fields and only if they already exist on the record
const TEXT_FIELDS: string[] = [
  "Title",
  "First Name",
  "Surname",
  "Other Names",
  "Sex",
  "Gender",
  "Phone Number",
  "Residential Address",
  "Hometown/Region",
  "Marital Status",
  "Employment Status",
  "Occupation",
  "Place of Birth",
  "Hometown",
  "Place of Work",
  "Date of Birth"
];

const sanitizeRecord = (rec: MemberRecordA): MemberRecordA => {
  const out: MemberRecordA = { ...rec };
  for (const key of TEXT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(out, key)) {
      out[key] = sanitizeText(out[key]);
    }
  }
  return out;
};

export const smartParseMembers = (members: MemberRecordA[]): MemberRecordA[] => {
  return members.map((record) => {
    // Check if Name fields are empty but Membership Number looks like "Name (ID)"
    const hasNoName = !record["First Name"] && !record.Surname;
    const memNum = record["Membership Number"] || "";

    if (hasNoName && memNum && memNum.includes("(") && memNum.includes(")")) {
      // Regex to capture: Name Part (ID Part)
      // Example: "PASTOR JONATHAN ADDO MENSAH (TAC89JAM131001|651101008)"
      // or "ABIGAIL AGBEMANYA (TAC07AAG070301)"
      const match = memNum.match(/^(.*?)\s*\((.*?)\)$/);

      if (match) {
        const fullName = match[1].trim();
        const idPart = match[2].trim();

        // Split ID part if it contains pipe
        let newId = idPart;
        let oldId = "";
        if (idPart.includes("|")) {
          const ids = idPart.split("|");
          newId = ids[0].trim();
          oldId = ids[1].trim();
        }

        // Split Name into parts (naive split)
        const nameParts = fullName.split(" ");
        let title = "";
        let firstName = "";
        let surname = "";
        let otherNames = "";

        // Basic Title detection
        const titles = ["PASTOR", "ELDER", "DEACON", "DEACONESS", "MR", "MRS", "MISS", "DR", "REV", "APOSTLE", "OVERSEER"];
        let startIndex = 0;

        if (nameParts.length > 0 && titles.includes(nameParts[0].toUpperCase())) {
          title = nameParts[0];
          startIndex = 1;
        }

        if (nameParts.length - startIndex === 1) {
          firstName = nameParts[startIndex];
        } else if (nameParts.length - startIndex >= 2) {
          firstName = nameParts[startIndex];
          surname = nameParts[startIndex + 1];

          const remainingNames = nameParts.slice(startIndex);
          firstName = remainingNames[0];
          if (remainingNames.length > 1) {
            surname = remainingNames[remainingNames.length - 1];
            if (remainingNames.length > 2) {
              otherNames = remainingNames.slice(1, remainingNames.length - 1).join(" ");
            }
          }
        }

        return {
          ...record,
          "Membership Number": newId,
          "Old Membership Number": oldId || record["Old Membership Number"],
          "Title": sanitizeTitle(title || record.Title),
          "First Name": firstName,
          "Surname": surname,
          "Other Names": otherNames
        };
      }
    }
    return record;
  });
};

// Export tithe data to Excel (.xlsx)
export const exportToExcel = (data: TitheRecordB[], fileName?: string): void => {
  if (!data || data.length === 0) {
    console.error("No data provided to export.");
    return;
  }

  const actualFileName = fileName && fileName.trim() !== "" ? fileName : "exported_data";

  // Sanitize data to prevent CSV/Formula injection
  // Use shared helper
  const sanitizeForExcel = sanitizeForSpreadsheet;

  const sanitizedData = data.map(row => {
    const newRow: any = {};
    Object.keys(row).forEach(key => {
      newRow[key] = sanitizeForExcel((row as any)[key]);
    });
    return newRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(sanitizedData);

  // Auto-fit columns for better readability via shared helper
  (worksheet as any)["!cols"] = computeColumnWidths(data as any[]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Exported Data");
  XLSX.writeFile(workbook, `${actualFileName}.xlsx`);
};
