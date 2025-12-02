// Shared export helpers for CSV and Excel

// Escape a value for CSV output, handling commas, quotes, and newlines
export const escapeCsvField = (field: any): string => {
  if (field === null || field === undefined) return "";
  let value = String(field);
  if (value.includes(",") || value.includes("\n") || value.includes("\"")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

// Sanitize for spreadsheet to avoid CSV/Formula injection when opening in Excel
// If string starts with =, +, -, or @, prepend a single quote to force text
export const sanitizeForSpreadsheet = (value: any): any => {
  if (typeof value === "string" && /^[=+\-@]/.test(value)) {
    return `'${value}`;
  }
  return value;
};

// Compute column widths for an array of records (keys across all rows)
export const computeColumnWidths = (rows: Array<Record<string, any>>) => {
  const allKeys = new Set<string>();
  rows.forEach((row) => Object.keys(row).forEach((key) => allKeys.add(key)));
  return Array.from(allKeys).map((key) => {
    let maxLength = key.length;
    rows.forEach((row) => {
      const value = row[key];
      if (value != null && String(value).length > maxLength) {
        maxLength = String(value).length;
      }
    });
    return { wch: maxLength + 3 };
  });
};
