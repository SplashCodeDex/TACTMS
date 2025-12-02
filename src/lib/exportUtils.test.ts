/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import { escapeCsvField, sanitizeForSpreadsheet, computeColumnWidths } from './exportUtils';

describe('exportUtils.escapeCsvField', () => {
  it('escapes commas, quotes, and newlines', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"');
    expect(escapeCsvField('a"b')).toBe('"a""b"');
    expect(escapeCsvField('a\nb')).toBe('"a\nb"');
    expect(escapeCsvField(null)).toBe('');
  });
});

describe('exportUtils.sanitizeForSpreadsheet', () => {
  it('prefixes dangerous leading characters', () => {
    expect(sanitizeForSpreadsheet('=SUM(1,2)')).toBe('\'=SUM(1,2)');
    expect(sanitizeForSpreadsheet('+ABC')).toBe('\'+ABC');
    expect(sanitizeForSpreadsheet('-XYZ')).toBe('\'-XYZ');
    expect(sanitizeForSpreadsheet('@HANDLE')).toBe('\'@HANDLE');
    expect(sanitizeForSpreadsheet('SAFE')).toBe('SAFE');
  });
});

describe('exportUtils.computeColumnWidths', () => {
  it('computes widths across keys and rows', () => {
    const rows = [
      { A: 'short', B: '123' },
      { A: 'a very very long value', C: 'extra' },
    ];
    const widths = computeColumnWidths(rows);
    expect(Array.isArray(widths)).toBe(true);
    expect(widths.length).toBeGreaterThanOrEqual(3);
    expect(widths.every(w => typeof w.wch === 'number')).toBe(true);
  });
});
