import { describe, it, expect } from 'vitest';
import {
  SA_COUNTRY_ID, SA_COUNTRY_CODE, SA_CURRENCY, SA_LOCALE, SA_TIMEZONE,
} from '../country';
import { PUBLIC_BARCODE_ROUTE_PREFIX, PUBLIC_SITE_TOKEN_ROUTE_PREFIX } from '../routes';

describe('SA constants', () => {
  it('exposes the canonical Saudi country UUID', () => {
    expect(SA_COUNTRY_ID).toBe('4e37871f-3211-4484-935e-cf8c387cbf80');
  });
  it('exposes ISO code, currency, locale, timezone', () => {
    expect(SA_COUNTRY_CODE).toBe('SA');
    expect(SA_CURRENCY).toBe('SAR');
    expect(SA_LOCALE).toBe('ar-SA');
    expect(SA_TIMEZONE).toBe('Asia/Riyadh');
  });
});

describe('Public route prefixes', () => {
  it('preserves /q and /s prefixes', () => {
    expect(PUBLIC_BARCODE_ROUTE_PREFIX).toBe('/q');
    expect(PUBLIC_SITE_TOKEN_ROUTE_PREFIX).toBe('/s');
  });
});