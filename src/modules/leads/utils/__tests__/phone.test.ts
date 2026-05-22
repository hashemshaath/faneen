import { describe, it, expect } from 'vitest';
import { normalizePhoneForWhatsApp } from '../phone';

describe('normalizePhoneForWhatsApp', () => {
  it('keeps +966 prefix as 966', () => {
    expect(normalizePhoneForWhatsApp('+966501234567')).toBe('966501234567');
  });
  it('converts leading 0 to 966', () => {
    expect(normalizePhoneForWhatsApp('0501234567')).toBe('966501234567');
  });
  it('prefixes bare 5x with 966', () => {
    expect(normalizePhoneForWhatsApp('501234567')).toBe('966501234567');
  });
  it('strips spaces and dashes', () => {
    expect(normalizePhoneForWhatsApp('+966 50 123 4567')).toBe('966501234567');
    expect(normalizePhoneForWhatsApp('050-123-4567')).toBe('966501234567');
  });
});