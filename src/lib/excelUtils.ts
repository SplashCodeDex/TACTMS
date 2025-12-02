import * as XLSX from "xlsx";
import { MemberRecordA } from "../types";

export const parseExcelFile = (file: File): Promise<MemberRecordA[]> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          resolve([]);
          return;
        }
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          resolve([]);
          return;
        }
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<MemberRecordA>(worksheet, {
          raw: false,
          dateNF: "dd-mmm-yyyy",
        });

        // Smart Parsing: Handle "Tithe List" exports where Name is combined with ID
        const processedData = smartParseMembers(jsonData);

        resolve(processedData);
      } catch (e: any) {
        throw e;
      }
    };
    reader.onerror = () => {
      // Surface as an empty list to keep UX flowing; callers can detect via validation later
      resolve([]);
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
          "Title": title || record.Title,
          "First Name": firstName,
          "Surname": surname,
          "Other Names": otherNames
        };
      }
    }
    return record;
  });
};
