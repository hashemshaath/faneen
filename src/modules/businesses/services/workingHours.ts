/**
 * Working-hours utilities for `business_branches.working_hours` (jsonb).
 *
 * SCHEMA (lives entirely inside the existing column — no migrations):
 * {
 *   weekly: {
 *     sunday|monday|...|saturday: [{ start: "HH:mm", end: "HH:mm" }]
 *   },
 *   exceptions: [
 *     { date: "YYYY-MM-DD", label: string, is_closed: boolean, periods: Period[] }
 *   ]
 * }
 *
 * `business_availability` is intentionally NOT touched here — these helpers
 * power the public-profile display and the admin/dashboard editor only.
 * Pure functions; the single side-effecting helper is the per-business bulk
 * apply, which delegates to the existing branch-update wrapper.
 */
import {
  updateBusinessBranchById,
  type BusinessBranchUpdatePayload,
} from '@/modules/catalog/services/branches/mutations';

export const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export type DayKey = (typeof DAY_KEYS)[number];

export interface Period {
  start: string;
  end: string;
}

export interface WeeklyHours {
  sunday: Period[];
  monday: Period[];
  tuesday: Period[];
  wednesday: Period[];
  thursday: Period[];
  friday: Period[];
  saturday: Period[];
}

export interface HoursException {
  date: string; // YYYY-MM-DD
  label: string;
  is_closed: boolean;
  periods: Period[];
}

export interface WorkingHours {
  weekly: WeeklyHours;
  exceptions: HoursException[];
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function emptyWeekly(): WeeklyHours {
  return DAY_KEYS.reduce((acc, d) => {
    acc[d] = [];
    return acc;
  }, {} as WeeklyHours);
}

export function emptyWorkingHours(): WorkingHours {
  return { weekly: emptyWeekly(), exceptions: [] };
}

/** Coerces any stored jsonb shape into a strict {@link WorkingHours}.
 *  Tolerates legacy/partial structures (missing days, null periods, etc.). */
export function normalizeWorkingHours(input: unknown): WorkingHours {
  if (!input || typeof input !== 'object') return emptyWorkingHours();
  const src = input as Record<string, unknown>;
  const weeklyRaw = (src.weekly && typeof src.weekly === 'object'
    ? (src.weekly as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const weekly = emptyWeekly();
  for (const day of DAY_KEYS) {
    const arr = weeklyRaw[day];
    if (Array.isArray(arr)) weekly[day] = arr.map(coercePeriod).filter(Boolean) as Period[];
  }
  const exceptionsRaw = Array.isArray(src.exceptions) ? src.exceptions : [];
  const exceptions: HoursException[] = exceptionsRaw
    .map((e) => coerceException(e))
    .filter((e): e is HoursException => e !== null);
  return { weekly, exceptions };
}

function coercePeriod(p: unknown): Period | null {
  if (!p || typeof p !== 'object') return null;
  const o = p as Record<string, unknown>;
  const start = typeof o.start === 'string' ? o.start : '';
  const end = typeof o.end === 'string' ? o.end : '';
  if (!HHMM.test(start) || !HHMM.test(end)) return null;
  return { start, end };
}

function coerceException(e: unknown): HoursException | null {
  if (!e || typeof e !== 'object') return null;
  const o = e as Record<string, unknown>;
  const date = typeof o.date === 'string' ? o.date : '';
  const label = typeof o.label === 'string' ? o.label : '';
  if (!ISO_DATE.test(date) || !label.trim()) return null;
  const is_closed = !!o.is_closed;
  const periods = is_closed
    ? []
    : Array.isArray(o.periods)
      ? (o.periods.map(coercePeriod).filter(Boolean) as Period[])
      : [];
  return { date, label: label.trim(), is_closed, periods };
}

/** Validates a {@link WorkingHours} value. Returns issue codes (i18n-mapped
 *  by callers) — empty array means valid. */
export function validateWorkingHours(hours: WorkingHours): string[] {
  const issues: string[] = [];
  for (const day of DAY_KEYS) {
    const periods = hours.weekly[day] ?? [];
    const dayIssues = validatePeriods(periods);
    for (const i of dayIssues) issues.push(`${day}:${i}`);
  }
  for (const ex of hours.exceptions) {
    if (!ISO_DATE.test(ex.date)) issues.push('exception:date');
    if (!ex.label.trim()) issues.push('exception:label');
    if (ex.is_closed && ex.periods.length > 0) issues.push('exception:closed_with_periods');
    if (!ex.is_closed) {
      for (const i of validatePeriods(ex.periods)) issues.push(`exception:${i}`);
    }
  }
  return issues;
}

function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function validatePeriods(periods: Period[]): string[] {
  const issues: string[] = [];
  const ranges: Array<[number, number]> = [];
  for (const p of periods) {
    if (!HHMM.test(p.start) || !HHMM.test(p.end)) {
      issues.push('period_format');
      continue;
    }
    const s = toMin(p.start);
    let e = toMin(p.end);
    // Allow overnight (e.g. 20:00 → 02:00) by shifting end past midnight.
    if (e <= s) e += 24 * 60;
    if (e - s <= 0) issues.push('period_order');
    ranges.push([s, e]);
  }
  // Detect overlap on the normalised timeline.
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i][0] < sorted[i - 1][1]) {
      issues.push('period_overlap');
      break;
    }
  }
  return issues;
}

