import { describe, it, expect } from 'vitest';
import {
  QUOTE_STATUSES,
  QUOTE_STATUS_LABEL_AR,
  QUOTE_STATUS_LABEL_EN,
  QUOTE_STATUS_TONE,
  LEAD_STATUSES,
  LEAD_STATUS_LABEL_AR,
  LEAD_STATUS_TONE,
} from '../quoteStatuses';

describe('quoteStatuses constants', () => {
  it('exposes all quote statuses', () => {
    expect(QUOTE_STATUSES).toContain('new');
    expect(QUOTE_STATUSES).toContain('completed');
  });

  it('has non-empty AR and EN labels for every quote status', () => {
    for (const s of QUOTE_STATUSES) {
      expect(QUOTE_STATUS_LABEL_AR[s]).toBeTruthy();
      expect(QUOTE_STATUS_LABEL_EN[s]).toBeTruthy();
      expect(QUOTE_STATUS_TONE[s]).toMatch(/text-|bg-/);
    }
  });

  it('has non-empty labels and tones for every lead status', () => {
    for (const s of LEAD_STATUSES) {
      expect(LEAD_STATUS_LABEL_AR[s]).toBeTruthy();
      expect(LEAD_STATUS_TONE[s]).toMatch(/text-|bg-/);
    }
  });
});