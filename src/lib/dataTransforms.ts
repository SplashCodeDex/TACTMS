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

export const calculateSundayDate = (monthName: string, weekString: string, year: number): Date => {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthIndex = months.findIndex(m => m.toLowerCase().startsWith(monthName.toLowerCase()));

  if (monthIndex === -1) return new Date(); // Fallback

  const weekMatch = weekString.match(/Week (\d+)/i);
  const weekNumber = weekMatch ? parseInt(weekMatch[1]) : 1;

  // Find the first Sunday of the month
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  let dayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, ...

  // Calculate days to add to reach the first Sunday
  // If starts on Sunday (0), add 0. If Monday (1), add 6. If Saturday (6), add 1.
  let daysToFirstSunday = (7 - dayOfWeek) % 7;

  const firstSunday = new Date(year, monthIndex, 1 + daysToFirstSunday);

  // Add weeks
  const targetSunday = new Date(firstSunday);
  targetSunday.setDate(firstSunday.getDate() + (weekNumber - 1) * 7);

  return targetSunday;
};

/**
 * Get the most recent Sunday for a given date.
 * Used to normalize tithe list dates to the previous/current Sunday.
 * @param date - The reference date
 * @returns The most recent Sunday at midnight
 */
export const getMostRecentSunday = (date: Date): Date => {
  const day = date.getDay(); // Sunday - 0, Monday - 1, ..., Saturday - 6
  const diff = date.getDate() - day; // Calculate difference to get to Sunday
  const sunday = new Date(date.setDate(diff));
  sunday.setHours(0, 0, 0, 0); // Set to the beginning of the day to normalize
  return sunday;
};
