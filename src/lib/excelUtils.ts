import * as XLSX from "xlsx";
import { MemberRecordA } from "../types";

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
        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
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
        resolve(jsonData);
      } catch (e: any) {
        reject(e);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};
