/**
 * MEMBERSHIP CURRENT-SCOPE FIX — static contract guard.
 *
 * Pins the dashboard membership page to BUSINESS/ENTITY scope while
 * leaving the door open for individual membership plans in the future.
 * Pure static — no React/Supabase boot.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const PAGE = path.join(ROOT, 'src/pages/dashboard/DashboardMembership.tsx');
const NAV_CONFIG = path.join(
  ROOT,
  'src/modules/dashboard/navigation/dashboardNavigation.config.ts',
);
const NAV_LABELS = path.join(
  ROOT,
  'src/components/dashboard/navigation/unifiedLabels.ts',
);

const read = (p: string) => fs.readFileSync(p, 'utf8');

describe('Membership dashboard — current scope is business/entity', () => {
  const src = read(PAGE);

  it('header titles the page as business membership (ar + en)', () => {
    expect(src).toContain('عضوية الجهة');
    expect(src).toContain('Business Membership');
  });

  it('no-business case explains scope without denying future individual plans', () => {
    expect(src).toContain('لا توجد جهة مرتبطة بحسابك');
    expect(src).toContain('باقات الأفراد غير مفعّلة');
    // Future-ready language must be present somewhere on the page.
    expect(src).toMatch(/سيتم دعمها لاحقًا|may be supported later/);
  });

  it('CTA for no-business users points to /register-entity', () => {
    expect(src).toContain('/register-entity');
    expect(src).toContain('إنشاء جهة');
  });

  it('plan card uses business-scoped labels (not personal pronouns)', () => {
    expect(src).toContain('باقة الجهة الحالية');
    expect(src).toContain('Current business plan');
    expect(src).toContain('ترقية عضوية الجهة');
  });

  it('usage and limits are scoped to the business', () => {
    expect(src).toContain('استخدام الجهة هذا الشهر');
    expect(src).toContain('Business usage this month');
    expect(src).toContain('حدود ومزايا الجهة');
  });

  it('"no active membership" empty state speaks about the business, not the user', () => {
    expect(src).toContain('هذه الجهة لا تملك عضوية مفعّلة');
    expect(src).toContain('This business has no active membership');
    expect(src).toContain('اختيار باقة للجهة');
  });

  it('usage RPC is NEVER called without a business_id', () => {
    // The query must be gated by businessId, and the RPC payload must
    // pass `_business_id: businessId!` (no `undefined` fallback).
    expect(src).toMatch(/enabled:\s*!!user\?\.id\s*&&\s*!!businessId/);
    expect(src).toContain('_business_id: businessId!');
    expect(src).not.toMatch(/_business_id:\s*businessId\s*\?\?\s*undefined/);
  });

  it('keeps individual-plan support future-ready (documents the scope rule)', () => {
    expect(src).toMatch(/MEMBERSHIP-CURRENT-SCOPE-FIX/);
    expect(src).toMatch(/Individual membership plans may be introduced later/);
    expect(src).toMatch(/Do NOT treat a missing business_id as an individual/);
  });

  it('sidebar/menu wires /dashboard/membership under a business-scoped label', () => {
    const cfg = read(NAV_CONFIG);
    expect(cfg).toContain('/dashboard/membership');

    const labels = read(NAV_LABELS);
    // Label must explicitly scope to «الجهة» — not the personal pronoun.
    expect(labels).toMatch(/membership:\s*\{\s*ar:\s*'عضوية الجهة'/);
    expect(labels).toMatch(/en:\s*'Business Membership'/);
  });

  it('does not touch DB / RLS / RPC / migrations / edge from this page', () => {
    expect(src).not.toMatch(/\.rpc\s*\(/);
    expect(src).not.toMatch(/from ['"]@\/integrations\/supabase\/client['"]/);
    expect(src).not.toMatch(/createPolicy|alterTable|migration/i);
  });

  it('contains no `any` / suppressions', () => {
    expect(src).not.toMatch(/:\s*any(\b|\[)/);
    expect(src).not.toMatch(/as any\b/);
    expect(src).not.toMatch(/@ts-(ignore|expect-error)/);
    expect(src).not.toMatch(/eslint-disable/);
  });
});