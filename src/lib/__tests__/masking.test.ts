import { describe, it, expect } from 'vitest';
import { maskEmail, maskPhone, maskName, obfuscateEmail } from '../masking';

describe('maskEmail', () => {
  it('returns dash for empty', () => {
    expect(maskEmail(null)).toBe('—');
    expect(maskEmail('')).toBe('—');
  });
  it('masks local and domain but preserves TLD', () => {
    const out = maskEmail('ahmed@example.com');
    expect(out).toContain('@');
    expect(out.endsWith('.com')).toBe(true);
    expect(out).not.toContain('ahmed@example');
  });
  it('handles malformed (no @)', () => {
    expect(maskEmail('notanemail')).toBe('••••••');
  });
});

describe('maskPhone', () => {
  it('keeps last 3 digits and + prefix', () => {
    const out = maskPhone('+966501234567');
    expect(out.startsWith('+')).toBe(true);
    expect(out.endsWith('567')).toBe(true);
    expect(out).not.toContain('501234');
  });
  it('handles short numbers', () => {
    expect(maskPhone('12')).toBe('••');
  });
  it('returns dash for empty', () => {
    expect(maskPhone(null)).toBe('—');
  });
});

describe('maskName', () => {
  it('abbreviates last name', () => {
    expect(maskName('Ahmed Al-Saud')).toBe('Ahmed A.');
  });
  it('keeps single name as-is', () => {
    expect(maskName('Ahmed')).toBe('Ahmed');
  });
  it('returns dash for empty', () => {
    expect(maskName('')).toBe('—');
    expect(maskName(null)).toBe('—');
  });
});

describe('obfuscateEmail', () => {
  it('encodes every character as HTML entity', () => {
    const out = obfuscateEmail('a@b');
    expect(out).toBe('&#97;&#64;&#98;');
  });
  it('returns empty for empty', () => {
    expect(obfuscateEmail('')).toBe('');
  });
});