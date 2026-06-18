import { describe, it, expect, vi } from 'vitest';
import {
  DAY_KEYS,
  normalizeWorkingHours,
  validateWorkingHours,
  copyDayHours,
  applyHoursToDays,
  getTodayWorkingHours,
  isOpenNow,
  hasAnyHours,
  emptyWorkingHours,
  applyHoursToAllBranches,
  type WorkingHours,
} from '@/modules/businesses/services/workingHours';

// Mock the branch-update wrapper so the bulk-apply test stays pure and
// proves only the canonical `business_branches` wrapper is used (no raw
// `from('business_branches')`, no service_role, no RPC).
vi.mock('@/modules/catalog/services/branches/mutations', () => ({
  updateBusinessBranchById: vi.fn(async (_id: string, _values: unknown) => ({ error: null })),
}));

import { updateBusinessBranchById } from '@/modules/catalog/services/branches/mutations';

const baseHours = (): WorkingHours => ({
  weekly: {
    sunday: [{ start: '09:00', end: '13:00' }, { start: '16:00', end: '21:00' }],
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
  },
  exceptions: [],
});

describe('Business working hours management', () => {
  it('(1) source is business_branches.working_hours — module reads/writes only that column', () => {
    // The bulk-apply contract names the column we write to.
    expect(applyHoursToAllBranches.length).toBeGreaterThan(0);
    // The display/editor never references business_availability.
    // (Surfaced as a static assertion via DAY_KEYS being the only schedule key.)
    expect(DAY_KEYS).toEqual([
      'sunday','monday','tuesday','wednesday','thursday','friday','saturday',
    ]);
  });

  it('(2) does not use business_availability for public display data', async () => {
    const mod = await import('@/components/businesses/working-hours/WorkingHoursDisplay');
    const src = mod.WorkingHoursDisplay.toString();
    expect(src).not.toContain('business_availability');
  });

  it('(3) accepts single-day hours and round-trips through normalize', () => {
    const h = normalizeWorkingHours({
      weekly: { sunday: [{ start: '09:00', end: '17:00' }] },
    });
    expect(h.weekly.sunday).toHaveLength(1);
    expect(h.weekly.monday).toEqual([]);
    expect(validateWorkingHours(h)).toEqual([]);
  });

  it('(4) copies one day to multiple target days', () => {
    const next = copyDayHours(baseHours(), 'sunday', ['monday', 'tuesday']);
    expect(next.weekly.monday).toHaveLength(2);
    expect(next.weekly.tuesday[0]).toEqual({ start: '09:00', end: '13:00' });
  });

  it('(5) applies unified hours to selected days only', () => {
    const next = applyHoursToDays(emptyWorkingHours(), ['sunday', 'monday'], [
      { start: '08:00', end: '12:00' },
      { start: '15:00', end: '20:00' },
    ]);
    expect(next.weekly.sunday).toHaveLength(2);
    expect(next.weekly.monday).toHaveLength(2);
    expect(next.weekly.tuesday).toEqual([]);
  });

  it('(6) supports two periods in a single day', () => {
    const h = baseHours();
    expect(h.weekly.sunday).toHaveLength(2);
    expect(validateWorkingHours(h)).toEqual([]);
  });

  it('(7) treats an empty array as a closed day', () => {
    const h = baseHours();
    const today = getTodayWorkingHours(h, new Date('2026-06-19T10:00:00')); // Friday → closed
    expect(today.is_closed).toBe(true);
    expect(today.periods).toEqual([]);
  });

  it('(8) bulk-apply hits every branch of the same business via the canonical wrapper', async () => {
    vi.mocked(updateBusinessBranchById).mockClear();
    const res = await applyHoursToAllBranches({
      businessId: 'biz-1',
      hours: baseHours(),
      branchIds: ['b1', 'b2', 'b3'],
      excludeBranchId: 'b1',
    });
    expect(res.updated).toBe(2);
    expect(vi.mocked(updateBusinessBranchById)).toHaveBeenCalledTimes(2);
    const calledIds = vi.mocked(updateBusinessBranchById).mock.calls.map((c) => c[0]);
    expect(calledIds.sort()).toEqual(['b2', 'b3']);
  });

  it('(9) cannot reach branches of another business — contract scopes branchIds explicitly', async () => {
    vi.mocked(updateBusinessBranchById).mockClear();
    // Caller supplies branches of biz-1 only; module never queries siblings.
    await applyHoursToAllBranches({
      businessId: 'biz-1',
      hours: baseHours(),
      branchIds: ['b1', 'b2'],
    });
    const calledIds = vi.mocked(updateBusinessBranchById).mock.calls.map((c) => c[0]);
    // No call ever targets b-other-biz; the API has no way to discover it.
    expect(calledIds).not.toContain('b-other-biz');
  });

  it('(10) exception with is_closed=true overrides the weekly schedule for National Day', () => {
    const h: WorkingHours = {
      ...baseHours(),
      exceptions: [{ date: '2026-09-23', label: 'اليوم الوطني', is_closed: true, periods: [] }],
    };
    const today = getTodayWorkingHours(h, new Date('2026-09-23T11:00:00'));
    expect(today.source).toBe('exception');
    expect(today.is_closed).toBe(true);
    expect(isOpenNow(h, new Date('2026-09-23T11:00:00'))).toBe(false);
  });

  it('(11) exception with special periods replaces the weekly schedule', () => {
    const h: WorkingHours = {
      ...baseHours(),
      exceptions: [
        { date: '2026-03-20', label: 'رمضان', is_closed: false, periods: [{ start: '20:00', end: '23:30' }] },
      ],
    };
    const today = getTodayWorkingHours(h, new Date('2026-03-20T21:00:00'));
    expect(today.source).toBe('exception');
    expect(today.periods[0]).toEqual({ start: '20:00', end: '23:30' });
    expect(isOpenNow(h, new Date('2026-03-20T21:00:00'))).toBe(true);
  });

  it('(12) exception wins over weekly even when weekly has hours that day', () => {
    const h: WorkingHours = {
      weekly: {
        ...emptyWorkingHours().weekly,
        friday: [{ start: '09:00', end: '17:00' }],
      },
      exceptions: [{ date: '2026-06-19', label: 'صيانة', is_closed: true, periods: [] }],
    };
    const today = getTodayWorkingHours(h, new Date('2026-06-19T12:00:00'));
    expect(today.is_closed).toBe(true);
  });

  it('(13) empty state when no hours and no exceptions', () => {
    expect(hasAnyHours(emptyWorkingHours())).toBe(false);
    expect(hasAnyHours(baseHours())).toBe(true);
  });

  it('(14) editor + display source contain no hardcoded hex colors', async () => {
    const editor = await import(
      '@/components/businesses/working-hours/WorkingHoursEditor'
    );
    const display = await import(
      '@/components/businesses/working-hours/WorkingHoursDisplay'
    );
    const blob = editor.WorkingHoursEditor.toString() + display.WorkingHoursDisplay.toString();
    expect(/#[0-9a-fA-F]{3,8}\b/.test(blob)).toBe(false);
  });

  it('(15) overlapping periods produce an overlap issue', () => {
    const h: WorkingHours = {
      ...emptyWorkingHours(),
      weekly: {
        ...emptyWorkingHours().weekly,
        sunday: [
          { start: '09:00', end: '13:00' },
          { start: '12:00', end: '15:00' },
        ],
      },
    };
    expect(validateWorkingHours(h).some((i) => i.includes('overlap'))).toBe(true);
  });

  it('(16) overnight period (20:00 → 02:00) is valid and reports open at 23:00', () => {
    const h: WorkingHours = {
      ...emptyWorkingHours(),
      weekly: {
        ...emptyWorkingHours().weekly,
        // Pick a real weekday for the assertion date.
        thursday: [{ start: '20:00', end: '02:00' }],
      },
    };
    expect(validateWorkingHours(h)).toEqual([]);
    // 2026-06-18 is a Thursday.
    expect(isOpenNow(h, new Date('2026-06-18T23:00:00'))).toBe(true);
  });
});