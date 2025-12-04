/// <reference types="vitest/globals" />
import { guessAssemblyFromMembers } from "./excelUtils";
import { MemberRecordA } from "../types";

describe("guessAssemblyFromMembers", () => {
    it("should return null for empty array", () => {
        expect(guessAssemblyFromMembers([])).toBeNull();
    });

    it("should detect assembly from Hometown field", () => {
        const members: MemberRecordA[] = [
            { "No.": 1, "First Name": "John", Surname: "Doe", Hometown: "Jei Krodua" },
            { "No.": 2, "First Name": "Jane", Surname: "Smith", Hometown: "Jei-Krodua" },
            { "No.": 3, "First Name": "Bob", Surname: "Jones", Hometown: "Jei Krodua Central" },
        ];

        const result = guessAssemblyFromMembers(members);
        expect(result?.toLowerCase()).toContain("jei");
    });

    it("should detect assembly from Place of Birth", () => {
        const members: MemberRecordA[] = [
            { "No.": 1, "First Name": "Alice", Surname: "Brown", "Place of Birth": "Tema" },
            { "No.": 2, "First Name": "Charlie", Surname: "White", "Place of Birth": "Tema Central" },
            { "No.": 3, "First Name": "Diana", Surname: "Black", "Place of Birth": "Tema" },
        ];

        const result = guessAssemblyFromMembers(members);
        expect(result?.toLowerCase()).toContain("tema");
    });

    it("should return null when no clear pattern", () => {
        // Need 6+ members where each location appears only once (16.6% < 20%)
        const members: MemberRecordA[] = [
            { "No.": 1, "First Name": "A", Surname: "One", Hometown: "Place A" },
            { "No.": 2, "First Name": "B", Surname: "Two", Hometown: "Place B" },
            { "No.": 3, "First Name": "C", Surname: "Three", Hometown: "Place C" },
            { "No.": 4, "First Name": "D", Surname: "Four", Hometown: "Place D" },
            { "No.": 5, "First Name": "E", Surname: "Five", Hometown: "Place E" },
            { "No.": 6, "First Name": "F", Surname: "Six", Hometown: "Place F" },
        ];

        // Each location appears only once (16.6%), below 20% threshold
        const result = guessAssemblyFromMembers(members);
        expect(result).toBeNull();
    });
});
