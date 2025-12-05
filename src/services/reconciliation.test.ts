import { describe, it, expect } from 'vitest';
import { findMemberByNameSync } from './reconciliation';
import { MemberRecordA } from '@/types';

describe('reconciliation', () => {
  describe('findMemberByNameSync', () => {
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
        "Surname": "Mensah",
        "First Name": "Jonathan",
        "Other Names": "Addo",
        "Gender": "M",
        "Date of Birth": "1985-05-15",
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
      const result = findMemberByNameSync('John Kwame Doe', mockMasterData);
      expect(result).not.toBeNull();
      expect(result?.member["Membership Number"]).toBe('TAC123');
      expect(result?.score).toBeGreaterThanOrEqual(0.9);
      expect(result?.confidenceTier).toBe('high');
    });

    it('should find a match with slight typo', () => {
      const result = findMemberByNameSync('Jon Kwame Doe', mockMasterData);
      expect(result).not.toBeNull();
      expect(result?.member["Membership Number"]).toBe('TAC123');
      expect(result?.score).toBeGreaterThan(0.8);
    });

    it('should find a match with different name order', () => {
      const result = findMemberByNameSync('Doe John Kwame', mockMasterData);
      expect(result).not.toBeNull();
      expect(result?.member["Membership Number"]).toBe('TAC123');
    });

    it('should not find a match if similarity is too low', () => {
      const result = findMemberByNameSync('Xavier Unknown', mockMasterData);
      expect(result).toBeNull();
    });

    it('should return the best match among multiple candidates', () => {
      const dataWithSimilar = [
        ...mockMasterData,
        { ...mockMasterData[0], "First Name": "Johnny", "Membership Number": "TAC124" }
      ];
      const result = findMemberByNameSync('Johnny Kwame Doe', dataWithSimilar);
      expect(result?.member["Membership Number"]).toBe('TAC124');
    });

    // NEW: OCR-specific tests
    describe('OCR-aware matching', () => {
      it('should match OCR text with number substitutions (5->S, 0->O)', () => {
        // "JOEATHAN ADD0 MEN5AH" should match "JONATHAN ADDO MENSAH"
        const result = findMemberByNameSync('JOEATHAN ADD0 MEN5AH', mockMasterData);
        expect(result).not.toBeNull();
        expect(result?.member["Membership Number"]).toBe('TAC456');
        expect(result?.score).toBeGreaterThanOrEqual(0.65);
      });

      it('should match with missing characters', () => {
        // "JON DOE" -> "JOHN DOE"
        const result = findMemberByNameSync('JON DOE', mockMasterData);
        expect(result).not.toBeNull();
        expect(result?.member["Membership Number"]).toBe('TAC123');
      });

      it('should match with extra characters from OCR artifacts', () => {
        // "JOHN| DOE" -> "JOHN DOE" (after OCR normalization)
        const result = findMemberByNameSync('JOHN| DOE', mockMasterData);
        expect(result).not.toBeNull();
        expect(result?.member["Membership Number"]).toBe('TAC123');
      });

      it('should return correct confidence tier', () => {
        const highResult = findMemberByNameSync('John Doe', mockMasterData);
        expect(highResult?.confidenceTier).toBe('high');

        const mediumResult = findMemberByNameSync('JOEATHAN MENSAH', mockMasterData);
        if (mediumResult) {
          expect(['high', 'medium']).toContain(mediumResult.confidenceTier);
        }
      });
    });
  });
});
