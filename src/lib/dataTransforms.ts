// Shared data transformation utilities

export const parseAgeStringToYears = (
  ageString: string | undefined,
): number | null => {
  if (!ageString || typeof ageString !== "string") return null;
  const match = ageString.match(/(?:age:?\s*)?(\d+(?:\.\d+)?)\s*(?:years?|yrs?)?/i);
  return match ? Math.floor(parseFloat(match[1])) : null;
};

// Helper to format date as DD-MMM-YYYY
export const formatDateDDMMMYYYY = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString("default", { month: "short" }).toUpperCase();
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};