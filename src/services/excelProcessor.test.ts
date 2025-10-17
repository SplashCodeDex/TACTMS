/// <reference types="vitest/globals" />
import { formatDateDDMMMYYYY, createTitheList, filterMembersByAge, reconcileMembers, exportToExcel } from "./excelProcessor";
import { parseExcelFile } from "../lib/excelUtils";
import { MemberRecordA, ConcatenationConfig, TitheRecordB } from "../types";
import * as XLSX from "xlsx"; // Import XLSX to use vi.mocked

vi.mock("xlsx", () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
    book_new: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
    json_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(), // Used by exportToExcel
}));

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

describe("filterMembersByAge", () => {
  const members: MemberRecordA[] = [
    { "No.": 1, "First Name": "Alice", Age: "25 years" },
    { "No.": 2, "First Name": "Bob", Age: "30 years" },
    { "No.": 3, "First Name": "Charlie", Age: "18 years" },
    { "No.": 4, "First Name": "David", Age: "40 years" },
    { "No.": 5, "First Name": "Eve", Age: "15 years" },
    { "No.": 6, "First Name": "Frank", Age: "60 years" },
    { "No.": 7, "First Name": "Grace", Age: "20 years" },
    { "No.": 8, "First Name": "Heidi", Age: "30 years 5 months" }, // Test with more complex age string
    { "No.": 9, "First Name": "Ivan", Age: "Unknown" }, // Test with non-numeric age
  ];

  it("should return all members if no age range is specified", () => {
    const filtered = filterMembersByAge(members);
    expect(filtered).toHaveLength(members.length);
  });

  it("should filter members by minimum age", () => {
    const filtered = filterMembersByAge(members, 25);
    expect(filtered).toHaveLength(6); // Alice, Bob, David, Frank, Grace, Heidi
    expect(filtered.map((m) => m["First Name"])).toEqual(
      expect.arrayContaining(["Alice", "Bob", "David", "Frank", "Grace", "Heidi"]),
    );
  });

  it("should filter members by maximum age", () => {
    const filtered = filterMembersByAge(members, undefined, 30);
    expect(filtered).toHaveLength(6); // Alice, Bob, Charlie, Eve, Grace, Heidi
    expect(filtered.map((m) => m["First Name"])).toEqual(
      expect.arrayContaining(["Alice", "Bob", "Charlie", "Eve", "Grace", "Heidi"]),
    );
  });

  it("should filter members by both minimum and maximum age", () => {
    const filtered = filterMembersByAge(members, 20, 40);
    expect(filtered).toHaveLength(5); // Alice, Bob, David, Grace, Heidi
    expect(filtered.map((m) => m["First Name"])).toEqual(
      expect.arrayContaining(["Alice", "Bob", "David", "Grace", "Heidi"]),
    );
  });

  it("should handle members with complex age strings", () => {
    const filtered = filterMembersByAge(members, 30, 35);
    expect(filtered).toHaveLength(2); // Bob, Heidi
    expect(filtered.map((m) => m["First Name"])).toEqual(
      expect.arrayContaining(["Bob", "Heidi"]),
    );
  });

  it("should exclude members with non-numeric age strings", () => {
    const filtered = filterMembersByAge(members, 1, 100);
    expect(filtered).toHaveLength(8); // All except Ivan
    expect(filtered.map((m) => m["First Name"])).not.toContain("Ivan");
  });

  it("should return an empty array if no members match the criteria", () => {
    const filtered = filterMembersByAge(members, 70, 80);
    expect(filtered).toHaveLength(0);
  });

  it("should return an empty array if the input members array is empty", () => {
    const filtered = filterMembersByAge([], 20, 30);
    expect(filtered).toHaveLength(0);
  });
});

