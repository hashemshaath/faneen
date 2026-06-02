import { describe, it, expect } from 'vitest';
import { getBusinessPrimaryPhone, formatPrimaryPhone } from '@/lib/business/primaryPhone';

describe('getBusinessPrimaryPhone — unified main number', () => {
  it('returns the canonical phone field first', () => {
    expect(getBusinessPrimaryPhone({
      phone: '+966500000001',
      customer_service_phone: '+966500000002',
      account_manager_phone: '+966500000003',
    })).toBe('+966500000001');
  });

  it('falls back to customer_service_phone when phone is empty', () => {
    expect(getBusinessPrimaryPhone({
      phone: '',
      customer_service_phone: '+966500000010',
    })).toBe('+966500000010');
  });

  it('falls back to account_manager_phone last', () => {
    expect(getBusinessPrimaryPhone({
      phone: null,
      customer_service_phone: null,
      account_manager_phone: '+966500000020',
    })).toBe('+966500000020');
  });

  it('trims whitespace and ignores whitespace-only values', () => {
    expect(getBusinessPrimaryPhone({ phone: '  +966500000099  ' })).toBe('+966500000099');
    expect(getBusinessPrimaryPhone({ phone: '   ', customer_service_phone: '+966500111222' }))
      .toBe('+966500111222');
  });

  it('returns null when no phone field is set', () => {
    expect(getBusinessPrimaryPhone({})).toBeNull();
    expect(getBusinessPrimaryPhone(null)).toBeNull();
    expect(getBusinessPrimaryPhone(undefined)).toBeNull();
  });

  it('formatPrimaryPhone is safe with empty/null', () => {
    expect(formatPrimaryPhone(null)).toBe('');
    expect(formatPrimaryPhone('')).toBe('');
    expect(formatPrimaryPhone('  +966500000001 ')).toBe('+966500000001');
  });
});