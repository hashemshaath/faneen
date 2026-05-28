import { describe, it, expect } from 'vitest';
import {
  normalizeEmail,
  isSyntheticOrTestEmail,
  areEmailsEquivalent,
  maskEmail,
} from '../canonicalEmail';

describe('canonicalEmail', () => {
  describe('normalizeEmail', () => {
    it('trims and lowercases', () => {
      expect(normalizeEmail('  Foo@BAR.com  ')).toBe('foo@bar.com');
    });
    it('handles null/undefined/empty', () => {
      expect(normalizeEmail(null)).toBe('');
      expect(normalizeEmail(undefined)).toBe('');
      expect(normalizeEmail('')).toBe('');
    });
    it('strips internal whitespace defensively', () => {
      expect(normalizeEmail('a b@c.com')).toBe('ab@c.com');
    });
  });

  describe('isSyntheticOrTestEmail', () => {
    it('flags synthetic phone-login emails', () => {
      expect(isSyntheticOrTestEmail('966500000000@phone.qitaat.local')).toBe(true);
    });
    it('flags example/test domains', () => {
      expect(isSyntheticOrTestEmail('a@example.com')).toBe(true);
      expect(isSyntheticOrTestEmail('a@test.local')).toBe(true);
    });
    it('flags QA prefixes', () => {
      expect(isSyntheticOrTestEmail('test_probe_99@anywhere.com')).toBe(true);
      expect(isSyntheticOrTestEmail('probe_42@x.io')).toBe(true);
    });
    it('returns false for real emails', () => {
      expect(isSyntheticOrTestEmail('hashem@qitaat.com')).toBe(false);
      expect(isSyntheticOrTestEmail('user@gmail.com')).toBe(false);
    });
    it('returns false for empty/null', () => {
      expect(isSyntheticOrTestEmail(null)).toBe(false);
      expect(isSyntheticOrTestEmail('')).toBe(false);
    });
  });

  describe('areEmailsEquivalent', () => {
    it('matches across case and whitespace', () => {
      expect(areEmailsEquivalent('A@B.com', '  a@b.com ')).toBe(true);
    });
    it('rejects empty pairs (no false matches)', () => {
      expect(areEmailsEquivalent('', '')).toBe(false);
      expect(areEmailsEquivalent(null, 'a@b.com')).toBe(false);
    });
    it('rejects different addresses', () => {
      expect(areEmailsEquivalent('a@b.com', 'a@c.com')).toBe(false);
    });
  });

  describe('maskEmail', () => {
    it('masks the local part and domain head', () => {
      const m = maskEmail('hashem@qitaat.com');
      expect(m).toMatch(/@/);
      expect(m).not.toBe('hashem@qitaat.com');
    });
    it('handles null/undefined safely', () => {
      expect(maskEmail(null)).toBe('—');
      expect(maskEmail(undefined)).toBe('—');
    });
  });
});