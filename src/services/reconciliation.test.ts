import { describe, it, expect } from 'vitest';
import { findMemberByName } from './reconciliation';
import { MemberRecordA } from '@/types';

describe('reconciliation', () => {
  describe('findMemberByName', () => {
    const mockMasterData: MemberRecordA[] = [
      {
        "No.": 1,
        "Membership Number": "TAC123",
        "Old Membership Number": "OLD123",
        "Surname": "Doe",
        "First Name": "John",
        "Other Names": "Kwame",
        "Gender": "M",
        "Date of Birth": "1990-01-01",
        "Marital Status": "Single",
        "Telephone Number": "0123456789",
        "Occupation": "Engineer",
        "Hometown": "Accra",
        "Residence": "Accra",
        "Date of Baptism": "2000-01-01",
        "Place of Baptism": "Accra",
        "Date of Holy Ghost Baptism": "2005-01-01",
        "Offices Held": "None",
        "Previous Local Assembly": "None",
        "Date of Arrival": "2010-01-01",
        "Remarks": "",
      },
      {
        "No.": 2,
        "Membership Number": "TAC456",
        "Old Membership Number": "",
        "Surname": "Smith",
        "First Name": "Jane",
        "Other Names": "",
        "Gender": "F",
        "Date of Birth": "1992-01-01",
        "Marital Status": "Married",
        "Telephone Number": "0987654321",
        "Occupation": "Teacher",
        "Hometown": "Kumasi",
        "Residence": "Kumasi",
        "Date of Baptism": "2002-01-01",
        "Place of Baptism": "Kumasi",
        "Date of Holy Ghost Baptism": "",
        "Offices Held": "",
        "Previous Local Assembly": "",
        "Date of Arrival": "",
        "Remarks": "",
      }
    ];

    it('should find an exact match', () => {
      const result = findMemberByName('John Kwame Doe', mockMasterData);
      expect(result).not.toBeNull();
      expect(result?.member["Membership Number"]).toBe('TAC123');
      expect(result?.score).toBe(1);
    });

    it('should find a match with slight typo', () => {
      const result = findMemberByName('Jon Kwame Doe', mockMasterData);
      expect(result).not.toBeNull();
      expect(result?.member["Membership Number"]).toBe('TAC123');
      expect(result?.score).toBeGreaterThan(0.8);
    });

    it('should find a match with different name order (if implementation supports it - checking combinations)', () => {
      // The implementation generates combinations:
      // [Surname, First, Other], [Surname, Other, First], [First, Surname, Other], etc.
      // So "Doe John Kwame" should match "John Kwame Doe" if the combination "Doe John Kwame" is generated.
      const result = findMemberByName('Doe John Kwame', mockMasterData);
      expect(result).not.toBeNull();
      expect(result?.member["Membership Number"]).toBe('TAC123');
    });

    it('should not find a match if similarity is too low', () => {
      const result = findMemberByName('Xavier Unknown', mockMasterData);
      expect(result).toBeNull();
    });

    it('should return the best match among multiple candidates', () => {
      // Add a similar member
      const dataWithSimilar = [
        ...mockMasterData,
        { ...mockMasterData[0], "First Name": "Johnny", "Membership Number": "TAC124" }
      ];
      // "Johnny" is closer to "Johnny" than "John"
      const result = findMemberByName('Johnny Kwame Doe', dataWithSimilar);
      expect(result?.member["Membership Number"]).toBe('TAC124');
    });
  });
});
