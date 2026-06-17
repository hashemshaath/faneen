/**
 * MEMBERSHIP DASHBOARD CENTRAL INTEGRATION — static contract guard.
 *
 * Asserts the page sources its data from the central memberships module
 * and does NOT carry fake invoices / payment cards / hardcoded placeholder
 * usage. Purely static — does not boot React or hit network.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const PAGE = path.join(ROOT, 'src/pages/dashboard/DashboardMembership.tsx');
const APP  = path.join(ROOT, 'src/App.tsx');
const SIDEBAR = path.join(ROOT, 'src/components/dashboard/DashboardSidebar.tsx');

const read = (p: string) => fs.readFileSync(p, 'utf8');

describe('MembershipDashboard central integration', () => {
  const src = read(PAGE);

  it('1. /dashboard/membership route is wired in App.tsx', () => {
    const app = read(APP);
    expect(app).toMatch(/path="\/dashboard\/membership"/);
    expect(app).toMatch(/<DashboardMembership/);
  });

  it('2. exposes the membership entry in the sidebar', () => {
    const sb = read(SIDEBAR);
    expect(sb).toContain('/dashboard/membership');
  });

  it('3. reads from the central memberships module (no ad-hoc supabase calls)', () => {
    expect(src).toContain("from '@/modules/memberships'");
    expect(src).toMatch(/getCurrentMembershipSubscription/);
    expect(src).toMatch(/getMembershipUsage/);
    expect(src).not.toMatch(/from ['"]@\/integrations\/supabase\/client['"]/);
  });

  it('4. resolves owner business via the central businesses module', () => {
    expect(src).toContain("from '@/modules/businesses'");
    expect(src).toMatch(/getOwnerBusiness/);
  });

  it('5. uses canonical plan-limits parser (no hardcoded limits)', () => {
    expect(src).toMatch(/parseLimits/);
    expect(src).toContain("from '@/lib/membership-limits'");
  });

  it('6. provides a CTA to /register-entity for users without a business', () => {
    expect(src).toContain('/register-entity');
  });

  it('7. handles the free_launch tier explicitly', () => {
    expect(src).toMatch(/free_launch/);
  });

  it('8. does NOT render fake payment cards', () => {
    expect(src).not.toMatch(/إضافة بطاقة/);
    expect(src).not.toMatch(/بطاقات الدفع المحفوظة/);
    // No fake last-4 card numbers, no Visa/Mastercard mock chips.
    expect(src).not.toMatch(/•••• \d{4}/);
    expect(src).not.toMatch(/\bVISA\b|\bMASTERCARD\b/i);
  });

  it('9. does NOT render fake invoice/payment-history rows', () => {
    // The previous placeholder hardcoded these labels with mock data.
    expect(src).not.toMatch(/سجل المدفوعات[\s\S]{0,200}لا توجد مدفوعات مسجلة\./);
    // No hardcoded numeric placeholder usage like "1 / 2" or "0 / 10".
    expect(src).not.toMatch(/used:\s*\d+,\s*limit:\s*\d+/);
    expect(src).not.toMatch(/PLAN\s*=\s*\{/);
    expect(src).not.toMatch(/USAGE\s*=\s*\{/);
  });

  it('10. type-safety guardrails: no `any`, no ts-ignore / eslint-disable', () => {
    expect(src).not.toMatch(/:\s*any(\b|\[)/);
    expect(src).not.toMatch(/as any\b/);
    expect(src).not.toMatch(/@ts-ignore/);
    expect(src).not.toMatch(/@ts-expect-error/);
    expect(src).not.toMatch(/eslint-disable/);
  });

  it('11. does NOT introduce new membership RPC / migration / cron logic', () => {
    // Page must not call any rpc() directly — only via the central wrappers.
    expect(src).not.toMatch(/\.rpc\s*\(/);
    expect(src).not.toMatch(/process_expired_memberships/);
    expect(src).not.toMatch(/cancelSubscription|subscribeToPlan|adminUpgradeSubscription/);
  });
});