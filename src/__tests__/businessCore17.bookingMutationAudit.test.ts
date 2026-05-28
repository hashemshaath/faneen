import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: emitBookingAudit safety (real helper, mocked deps).
// ─────────────────────────────────────────────────────────────────────────────
const recordMock = vi.fn();
vi.mock('@/modules/businesses/notes', () => ({
  recordBusinessSourceAudit: (...args: unknown[]) => recordMock(...args),
}));

const getUserMock = vi.fn();
vi.mock('@/modules/identity/services/session/getCurrentUser', () => ({
  getCurrentUser: (...args: unknown[]) => getUserMock(...args),
}));

const fromMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...args) },
}));

import {
  emitBookingCreated,
  emitBookingStatusChanged,
  readBookingStatusSafe,
} from '@/modules/bookings/services/emitBookingAudit';

function mockBookingRow(row: Record<string, unknown> | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  fromMock.mockReturnValue({ select });
}

beforeEach(() => {
  recordMock.mockReset();
  getUserMock.mockReset();
  fromMock.mockReset();
  getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } });
});

describe('BUSINESS-CORE-17 — emitBookingCreated', () => {
  it('skips emit when businessId is missing', async () => {
    await emitBookingCreated({ bookingId: 'b1', businessId: '' });
    expect(recordMock).not.toHaveBeenCalled();
  });

  it('skips emit when bookingId is missing', async () => {
    await emitBookingCreated({ bookingId: '', businessId: 'biz-1' });
    expect(recordMock).not.toHaveBeenCalled();
  });

  it('skips emit when user is anonymous', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });
    await emitBookingCreated({ bookingId: 'b1', businessId: 'biz-1', refId: 'BKG-1' });
    expect(recordMock).not.toHaveBeenCalled();
  });

  it('writes a clean booking.created event with a safe ref', async () => {
    await emitBookingCreated({
      bookingId: 'b1', businessId: 'biz-1', refId: 'BKG-1000001', status: 'pending',
    });
    expect(recordMock).toHaveBeenCalledTimes(1);
    const [arg] = recordMock.mock.calls[0];
    expect(arg).toMatchObject({
      business_id: 'biz-1',
      actor_id: 'user-1',
      entity_type: 'booking',
      entity_id: 'b1',
      action: 'booking.created',
    });
    expect(arg.metadata).toMatchObject({
      booking_ref_id: 'BKG-1000001',
      source_type: 'booking',
      new_status: 'pending',
    });
  });

  it('drops UUID-shaped refs (never displays UUID)', async () => {
    await emitBookingCreated({
      bookingId: 'b1',
      businessId: 'biz-1',
      refId: '11111111-1111-1111-1111-111111111111',
    });
    const [arg] = recordMock.mock.calls[0];
    expect(arg.metadata.booking_ref_id).toBeNull();
  });
});

describe('BUSINESS-CORE-17 — emitBookingStatusChanged', () => {
  it('skips emit when booking has no business_id', async () => {
    mockBookingRow({ id: 'b1', business_id: null, ref_id: 'BKG-1', status: 'pending' });
    await emitBookingStatusChanged({ bookingId: 'b1', newStatus: 'confirmed' });
    expect(recordMock).not.toHaveBeenCalled();
  });

  it('emits with previous + new status and safe ref', async () => {
    mockBookingRow({
      id: 'b1', business_id: 'biz-1', ref_id: 'BKG-1000001', status: 'confirmed',
    });
    await emitBookingStatusChanged({
      bookingId: 'b1', previousStatus: 'pending', newStatus: 'confirmed',
    });
    const [arg] = recordMock.mock.calls[0];
    expect(arg).toMatchObject({
      business_id: 'biz-1',
      action: 'booking.status_changed',
      entity_type: 'booking',
    });
    expect(arg.metadata).toMatchObject({
      booking_ref_id: 'BKG-1000001',
      source_type: 'booking',
      previous_status: 'pending',
      new_status: 'confirmed',
    });
  });

  it('falls back to row.status when newStatus is not passed', async () => {
    mockBookingRow({
      id: 'b1', business_id: 'biz-1', ref_id: 'BKG-1', status: 'cancelled',
    });
    await emitBookingStatusChanged({ bookingId: 'b1' });
    const [arg] = recordMock.mock.calls[0];
    expect(arg.metadata.new_status).toBe('cancelled');
  });

  it('drops UUID-shaped refs from the row', async () => {
    mockBookingRow({
      id: 'b1', business_id: 'biz-1',
      ref_id: '11111111-1111-1111-1111-111111111111', status: 'confirmed',
    });
    await emitBookingStatusChanged({ bookingId: 'b1', newStatus: 'confirmed' });
    const [arg] = recordMock.mock.calls[0];
    expect(arg.metadata.booking_ref_id).toBeNull();
  });

  it('does not throw when the underlying read fails', async () => {
    fromMock.mockImplementationOnce(() => { throw new Error('boom'); });
    await expect(
      emitBookingStatusChanged({ bookingId: 'b1', newStatus: 'confirmed' }),
    ).resolves.toBeUndefined();
    expect(recordMock).not.toHaveBeenCalled();
  });
});

describe('BUSINESS-CORE-17 — readBookingStatusSafe', () => {
  it('returns the row status when present', async () => {
    mockBookingRow({ id: 'b1', business_id: 'biz-1', ref_id: null, status: 'confirmed' });
    expect(await readBookingStatusSafe('b1')).toBe('confirmed');
  });

  it('returns null on read error / missing row', async () => {
    mockBookingRow(null);
    expect(await readBookingStatusSafe('b1')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hygiene — instrumentation files don't import forbidden modules and never
// write to business_audit_log directly.
// ─────────────────────────────────────────────────────────────────────────────
describe('BUSINESS-CORE-17 — instrumentation hygiene', () => {
  const files = [
    'src/modules/bookings/services/emitBookingAudit.ts',
    'src/components/booking/BookingWidget.tsx',
    'src/pages/dashboard/DashboardBookings.tsx',
  ];

  it('emitBookingAudit has no forbidden imports', async () => {
    const fs = await import('node:fs/promises');
    const src = await fs.readFile('src/modules/bookings/services/emitBookingAudit.ts', 'utf-8');
    expect(src).not.toMatch(/@\/modules\/notifications/);
    expect(src).not.toMatch(/@\/modules\/payments/);
    expect(src).not.toMatch(/@\/modules\/memberships/);
    expect(src).not.toMatch(/@\/modules\/auth\b/);
    expect(src).not.toMatch(/supabase\.channel\(/);
    expect(src).not.toMatch(/postgres_changes/);
    expect(src).not.toMatch(/sla-sweep|cron/i);
  });

  it('only the helper writes to business_audit_log; call sites never do directly', async () => {
    const fs = await import('node:fs/promises');
    for (const f of files.slice(1)) {
      const src = await fs.readFile(f, 'utf-8');
      expect(src, f).not.toMatch(/business_audit_log/);
    }
  });

  it('emitBookingAudit metadata never carries PII / payment / token fields literally', async () => {
    const fs = await import('node:fs/promises');
    const src = await fs.readFile('src/modules/bookings/services/emitBookingAudit.ts', 'utf-8');
    expect(src).not.toMatch(/email:|phone:|client_secret:|provider_intent_id:|password:|otp:|address:|full_name:|notes:/);
  });
});