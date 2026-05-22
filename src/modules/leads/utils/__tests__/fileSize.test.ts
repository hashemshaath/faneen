import { describe, it, expect } from 'vitest';
import { formatFileSize } from '../fileSize';

describe('formatFileSize', () => {
  it('returns empty for null/0', () => {
    expect(formatFileSize(null)).toBe('');
    expect(formatFileSize(undefined)).toBe('');
    expect(formatFileSize(0)).toBe('');
  });
  it('formats bytes', () => {
    expect(formatFileSize(512)).toBe('512 B');
  });
  it('formats KB', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB');
  });
  it('formats MB', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.00 MB');
  });
});