describe("reconcileMembers", () => {
  const masterList: MemberRecordA[] = [
    { "No.": 1, "First Name": "John", Surname: "Doe", "Membership Number": "1001" },
    { "No.": 2, "First Name": "Jane", Surname: "Smith", "Membership Number": "1002" },
    { "No.": 3, "First Name": "Peter", Surname: "Jones", "Membership Number": "1003" },
  ];

  it("should identify new members when they are not in the master list", () => {
    const currentData: MemberRecordA[] = [
      ...masterList,
      { "No.": 4, "First Name": "Alice", Surname: "Brown", "Membership Number": "1004" },
    ];
    const report = reconcileMembers(currentData, masterList);
    expect(report.newMembers).toHaveLength(1);
    expect(report.newMembers[0]["First Name"]).toBe("Alice");
    expect(report.missingMembers).toHaveLength(0);
  });

  it("should identify missing members when they are not in the current data", () => {
    const currentData: MemberRecordA[] = [
      { "No.": 1, "First Name": "John", Surname: "Doe", "Membership Number": "1001" },
      { "No.": 3, "First Name": "Peter", Surname: "Jones", "Membership Number": "1003" },
    ];
    const report = reconcileMembers(currentData, masterList);
    expect(report.newMembers).toHaveLength(0);
    expect(report.missingMembers).toHaveLength(1);
    expect(report.missingMembers[0]["First Name"]).toBe("Jane");
  });

  it("should identify both new and missing members", () => {
    const currentData: MemberRecordA[] = [
      { "No.": 1, "First Name": "John", Surname: "Doe", "Membership Number": "1001" },
      { "No.": 4, "First Name": "Alice", Surname: "Brown", "Membership Number": "1004" },
    ];
    const report = reconcileMembers(currentData, masterList);
    expect(report.newMembers).toHaveLength(1);
    expect(report.newMembers[0]["First Name"]).toBe("Alice");
    expect(report.missingMembers).toHaveLength(2);
    expect(report.missingMembers.map((m) => m["First Name"])) .toEqual(
      expect.arrayContaining(["Jane", "Peter"]),
    );
  });

  it("should return empty arrays if no changes", () => {
    const currentData: MemberRecordA[] = [...masterList];
    const report = reconcileMembers(currentData, masterList);
    expect(report.newMembers).toHaveLength(0);
    expect(report.missingMembers).toHaveLength(0);
  });

  it("should handle empty current data", () => {
    const currentData: MemberRecordA[] = [];
    const report = reconcileMembers(currentData, masterList);
    expect(report.newMembers).toHaveLength(0);
    expect(report.missingMembers).toHaveLength(3);
  });

  it("should handle empty master list", () => {
    const currentData: MemberRecordA[] = [
      { "No.": 1, "First Name": "John", Surname: "Doe", "Membership Number": "1001" },
    ];
    const report = reconcileMembers(currentData, []);
    expect(report.newMembers).toHaveLength(1);
    expect(report.missingMembers).toHaveLength(0);
  });

  it("should use 'Membership Number' for reconciliation if available", () => {
    const masterListWithMembershipNumber: MemberRecordA[] = [
      { "First Name": "John", Surname: "Doe", "Membership Number": "MN001" },
    ];
    const currentDataWithMembershipNumber: MemberRecordA[] = [
      { "First Name": "John", Surname: "Doe", "Membership Number": "MN001" },
      { "First Name": "Jane", Surname: "Smith", "Membership Number": "MN002" },
    ];
    const report = reconcileMembers(currentDataWithMembershipNumber, masterListWithMembershipNumber);
    expect(report.newMembers).toHaveLength(1);
    expect(report.newMembers[0]["Membership Number"]).toBe("MN002");
    expect(report.missingMembers).toHaveLength(0);
  });

  it("should use 'First Name' and 'Surname' for reconciliation if 'Membership Number' is not available", () => {
    const masterListWithoutMembershipNumber: MemberRecordA[] = [
      { "First Name": "John", Surname: "Doe" },
    ];
    const currentDataWithoutMembershipNumber: MemberRecordA[] = [
      { "First Name": "John", Surname: "Doe" },
      { "First Name": "Jane", Surname: "Smith" },
    ];
    const report = reconcileMembers(currentDataWithoutMembershipNumber, masterListWithoutMembershipNumber);
    expect(report.newMembers).toHaveLength(1);
    expect(report.newMembers[0]["First Name"]).toBe("Jane");
    expect(report.missingMembers).toHaveLength(0);
  });
});

