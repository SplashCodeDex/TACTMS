import * as XLSX from "xlsx";
import { MemberRecordA } from "../types";

import { parseExcelFile } from "../lib/excelUtils";
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
      self.postMessage({ error: "An unknown error occurred in the worker." });
    }
  }
};
