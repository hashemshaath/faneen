/**
 * RENTAL-MICROSERVICE-1 — module-level smoke tests.
 * Validates pure helpers, module surface, and route registration without
 * hitting the database.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  totalDays, daysLeft, overdueDays, alertTier,
  calcTotal,
  RentalCategories, RentalItems, RentalOrders, RentalExtensionsApi, RentalOps,
  RENTAL_UNITS, ORDER_STATUS_LABELS, ITEM_STATUS_LABELS,
} from '@/modules/rentals';

const root = process.cwd();

describe('rental dayCounter', () => {
  it('totalDays inclusive', () => {
    expect(totalDays('2026-01-01', '2026-01-01')).toBe(1);
    expect(totalDays('2026-01-01', '2026-01-10')).toBe(10);
  });
  it('daysLeft/overdueDays', () => {
    const today = new Date('2026-06-08T12:00:00Z');
    expect(daysLeft('2026-06-15', today)).toBe(7);
    expect(daysLeft('2026-06-01', today)).toBe(-7);
    expect(overdueDays('2026-06-01', today)).toBe(7);
    expect(overdueDays('2026-06-15', today)).toBe(0);
  });
  it('alertTier thresholds', () => {
    const now = new Date('2026-06-08T00:00:00Z');
    expect(alertTier('2026-07-01', now)).toBe('safe');
    expect(alertTier('2026-06-14', now)).toBe('t7');
    expect(alertTier('2026-06-10', now)).toBe('t3');
    expect(alertTier('2026-06-09', now)).toBe('t1');
    expect(alertTier('2026-06-08', now)).toBe('expired');
    expect(alertTier('2026-06-01', now)).toBe('overdue');
  });
});

describe('rental pricing', () => {
  it('day units multiply by days', () => {
    expect(calcTotal({ unit: 'day', unitPrice: 100, quantity: 2, days: 5 })).toBe(1000);
  });
  it('quantity units ignore days', () => {
    expect(calcTotal({ unit: 'piece', unitPrice: 50, quantity: 4, days: 99 })).toBe(200);
  });
});

describe('rental module surface', () => {
  it('barrel exports services', () => {
    expect(typeof RentalCategories.listCategories).toBe('function');
    expect(typeof RentalItems.listProviderItems).toBe('function');
    expect(typeof RentalOrders.createOrder).toBe('function');
    expect(typeof RentalExtensionsApi.createExtension).toBe('function');
    expect(typeof RentalOps.getRentalOpsCounts).toBe('function');
  });
  it('constants are bilingual & cover all units/statuses', () => {
    expect(RENTAL_UNITS.length).toBe(6);
    expect(Object.keys(ORDER_STATUS_LABELS).length).toBe(8);
    expect(Object.keys(ITEM_STATUS_LABELS).length).toBe(5);
    for (const u of RENTAL_UNITS) { expect(u.ar.length).toBeGreaterThan(0); expect(u.en.length).toBeGreaterThan(0); }
  });
});

describe('rental routing & page integrity', () => {
  const app = readFileSync(join(root, 'src/App.tsx'), 'utf8');
  it('mounts /dashboard/rentals', () => { expect(app).toMatch(/path="\/dashboard\/rentals"/); });
  it('mounts /admin/rentals with requireAdmin', () => {
    expect(app).toMatch(/path="\/admin\/rentals"[^>]*requireAdmin/);
  });
  it('mounts public /rentals routes', () => {
    expect(app).toMatch(/path="\/rentals"/);
    expect(app).toMatch(/path="\/rentals\/:slug"/);
  });
  it('pages exist', () => {
    expect(existsSync(join(root, 'src/pages/dashboard/DashboardRentals.tsx'))).toBe(true);
    expect(existsSync(join(root, 'src/pages/admin/AdminRentals.tsx'))).toBe(true);
    expect(existsSync(join(root, 'src/pages/RentalsCatalog.tsx'))).toBe(true);
    expect(existsSync(join(root, 'src/pages/RentalItemPublic.tsx'))).toBe(true);
  });
});

describe('rental isolation rules', () => {
  const pages = [
    'src/pages/RentalsCatalog.tsx',
    'src/pages/RentalItemPublic.tsx',
    'src/pages/dashboard/DashboardRentals.tsx',
    'src/pages/admin/AdminRentals.tsx',
  ];
  it('public pages filter only approved & published items', () => {
    const items = readFileSync(join(root, 'src/modules/rentals/services/items.ts'), 'utf8');
    expect(items).toMatch(/listPublishedItems[\s\S]*is_published[\s\S]*approved/);
    expect(items).toMatch(/getPublishedItemBySlug[\s\S]*is_published[\s\S]*approved/);
  });
  it('no bulk publish action exists in admin page', () => {
    const admin = readFileSync(join(root, 'src/pages/admin/AdminRentals.tsx'), 'utf8');
    expect(admin).not.toMatch(/bulkPublish|bulk_publish|publishAll/);
  });
  it('SEO hook used on public pages', () => {
    for (const p of ['src/pages/RentalsCatalog.tsx', 'src/pages/RentalItemPublic.tsx']) {
      expect(readFileSync(join(root, p), 'utf8')).toMatch(/useSeoPage/);
    }
  });
  it('no raw UUID strings rendered as primary labels', () => {
    for (const p of pages) {
      const s = readFileSync(join(root, p), 'utf8');
      expect(s).not.toMatch(/\.id\s*\}\s*<\/(h1|h2|h3)>/);
    }
  });
});