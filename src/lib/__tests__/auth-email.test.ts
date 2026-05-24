import { describe, it, expect } from 'vitest';
import {
  isSyntheticPhoneEmail,
  getDisplayEmail,
  getEmailDeliveryAddress,
  MISSING_OFFICIAL_EMAIL_REASON,
} from '../auth-email';

describe('auth-email helpers', () => {
  describe('isSyntheticPhoneEmail', () => {
    it('detects synthetic phone-login auth emails', () => {
      expect(isSyntheticPhoneEmail('966506315300@phone.qitaat.local')).toBe(true);
      expect(isSyntheticPhoneEmail('966500000000@phone.qitaat.local')).toBe(true);
    });
    it('is case-insensitive on the suffix', () => {
      expect(isSyntheticPhoneEmail('966506315300@Phone.Qitaat.Local')).toBe(true);
    });
    it('returns false for real emails', () => {
      expect(isSyntheticPhoneEmail('user@example.com')).toBe(false);
      expect(isSyntheticPhoneEmail('a@phone.qitaat.com')).toBe(false);
    });
    it('returns false for null/undefined/empty', () => {
      expect(isSyntheticPhoneEmail(null)).toBe(false);
      expect(isSyntheticPhoneEmail(undefined)).toBe(false);
      expect(isSyntheticPhoneEmail('')).toBe(false);
    });
  });

  describe('getDisplayEmail', () => {
    it('prefers profileEmail when both present and valid', () => {
      expect(getDisplayEmail({ authEmail: 'a@b.com', profileEmail: 'official@x.com' })).toBe('official@x.com');
    });
    it('returns authEmail when profileEmail missing', () => {
      expect(getDisplayEmail({ authEmail: 'a@b.com', profileEmail: null })).toBe('a@b.com');
    });
    it('returns null when only synthetic auth email exists', () => {
      expect(getDisplayEmail({ authEmail: '966506315300@phone.qitaat.local', profileEmail: null })).toBeNull();
      expect(getDisplayEmail({ authEmail: '966506315300@phone.qitaat.local', profileEmail: '' })).toBeNull();
    });
    it('ignores synthetic value even if mistakenly stored as profileEmail', () => {
      expect(getDisplayEmail({ authEmail: null, profileEmail: '966506315300@phone.qitaat.local' })).toBeNull();
    });
    it('returns profile email when auth is synthetic', () => {
      expect(getDisplayEmail({ authEmail: '966506315300@phone.qitaat.local', profileEmail: 'official@x.com' })).toBe('official@x.com');
    });
    it('returns null when both null', () => {
      expect(getDisplayEmail({ authEmail: null, profileEmail: null })).toBeNull();
    });
    it('rejects invalid email strings', () => {
      expect(getDisplayEmail({ authEmail: 'not-an-email', profileEmail: 'also-bad' })).toBeNull();
    });
  });

  describe('getEmailDeliveryAddress', () => {
    it('returns null for synthetic-only', () => {
      expect(getEmailDeliveryAddress({ authEmail: '966506315300@phone.qitaat.local', profileEmail: null })).toBeNull();
    });
    it('returns deliverable address otherwise', () => {
      expect(getEmailDeliveryAddress({ authEmail: null, profileEmail: 'real@x.com' })).toBe('real@x.com');
    });
  });

  it('exposes a stable reason code', () => {
    expect(MISSING_OFFICIAL_EMAIL_REASON).toBe('missing_official_email');
  });
});
