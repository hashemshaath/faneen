import { describe, expect, it, vi, beforeEach } from 'vitest';

const fafSpy = vi.fn();
vi.mock('@/modules/notifications', () => ({
  createNotificationFireAndForget: (...args: unknown[]) => fafSpy(...args),
}));

import { notifyProcurementEvent } from '../services/procurementNotifications';

beforeEach(() => {
  fafSpy.mockReset();
});

describe('notifyProcurementEvent', () => {
  it('routes through fire-and-forget wrapper with bilingual content', () => {
    notifyProcurementEvent({
      user_id: 'u1',
      event: 'rfq_sent',
      rfq_id: 'rfq-1',
    });
    expect(fafSpy).toHaveBeenCalledTimes(1);
    const [payload, tag] = fafSpy.mock.calls[0];
    expect(tag).toContain('procurement.notify');
    expect(payload.notification_type).toBe('procurement.rfq_sent');
    expect(payload.title_ar).toBeTruthy();
    expect(payload.title_en).toBeTruthy();
    expect(payload.reference_type).toBe('procurement_rfq');
    expect(payload.reference_id).toBe('rfq-1');
  });

  it('does not include PII strings (name/email/phone)', () => {
    notifyProcurementEvent({ user_id: 'u', event: 'quote_submitted', quote_id: 'q1' });
    const [payload] = fafSpy.mock.calls[0];
    const blob = JSON.stringify(payload).toLowerCase();
    expect(blob).not.toMatch(/@/); // no email
    expect(blob).not.toMatch(/\+?\d{6,}/); // no phone
  });

  it('is silent when user_id missing and never throws', () => {
    expect(() =>
      notifyProcurementEvent({ user_id: '', event: 'rfq_sent' }),
    ).not.toThrow();
    expect(fafSpy).not.toHaveBeenCalled();
  });

  it('supports all canonical events', () => {
    const events = [
      'rfq_sent',
      'quote_submitted',
      'quote_shortlisted',
      'quote_selected',
      'quote_rejected',
      'rfq_closed',
      'quote_awarded',
    ] as const;
    for (const e of events) {
      notifyProcurementEvent({ user_id: 'u', event: e });
    }
    expect(fafSpy).toHaveBeenCalledTimes(events.length);
  });
});