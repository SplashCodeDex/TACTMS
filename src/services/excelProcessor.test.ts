import { describe, it, expect } from "vitest";
import { formatDateDDMMMYYYY, createTitheList } from "./excelProcessor";
import { MemberRecordA, ConcatenationConfig } from "../types";

describe("formatDateDDMMMYYYY", () => {
  it("should format the date correctly", () => {
    const date = new Date(2025, 7, 15); // 15th August 2025
    const formattedDate = formatDateDDMMMYYYY(date);
    expect(formattedDate).toBe("15-AUG-2025");
  });
});

describe("createTitheList", () => {
  const members: MemberRecordA[] = [
    {
      "No.": 1,
      "First Name": "John",
      Surname: "Doe",
      "Membership Number": "123",
      Age: "30 years",
    },
    {
      "No.": 2,
      "First Name": "Jane",
      Surname: "Doe",
      "Membership Number": "456",
      Age: "25 years",
    },
  ];

  const config: ConcatenationConfig = {
    Title: true,
    "First Name": true,
    Surname: true,
    "Other Names": true,
    "Membership Number": true,
    // "Old Membership Number": true, // This was likely for a legacy feature to include old membership numbers in the concatenated name. It has been removed from the type definition.
  };

  const selectedDate = new Date(2025, 7, 15);
  const descriptionTemplate = "Tithe for {DD-MMM-YYYY}";

  it("should create a tithe list with the correct number of records", () => {
    const titheList = createTitheList(
      members,
      config,
      selectedDate,
      descriptionTemplate,
    );
    expect(titheList).toHaveLength(2);
  });

  it("should correctly format the concatenated name", () => {
    const titheList = createTitheList(
      members,
      config,
      selectedDate,
      descriptionTemplate,
    );
    expect(titheList[0]["Membership Number"]).toBe("John Doe (123)");
    expect(titheList[1]["Membership Number"]).toBe("Jane Doe (456)");
  });

  it("should correctly format the transaction date and description", () => {
    const titheList = createTitheList(
      members,
      config,
      selectedDate,
      descriptionTemplate,
    );
    expect(titheList[0]["Transaction Date ('DD-MMM-YYYY')"]).toBe(
      "15-AUG-2025",
    );
    expect(titheList[0]["Narration/Description"]).toBe("Tithe for 15-AUG-2025");
  });
});
