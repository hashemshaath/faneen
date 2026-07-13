import { describe, it, expect } from 'vitest';
import {
  isQuotaExceededError,
  getQuotaExceededMetric,
  getQuotaMetricLabel,
  formatQuotaExceededMessage,
} from '../quotaErrors';

describe('quotaErrors', () => {
  it('detects quota_exceeded from a PostgREST-shaped error message', () => {
    const err = { message: 'quota_exceeded:services', code: '42501' };
    expect(isQuotaExceededError(err)).toBe(true);
    expect(getQuotaExceededMetric(err)).toBe('services');
  });

  it('detects quota_exceeded when wrapped in nested error object', () => {
    const err = { error: { message: 'ERROR: quota_exceeded:contracts' } };
    expect(isQuotaExceededError(err)).toBe(true);
    expect(getQuotaExceededMetric(err)).toBe('contracts');
  });

  it('detects from thrown Error instances', () => {
    const err = new Error('quota_exceeded:staff');
    expect(isQuotaExceededError(err)).toBe(true);
    expect(getQuotaExceededMetric(err)).toBe('staff');
  });

  it('returns false for unrelated errors', () => {
    expect(isQuotaExceededError({ message: 'permission denied for table' })).toBe(false);
    expect(isQuotaExceededError(null)).toBe(false);
    expect(isQuotaExceededError(undefined)).toBe(false);
    expect(isQuotaExceededError('random string')).toBe(false);
    expect(getQuotaExceededMetric({ message: 'nope' })).toBe(null);
  });

  it('extracts metric even when message has trailing text', () => {
    expect(getQuotaExceededMetric({ message: 'quota_exceeded:portfolio at line 42' })).toBe(
      'portfolio',
    );
  });

  it('formats bilingual labels + full messages', () => {
    expect(getQuotaMetricLabel('services', true)).toBe('الخدمات');
    expect(getQuotaMetricLabel('services', false)).toBe('Services');
    expect(formatQuotaExceededMessage('contracts', true)).toContain('العقود');
    expect(formatQuotaExceededMessage('contracts', false)).toContain('Contracts');
  });

  it('gracefully passes through unknown metric names', () => {
    expect(getQuotaMetricLabel('new_metric', true)).toBe('new_metric');
    expect(formatQuotaExceededMessage('new_metric', true)).toContain('new_metric');
  });
});