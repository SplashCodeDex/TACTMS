

import * as XLSX from 'xlsx';
import { MemberRecordA, TitheRecordB, ConcatenationConfig, MembershipReconciliationReport } from '../types.ts';

export const parseExcelFile = (file: File): Promise<MemberRecordA[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          reject(new Error("File data is null"));
          return;
        }
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<MemberRecordA>(worksheet, {
            raw: false,
            dateNF: 'dd-mmm-yyyy',
        });
        resolve(jsonData);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const parseAgeStringToYears = (ageString: string | undefined): number | null => {
  if (!ageString || typeof ageString !== 'string') return null;
  const match = ageString.match(/^(\d+)\s*years?/i);
  return match ? parseInt(match[1], 10) : null;
};

// Helper to format date as DD-MMM-YYYY
export const formatDateDDMMMYYYY = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export const filterMembersByAge = (
  members: MemberRecordA[],
  minAge?: number,
  maxAge?: number
): MemberRecordA[] => {
  if (minAge === undefined && maxAge === undefined) return members;
  return members.filter(member => {
    const ageInYears = parseAgeStringToYears(member.Age);
    if (ageInYears === null) return true; 

    let meetsMin = true;
    let meetsMax = true;

    if (minAge !== undefined) {
      meetsMin = ageInYears >= minAge;
    }
    if (maxAge !== undefined) {
      meetsMax = ageInYears <= maxAge;
    }
    return meetsMin && meetsMax;
  });
};

export const createTitheList = (
  members: MemberRecordA[],
  config: ConcatenationConfig,
  selectedDate: Date, 
  descriptionTemplate: string,
  amountMappingColumn?: string | null
): TitheRecordB[] => {
  const formattedDate = formatDateDDMMMYYYY(selectedDate);
  const description = descriptionTemplate.replace(/{DD-MMM-YYYY}/gi, formattedDate);

  return members.map((member, index) => {
    // Heuristic to detect if we're processing a raw data file (with name parts)
    // vs a previously generated file (without separate name parts).
    const isProcessingRawData = !!(member['First Name'] || member['Surname']);

    let namePart = '';
    // This will only populate if the fields exist, which is true for raw data
    if (config.Title && member.Title) namePart += `${member.Title} `;
    if (config['First Name'] && member['First Name']) namePart += `${member['First Name']} `;
    if (config.Surname && member.Surname) namePart += `${member.Surname} `;
    if (config['Other Names'] && member['Other Names']) namePart += `${member['Other Names']} `;
    namePart = namePart.trim();

    let numberPart = '';
    if (config['Membership Number']) {
        const mainMemberNum = member['Membership Number']?.trim() || '';
        const oldMemberNum = member['Old Membership Number']?.trim() || '';

        if (mainMemberNum && oldMemberNum) {
            numberPart = `(${mainMemberNum}|${oldMemberNum})`;
        } else if (mainMemberNum) {
            // Only wrap with parentheses if we're processing raw data.
            // If it's a re-upload, mainMemberNum is likely the full name and number,
            // so we shouldn't add extra parens. In that case, `namePart` is empty.
            numberPart = isProcessingRawData ? `(${mainMemberNum})` : mainMemberNum;
        } else if (oldMemberNum) {
            numberPart = `(${oldMemberNum})`;
        }
    }
    
    let concatenatedName = namePart;
    if (numberPart) {
        // If we're processing a re-upload (`namePart` is empty), use `numberPart` directly.
        // Otherwise, combine them.
        concatenatedName = namePart ? `${namePart} ${numberPart}` : numberPart;
    }
    
    concatenatedName = concatenatedName.trim();
    if (concatenatedName === "()" && !namePart && !member['Membership Number'] && !member['Old Membership Number']) {
      concatenatedName = "";
    }

    let transactionAmount: number | string = '';
    if (amountMappingColumn && member[amountMappingColumn] !== undefined && member[amountMappingColumn] !== null) {
        const rawAmount = member[amountMappingColumn];
        if (typeof rawAmount === 'number') {
            transactionAmount = rawAmount >= 0 ? rawAmount : '';
        } else if (typeof rawAmount === 'string' && rawAmount.trim() !== '') {
            const parsedAmount = parseFloat(rawAmount.trim().replace(/,/g, ''));
            transactionAmount = !isNaN(parsedAmount) && parsedAmount >= 0 ? parsedAmount : '';
        }
    }

    return {
      'No.': member['No.'] || index + 1, // Use existing No if it's there (from kept members), otherwise index
      'Transaction Type': 'Individual Tithe-[Income]',
      'Payment Source Type': 'Registered Member',
      'Membership Number': concatenatedName,
      'Transaction Date (\'DD-MMM-YYYY\')': formattedDate,
      Currency: 'GHS',
      'Exchange Rate': 1,
      'Payment Method': 'Cash',
      'Transaction Amount': transactionAmount, 
      'Narration/Description': description,
    };
  });
};

export const reconcileMembers = (newData: MemberRecordA[], masterData: MemberRecordA[]): Omit<MembershipReconciliationReport, 'previousFileDate'> => {
    const getMemberId = (m: MemberRecordA) => String(m['Membership Number'] || m['Old Membership Number'] || '').trim();

    const masterMemberIds = new Set(masterData.map(getMemberId).filter(id => id));
    const newMemberIds = new Set(newData.map(getMemberId).filter(id => id));
    
    const newMembers: MemberRecordA[] = newData
        .filter(m => {
            const id = getMemberId(m);
            return id && !masterMemberIds.has(id);
        });

    const missingMembers: MemberRecordA[] = masterData
        .filter(m => {
            const id = getMemberId(m);
            return id && !newMemberIds.has(id);
        });

    return {
        newMembers,
        missingMembers,
    };
};


export const exportToExcel = (data: any[], fileName: string): void => {
  if (!data || data.length === 0) {
    console.error("No data provided to export.");
    return;
  }
  
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Auto-fit columns for better readability
  const allKeys = new Set<string>();
  data.forEach(row => Object.keys(row).forEach(key => allKeys.add(key)));

  const colWidths = Array.from(allKeys).map(key => {
    let maxLength = key.length;
    data.forEach(row => {
      const value = row[key];
      if (value != null && String(value).length > maxLength) {
        maxLength = String(value).length;
      }
    });
    return { wch: maxLength + 3 }; // +3 for a little padding
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Exported Data');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};