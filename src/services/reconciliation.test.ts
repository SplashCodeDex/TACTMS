/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import { reconcileMembers } from './reconciliation';
import { MemberRecordA } from '../types';

describe('reconciliation.reconcileMembers', () => {
  it('matches by OldID when current ID is missing in new data', () => {
    const master: MemberRecordA[] = [
      { 'No.': 1, 'First Name': 'A', Surname: 'B', 'Membership Number': 'CURR1', 'Old Membership Number': 'OLD1' },
    ];
    const incoming: MemberRecordA[] = [
      { 'No.': 1, 'First Name': 'A', Surname: 'B', 'Old Membership Number': 'OLD1' },
    ];

    const report = reconcileMembers(incoming, master);
    expect(report.newMembers.length).toBe(0);
    expect(report.changedMembers.length).toBe(1); // matched by OldID, current ID differs so changes are recorded
  });

  it('detects conflicts by name when IDs differ', () => {
    const master: MemberRecordA[] = [
      { 'No.': 1, 'First Name': 'A', Surname: 'B', 'Membership Number': 'CURR1' },
    ];
    const incoming: MemberRecordA[] = [
      { 'No.': 2, 'First Name': 'A', Surname: 'B', 'Membership Number': 'DIFF' },
    ];

    const report = reconcileMembers(incoming, master);
    expect(report.conflicts.length).toBe(1);
    expect(report.newMembers.length).toBe(0);
  });

  it('records changes only when values differ', () => {
    const master: MemberRecordA[] = [
      { 'No.': 1, 'First Name': 'A', Surname: 'B', 'Membership Number': 'CURR1', 'Phone Number': '123' },
    ];
    const incomingSame: MemberRecordA[] = [
      { 'No.': 1, 'First Name': 'A', Surname: 'B', 'Membership Number': 'CURR1', 'Phone Number': '123' },
    ];
    const incomingChanged: MemberRecordA[] = [
      { 'No.': 1, 'First Name': 'A', Surname: 'B', 'Membership Number': 'CURR1', 'Phone Number': '456' },
    ];

    const reportSame = reconcileMembers(incomingSame, master);
    expect(reportSame.changedMembers.length).toBe(0);

    const reportChanged = reconcileMembers(incomingChanged, master);
    expect(reportChanged.changedMembers.length).toBe(1);
    expect(reportChanged.changedMembers[0].changes.some(c => c.field === 'Phone Number')).toBe(true);
  });
});