/** Pure: copy a single day's periods into the given target days. */
export function copyDayHours(
  hours: WorkingHours,
  from: DayKey,
  to: DayKey[],
): WorkingHours {
  const src = hours.weekly[from] ?? [];
  const weekly: WeeklyHours = { ...hours.weekly };
  for (const d of to) weekly[d] = src.map((p) => ({ ...p }));
  return { ...hours, weekly };
}

/** Pure: replace `days` with the supplied period list (used by "unified hours"). */
export function applyHoursToDays(
  hours: WorkingHours,
  days: DayKey[],
  periods: Period[],
): WorkingHours {
  const weekly: WeeklyHours = { ...hours.weekly };
  for (const d of days) weekly[d] = periods.map((p) => ({ ...p }));
  return { ...hours, weekly };
}

/** Replaces the working_hours of every branch belonging to `businessId`
 *  (optionally excluding the source branch). Caller is responsible for the
 *  confirmation prompt + permission scoping; this helper only emits writes
 *  through the existing branch wrapper — never service_role, never raw SQL. */
export async function applyHoursToAllBranches(params: {
  businessId: string;
  hours: WorkingHours;
  branchIds: string[];
  excludeBranchId?: string;
}): Promise<{ updated: number; errors: Error[] }> {
  // `businessId` is part of the contract so callers cannot accidentally bulk-
  // apply across unrelated businesses — we never look it up server-side here.
  void params.businessId;
  const targets = params.branchIds.filter((id) => id !== params.excludeBranchId);
  const errors: Error[] = [];
  let updated = 0;
  const payload = {
    working_hours: params.hours,
  } as unknown as BusinessBranchUpdatePayload;
  for (const id of targets) {
    const { error } = await updateBusinessBranchById(id, payload);
    if (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    } else {
      updated += 1;
    }
  }
  return { updated, errors };
}

/** Map a JS Date to a DayKey using the local timezone. */
export function dayKeyForDate(d: Date): DayKey {
  return DAY_KEYS[d.getDay()];
}

function isoLocalDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Returns the periods that apply to `date`, preferring any matching
 *  exception over the regular weekly schedule. */
export function getTodayWorkingHours(
  hours: WorkingHours,
  date: Date = new Date(),
): { source: 'exception' | 'weekly'; label?: string; is_closed: boolean; periods: Period[] } {
  const iso = isoLocalDate(date);
  const ex = hours.exceptions.find((e) => e.date === iso);
  if (ex) {
    return {
      source: 'exception',
      label: ex.label,
      is_closed: ex.is_closed,
      periods: ex.is_closed ? [] : ex.periods,
    };
  }
  const periods = hours.weekly[dayKeyForDate(date)] ?? [];
  return { source: 'weekly', is_closed: periods.length === 0, periods };
}

/** Localised one-line label for "today" status. */
export function formatWorkingHoursLabel(
  hours: WorkingHours,
  isRTL: boolean,
  date: Date = new Date(),
): string {
  const today = getTodayWorkingHours(hours, date);
  if (today.is_closed) {
    if (today.source === 'exception' && today.label) {
      return isRTL
        ? `مغلق اليوم بسبب: ${today.label}`
        : `Closed today — ${today.label}`;
    }
    return isRTL ? 'مغلق اليوم' : 'Closed today';
  }
  const formatted = today.periods.map((p) => `${p.start} - ${p.end}`).join(' • ');
  if (today.source === 'exception' && today.label) {
    return isRTL
      ? `ساعات خاصة اليوم (${today.label}): ${formatted}`
      : `Special hours today (${today.label}): ${formatted}`;
  }
  return formatted;
}

/** True iff `now` falls inside any active period for today (incl. overnight). */
export function isOpenNow(hours: WorkingHours, now: Date = new Date()): boolean {
  const today = getTodayWorkingHours(hours, now);
  if (today.is_closed) return false;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const p of today.periods) {
    const s = toMin(p.start);
    let e = toMin(p.end);
    if (e <= s) e += 24 * 60;
    const candidates = [nowMin, nowMin + 24 * 60];
    if (candidates.some((c) => c >= s && c < e)) return true;
  }
  return false;
}

/** True iff the normalised hours contain at least one period or exception. */
export function hasAnyHours(hours: WorkingHours): boolean {
  if (hours.exceptions.length > 0) return true;
  return DAY_KEYS.some((d) => (hours.weekly[d]?.length ?? 0) > 0);
}