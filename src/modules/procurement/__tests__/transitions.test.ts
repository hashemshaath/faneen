import { describe, expect, it } from 'vitest';
import { isValidProcurementRequestTransition, PROCUREMENT_REQUEST_TRANSITIONS } from '../types';

describe('procurement request status transitions', () => {
  it('allows the documented forward path', () => {
    const path = ['draft', 'requested', 'rfq_sent', 'quoted', 'awarded'] as const;
    for (let i = 0; i < path.length - 1; i++) {
      expect(isValidProcurementRequestTransition(path[i], path[i + 1])).toBe(true);
    }
  });

  it('rejects backwards moves', () => {
    expect(isValidProcurementRequestTransition('quoted', 'requested')).toBe(false);
    expect(isValidProcurementRequestTransition('awarded', 'quoted')).toBe(false);
  });

  it('terminal states have no further transitions', () => {
    expect(PROCUREMENT_REQUEST_TRANSITIONS.awarded).toEqual([]);
    expect(PROCUREMENT_REQUEST_TRANSITIONS.cancelled).toEqual([]);
  });

  it('cancellation is allowed from every active state', () => {
    for (const s of ['draft', 'requested', 'rfq_sent', 'quoted'] as const) {
      expect(isValidProcurementRequestTransition(s, 'cancelled')).toBe(true);
    }
  });
});