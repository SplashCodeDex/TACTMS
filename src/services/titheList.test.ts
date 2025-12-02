/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import { createTitheList, parseMemberId } from './titheList';
import { ConcatenationConfig, MemberRecordA } from '../types';

const fullConfig: ConcatenationConfig = {
  Title: true,
  'First Name': true,
  Surname: true,
  'Other Names': true,
  'Membership Number': true,
};

describe('titheList.createTitheList', () => {
  it('handles missing names/IDs gracefully', () => {
    const members: MemberRecordA[] = [
      {
        'No.': 1,
        'First Name': 'JOHN',
        'Surname': 'DOE',
        'Membership Number': '',
        'Old Membership Number': '',
      },
      {
        'No.': 2,
        'First Name': '',
        'Surname': '',
        'Membership Number': 'TAC123',
      },
      {
        'No.': 3,
        'First Name': '',
        'Surname': '',
        'Membership Number': '',
        'Old Membership Number': 'OLD999',
      },
    ];

    const result = createTitheList(members, fullConfig, new Date('2025-08-15'), 'Tithe for {DD-MMM-YYYY}');

    expect(result[0]['Membership Number']).toBe('JOHN DOE');
    expect(result[1]['Membership Number']).toBe('TAC123');
    expect(result[2]['Membership Number']).toBe('(OLD999)');
  });

  it('renders both IDs when both are present', () => {
    const members: MemberRecordA[] = [
      {
        'No.': 1,
        'First Name': 'JONATHAN',
        'Surname': 'MENSAH',
        Title: 'PASTOR',
        'Membership Number': 'TAC89JAM131001',
        'Old Membership Number': '651101008',
      },
    ];
    const result = createTitheList(members, fullConfig, new Date('2025-08-15'), 'Tithe for {DD-MMM-YYYY}');
    expect(result[0]['Membership Number']).toBe('PASTOR JONATHAN MENSAH (TAC89JAM131001|651101008)');
  });

  it('parses amount mapping column with numbers and currency strings', () => {
    const members: MemberRecordA[] = [
      { 'No.': 1, 'First Name': 'A', Surname: 'B', 'Membership Number': 'ID1', Amount: 100 },
      { 'No.': 2, 'First Name': 'C', Surname: 'D', 'Membership Number': 'ID2', Amount: 'GHS 250.50' as any },
      { 'No.': 3, 'First Name': 'E', Surname: 'F', 'Membership Number': 'ID3', Amount: '-10' as any },
      { 'No.': 4, 'First Name': 'G', Surname: 'H', 'Membership Number': 'ID4', Amount: 'invalid' as any },
    ] as any;

    const result = createTitheList(members, fullConfig, new Date('2025-08-15'), 'Desc', 'Amount');

    expect(result[0]['Transaction Amount']).toBe(100);
    expect(result[1]['Transaction Amount']).toBe(250.5);
    expect(result[2]['Transaction Amount']).toBe('');
    expect(result[3]['Transaction Amount']).toBe('');
  });

  it('replaces {DD-MMM-YYYY} in description', () => {
    const members: MemberRecordA[] = [
      { 'No.': 1, 'First Name': 'A', Surname: 'B', 'Membership Number': 'ID1' },
    ];
    const result = createTitheList(members, fullConfig, new Date('2025-02-03'), 'Tithe for {DD-MMM-YYYY}');
    expect(result[0]['Narration/Description']).toBe('Tithe for 03-FEB-2025');
  });
});

describe('titheList.parseMemberId', () => {
  it('extracts ID from tailing parentheses', () => {
    expect(parseMemberId('PASTOR JOHN (TAC123)')).toBe('TAC123');
    expect(parseMemberId('JOHN DOE (OLD|NEW)')).toBe('OLD|NEW');
  });
  it('returns trimmed input when no parentheses', () => {
    expect(parseMemberId(' TAC123 ')).toBe('TAC123');
  });
});
