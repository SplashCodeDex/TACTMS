import { MemberRecordA } from "../types";
import { parseAgeStringToYears } from "../lib/dataTransforms";

export const filterMembersByAge = (
  members: MemberRecordA[],
  minAge?: number,
  maxAge?: number,
): MemberRecordA[] => {
  if (minAge === undefined && maxAge === undefined) {
    return members;
  }
  return members.filter((member) => {
    const age = parseAgeStringToYears(member.Age);
    if (age === null) {
      return false;
    }
    const isAboveMin = minAge === undefined || age >= minAge;
    const isBelowMax = maxAge === undefined || age <= maxAge;
    return isAboveMin && isBelowMax;
  });
};
