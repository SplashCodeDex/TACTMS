

import * as XLSX from 'xlsx';
import { MemberRecordA } from '../types.ts';

// The parsing logic, now inside the worker.
const parseExcelFile = (file: File): Promise<MemberRecordA[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          reject(new Error("File data is null"));
          return;
        }
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<MemberRecordA>(worksheet, {
            raw: false,
            dateNF: 'dd-mmm-yyyy',
        });
        resolve(jsonData);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};


// Worker message handler
self.onmessage = async (event: MessageEvent<File>) => {
  try {
    const file = event.data;
    const result = await parseExcelFile(file);
    self.postMessage(result);
  } catch (error) {
    // If error is an instance of Error, post its message. Otherwise, post a generic error string.
    if (error instanceof Error) {
        self.postMessage({ error: error.message });
    } else {
        self.postMessage({ error: 'An unknown error occurred in the worker.' });
    }
  }
};