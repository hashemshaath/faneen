import { describe, it, expect } from 'vitest';
import {
  parseBulkInviteCsv,
  tokenizeCsv,
  isValidEmailDomain,
  summarizeParseResult,
  ALLOWED_ROLES,
  FIELD_ERROR_LABELS,
  FILE_ERROR_LABELS,
  type FieldErrorCode,
} from '../parser';

const header = 'email,full_name,role,message';

describe('isValidEmailDomain', () => {
  it('accepts standard domains', () => {
    expect(isValidEmailDomain('example.com')).toBe(true);
    expect(isValidEmailDomain('sub.example.co.uk')).toBe(true);
  });
  it('rejects malformed domains', () => {
    expect(isValidEmailDomain('')).toBe(false);
    expect(isValidEmailDomain('nodot')).toBe(false);
    expect(isValidEmailDomain('-bad.com')).toBe(false);
    expect(isValidEmailDomain('bad-.com')).toBe(false);
    expect(isValidEmailDomain('double..dot.com')).toBe(false);
    expect(isValidEmailDomain('tld.1')).toBe(false);
  });
});

describe('tokenizeCsv', () => {
  it('parses quoted fields with embedded commas and escaped quotes', () => {
    const rows = tokenizeCsv('a,b\n"x,y","he said ""hi"""');
    expect(rows).toEqual([
      ['a', 'b'],
      ['x,y', 'he said "hi"'],
    ]);
  });
  it('skips fully blank lines', () => {
    expect(tokenizeCsv('a,b\n\n\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
});

describe('parseBulkInviteCsv', () => {
  it('flags an empty file', () => {
    const r = parseBulkInviteCsv('');
    expect(r.headerErrors).toContain('file_empty');
    expect(r.rows).toHaveLength(0);
  });

  it('detects missing required columns', () => {
    const r = parseBulkInviteCsv('email,role\na@b.com,user');
    expect(r.headerErrors).toContain('columns_missing');
    expect(r.missingColumns).toContain('full_name');
  });

  it('treats message as optional', () => {
    const r = parseBulkInviteCsv('email,full_name,role\nahmed@example.com,Ahmed,user');
    expect(r.missingColumns).not.toContain('message');
    expect(r.rows[0].errors).toHaveLength(0);
  });

  it('validates each field with stable codes', () => {
    const csv = [
      header,
      'bad-email,Foo,user,',
      'a@nodot,Foo,user,',
      'ok@example.com,Foo,wizard,',
      'ok2@example.com,,user,',
      ' , , , x', // whitespace-only required fields, with marker so row is not filtered
    ].join('\n');
    const r = parseBulkInviteCsv(csv);
    const codes = (i: number): FieldErrorCode[] => r.rows[i].errors.map((e) => e.code);
    expect(codes(0)).toContain('email_invalid_format');
    expect(codes(1)).toContain('email_invalid_format');
    expect(codes(2)).toContain('role_invalid');
    expect(codes(3)).toContain('full_name_required');
    expect(codes(4)).toEqual(
      expect.arrayContaining(['email_required', 'full_name_required', 'role_required']),
    );
  });

  it('detects duplicate emails across rows (case-insensitive)', () => {
    const csv = [
      header,
      'dup@example.com,Alice,user,',
      'DUP@example.com,Bob,admin,',
    ].join('\n');
    const r = parseBulkInviteCsv(csv);
    expect(r.rows[1].errors.map((e) => e.code)).toContain('email_duplicate');
    expect(r.rows[0].errors).toHaveLength(0);
  });

  it('enforces length limits', () => {
    const long = 'x'.repeat(121);
    const csv = [header, `ok@example.com,${long},user,${'y'.repeat(501)}`].join('\n');
    const codes = parseBulkInviteCsv(csv).rows[0].errors.map((e) => e.code);
    expect(codes).toContain('full_name_too_long');
    expect(codes).toContain('message_too_long');
  });

  it('accepts all allowed roles', () => {
    const csv = [
      header,
      ...ALLOWED_ROLES.map((r, i) => `u${i}@example.com,Name ${i},${r},`),
    ].join('\n');
    const r = parseBulkInviteCsv(csv);
    expect(r.rows.every((row) => row.errors.length === 0)).toBe(true);
  });

  it('handles BOM and CRLF', () => {
    const csv = '\uFEFF' + [header, 'ok@example.com,Foo,user,'].join('\r\n');
    const r = parseBulkInviteCsv(csv);
    expect(r.headerErrors).toHaveLength(0);
    expect(r.rows[0].errors).toHaveLength(0);
  });

  it('tolerates corrupt rows without throwing', () => {
    const csv = [header, '"unterminated,Foo,user,'].join('\n');
    expect(() => parseBulkInviteCsv(csv)).not.toThrow();
  });

  it('summarises totals correctly', () => {
    const r = parseBulkInviteCsv(
      [header, 'a@example.com,A,user,', 'bad,,user,'].join('\n'),
    );
    expect(summarizeParseResult(r)).toMatchObject({ total: 2, valid: 1, invalid: 1 });
  });

  it('exposes bilingual labels for every error code', () => {
    for (const code of Object.keys(FIELD_ERROR_LABELS)) {
      expect(FIELD_ERROR_LABELS[code as FieldErrorCode].ar).toBeTruthy();
      expect(FIELD_ERROR_LABELS[code as FieldErrorCode].en).toBeTruthy();
    }
    expect(Object.keys(FILE_ERROR_LABELS)).toEqual(
      expect.arrayContaining(['file_empty', 'columns_missing', 'unparseable', 'header_missing']),
    );
  });
});