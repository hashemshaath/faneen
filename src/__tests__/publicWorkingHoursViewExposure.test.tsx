/**
 * PUBLIC WORKING HOURS VIEW EXPOSURE
 *
 * Proves:
 *   1. `business_branches_public` view exposes `working_hours`.
 *   2. No sensitive fields are exposed (user_id, internal notes, audit...).
 *   3. Public profile (BranchesTab) renders `WorkingHoursDisplay`.
 *   4. No usage of `business_availability` for the public display path.
 *   5. Empty state renders when `working_hours = {}`.
 *   6. Today's exception overrides the weekly schedule.
 *   7. No RLS / RPC / edge-function changes in the same migration.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';

import { WorkingHoursDisplay } from '@/components/businesses/working-hours/WorkingHoursDisplay';
import { getTodayWorkingHours } from '@/modules/businesses/services/workingHours';

const MIGRATIONS_DIR = resolve(__dirname, '../../supabase/migrations');
const COMPONENT_PATH = resolve(__dirname, '../components/business-profile/BusinessProfileTabs.tsx');
const DATA_PATH = resolve(__dirname, '../components/business-profile/business-profile.data.ts');

function latestViewMigration(): string {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  // Find the most recent migration that (re)creates business_branches_public.
  for (let i = files.length - 1; i >= 0; i -= 1) {
    const text = readFileSync(resolve(MIGRATIONS_DIR, files[i]), 'utf-8');
    if (/CREATE\s+(OR\s+REPLACE\s+)?VIEW\s+public\.business_branches_public/i.test(text)) {
      return text;
    }
  }
  throw new Error('No migration creating public.business_branches_public found');
}

describe('PUBLIC WORKING HOURS VIEW EXPOSURE', () => {
  const viewSql = latestViewMigration();
  const tabsSrc = readFileSync(COMPONENT_PATH, 'utf-8');
  const dataSrc = readFileSync(DATA_PATH, 'utf-8');

  it('(1) business_branches_public exposes working_hours', () => {
    expect(/working_hours/.test(viewSql)).toBe(true);
  });

  it('(2) does not expose sensitive fields', () => {
    const forbidden = [
      /\buser_id\b/,
      /\bowner_id\b/,
      /internal_notes/i,
      /private_metadata/i,
      /audit/i,
    ];
    for (const re of forbidden) {
      expect(re.test(viewSql)).toBe(false);
    }
  });

  it('(3) BranchesTab renders WorkingHoursDisplay and selects working_hours', () => {
    expect(tabsSrc).toMatch(/WorkingHoursDisplay/);
    expect(dataSrc).toMatch(/working_hours/);
  });

  it('(4) public display path does not read business_availability', () => {
    expect(tabsSrc).not.toMatch(/business_availability/);
    expect(dataSrc).not.toMatch(/business_availability/);
    expect(viewSql).not.toMatch(/business_availability/);
  });

  it('(5) empty state renders when working_hours = {}', () => {
    render(<WorkingHoursDisplay isRTL={false} value={{}} />);
    expect(screen.getByText(/Working hours not set yet/i)).toBeTruthy();
  });

  it("(6) today's exception overrides weekly schedule", () => {
    const today = new Date().toISOString().slice(0, 10);
    const hours = {
      weekly: {
        sunday: [{ start: '09:00', end: '17:00' }],
        monday: [{ start: '09:00', end: '17:00' }],
        tuesday: [{ start: '09:00', end: '17:00' }],
        wednesday: [{ start: '09:00', end: '17:00' }],
        thursday: [{ start: '09:00', end: '17:00' }],
        friday: [{ start: '09:00', end: '17:00' }],
        saturday: [{ start: '09:00', end: '17:00' }],
      },
      exceptions: [
        { date: today, label: 'National Day', is_closed: true, periods: [] },
      ],
    };
    const result = getTodayWorkingHours(hours);
    expect(result.source).toBe('exception');
    expect(result.is_closed).toBe(true);
    expect(result.label).toBe('National Day');
  });

  it('(7,8) view migration does not change RLS / create RPC / edge code', () => {
    expect(viewSql).not.toMatch(/CREATE\s+POLICY/i);
    expect(viewSql).not.toMatch(/ALTER\s+POLICY/i);
    expect(viewSql).not.toMatch(/DROP\s+POLICY/i);
    expect(viewSql).not.toMatch(/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i);
    expect(viewSql).not.toMatch(/security\s+definer/i);
  });
});