describe("parseExcelFile", () => {
  // Mock FileReader
  class MockFileReader {
    onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
    onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
    result: ArrayBuffer | string | null = null;
    readAsArrayBuffer(_blob: Blob) {
      // Simulate async read
      setTimeout(() => {
        this.result = new ArrayBuffer(8); // Dummy buffer
        if (this.onload) {
          const mockEvent = {
            target: { result: this.result },
          } as unknown as ProgressEvent<FileReader>;
          this.onload.call(this as any, mockEvent);
        }
      }, 100);
    }
    readAsBinaryString(_file: File) {
      // Simulate async read for binary string
      setTimeout(() => {
        this.result = "dummy binary string"; // Dummy binary string
        if (this.onload) {
          const mockEvent = {
            target: { result: this.result },
          } as unknown as ProgressEvent<FileReader>;
          this.onload.call(this as any, mockEvent);
        }
      }, 100);
    }
  }

  // Mock File object
  const mockFile = new File(["dummy content"], "test.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  beforeEach(() => {
    vi.resetAllMocks();
    // Mock global FileReader
    vi.stubGlobal("FileReader", MockFileReader);
    // Reset mocks for xlsx
    vi.mocked(XLSX.read).mockClear();
    vi.mocked(XLSX.utils.sheet_to_json).mockClear();
  });

  it("should parse an Excel file and return JSON data", async () => {
    const mockJsonData = [
      { "First Name": "Test", Surname: "User" },
    ];
    vi.mocked(XLSX.read).mockReturnValueOnce({ SheetNames: ["Sheet1"], Sheets: { Sheet1: {} } });
    vi.mocked(XLSX.utils.sheet_to_json).mockReturnValueOnce(mockJsonData);

    const result = await parseExcelFile(mockFile);

    expect(vi.mocked(XLSX.read)).toHaveBeenCalledOnce();
    expect(vi.mocked(XLSX.utils.sheet_to_json)).toHaveBeenCalledOnce();
    expect(result).toEqual(mockJsonData);
  });

  it("should throw an error if file parsing fails", async () => {
    vi.mocked(XLSX.read).mockImplementationOnce(() => {
      throw new Error("Parsing error");
    });

    await expect(parseExcelFile(mockFile)).rejects.toThrow("Parsing error");
  });

  it("should throw an error if no sheets are found", async () => {
    vi.mocked(XLSX.read).mockReturnValueOnce({ SheetNames: [], Sheets: {} }); // No sheets

    await expect(parseExcelFile(mockFile)).rejects.toThrow("No sheets found in the Excel file.");
  });

  it("should throw an error if sheet_to_json fails", async () => {
    vi.mocked(XLSX.read).mockReturnValueOnce({ SheetNames: ["Sheet1"], Sheets: { Sheet1: {} } });
    vi.mocked(XLSX.utils.sheet_to_json).mockImplementationOnce(() => {
      throw new Error("JSON conversion error");
    });

    await expect(parseExcelFile(mockFile)).rejects.toThrow("JSON conversion error");
  });
});

describe("exportToExcel", () => {
  const mockSaveAs = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("saveAs", mockSaveAs);
    vi.mocked(XLSX.utils.book_new).mockClear();
    vi.mocked(XLSX.utils.json_to_sheet).mockClear();
    vi.mocked(XLSX.utils.book_append_sheet).mockClear();
    vi.mocked(XLSX.writeFile).mockClear();
  });

  const mockTitheData: TitheRecordB[] = [
    {
      "No.": 1,
      "Transaction Type": "Individual Tithe-[Income]",
      "Payment Source Type": "Registered Member",
      "Membership Number": "Test User (123)",
      "Transaction Date ('DD-MMM-YYYY')": "15-AUG-2025",
      Currency: "GHS",
      "Exchange Rate": 1,
      "Payment Method": "Cash",
      "Transaction Amount": 100,
      "Narration/Description": "Tithe for 15-AUG-2025",
    },
  ];
  const mockFileName = "test_export";

  it("should call xlsx export functions with correct data and filename", () => {
    exportToExcel(mockTitheData, mockFileName);

    expect(vi.mocked(XLSX.utils.book_new)).toHaveBeenCalledOnce();
    expect(vi.mocked(XLSX.utils.json_to_sheet)).toHaveBeenCalledWith(mockTitheData);
    expect(vi.mocked(XLSX.utils.book_append_sheet)).toHaveBeenCalledOnce();
    expect(vi.mocked(XLSX.writeFile)).toHaveBeenCalledWith(expect.any(Object), `${mockFileName}.xlsx`);
  });

  it("should handle empty data gracefully", () => {
    exportToExcel([], mockFileName);

    expect(vi.mocked(XLSX.utils.book_new)).toHaveBeenCalledOnce();
    expect(vi.mocked(XLSX.utils.json_to_sheet)).toHaveBeenCalledWith([]);
    expect(vi.mocked(XLSX.writeFile)).toHaveBeenCalledOnce();
  });

  it("should use default filename if none provided", () => {
    exportToExcel(mockTitheData, ""); // Empty filename
    expect(vi.mocked(XLSX.writeFile)).toHaveBeenCalledWith(expect.any(Object), `exported_data.xlsx`);
  });
});
