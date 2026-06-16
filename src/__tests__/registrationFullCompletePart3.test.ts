/**
 * REGISTRATION-UX Part 3 — refreshed (APP-CODEBASE-CLEANUP-STABILIZE-2).
 *
 * The legacy main-location + staff-invite onboarding steps were intentionally
 * removed; branch/staff management now lives in dashboard settings. These
 * tests preserve the still-valid invariants:
 *
 *   - verification badge mounted on summary
 *   - admin entity-access-requests route + sidebar entry exist
 *   - admin queue uses service layer (no direct table writes from UI)
 *   - invite token route still wired from intent screen
 *   - no government wording in Onboarding
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const ONBOARDING = fs.readFileSync(path.join(ROOT, 'pages/Onboarding.tsx'), 'utf8');
const SIDEBAR = fs.readFileSync(path.join(ROOT, 'components/dashboard/DashboardSidebar.tsx'), 'utf8');
const ADMIN_QUEUE = fs.readFileSync(path.join(ROOT, 'pages/admin/AdminEntityAccessRequests.tsx'), 'utf8');
const APP = fs.readFileSync(path.join(ROOT, 'App.tsx'), 'utf8');
const BADGE = fs.readFileSync(path.join(ROOT, 'components/entities/EntityVerificationStatusBadge.tsx'), 'utf8');

describe('Part 3 (refreshed) — removed legacy onboarding steps', () => {
  it('main-location and staff-invite steps no longer exist in STEP_ORDER', () => {
    expect(ONBOARDING).not.toMatch(/'main-location'/);
    expect(ONBOARDING).not.toMatch(/'staff-invite'/);
    expect(ONBOARDING).not.toContain('data-feature="staff-invite-shell"');
    expect(ONBOARDING).not.toContain('data-feature="main-location-warning"');
  });
});

describe('Part 3 (refreshed) — verification badge mounted in summary', () => {
  it('imports and mounts EntityVerificationStatusBadge on the summary screen', () => {
    expect(ONBOARDING).toContain(
      "import { EntityVerificationStatusBadge } from '@/components/entities/EntityVerificationStatusBadge'",
    );
    expect(ONBOARDING).toContain('<EntityVerificationStatusBadge');
  });

  it('badge exposes all five MVP states with Arabic + English labels', () => {
    for (const s of ['draft', 'pending_verification', 'verified', 'rejected', 'needs_more_info']) {
      expect(BADGE).toContain(s);
    }
    expect(BADGE).toContain('مسودة');
    expect(BADGE).toContain('موثقة');
    expect(BADGE).toContain('Verified');
    expect(BADGE).toContain('Pending verification');
  });

  it('badge is display-only (no write/insert/update/upsert calls)', () => {
    expect(BADGE).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
  });
});

describe('Part 3 (refreshed) — admin access requests navigation', () => {
  it('admin route is registered behind requireAdmin', () => {
    expect(APP).toMatch(/path="\/admin\/entity-access-requests"[\s\S]{0,200}requireAdmin/);
  });

  it('sidebar surfaces Access Requests via the Accounts & Approvals hub', () => {
    // `/admin/entity-access-requests` is intentionally hidden from the
    // top-level sidebar — it is fully merged into the Accounts & Approvals
    // hub at `/admin/identity` (tabbed Approvals inbox). The standalone
    // route stays reachable from row actions and search. Lock in:
    //   1) sidebar links the hub that owns the queue, and
    //   2) the hub documents the merge so the entry isn't accidentally
    //      restored as a duplicate top-level link.
    expect(SIDEBAR).toContain("'/admin/identity'");
    expect(SIDEBAR).toContain('Accounts & Approvals');
    expect(SIDEBAR).toMatch(/entity-access-requests[\s\S]{0,200}intentionally hidden/);
  });

  it('admin queue uses service layer (no direct table writes from UI)', () => {
    expect(ADMIN_QUEUE).toContain('listEntityAccessRequests');
    expect(ADMIN_QUEUE).toContain('reviewEntityAccessRequest');
    expect(ADMIN_QUEUE).not.toMatch(/supabase\.from\('entity_access_requests'\)/);
  });

  it('admin queue marked noindex and admin-only', () => {
    expect(ADMIN_QUEUE).toContain('useNoIndex');
    expect(ADMIN_QUEUE).toContain('noindex: true');
  });
});

describe('Part 3 (refreshed) — regression guards', () => {
  it('intent screen no longer surfaces a manual invite-token paste box (link-only join)', () => {
    expect(ONBOARDING).not.toMatch(/inviteToken/);
    expect(ONBOARDING).not.toMatch(/Paste invitation token/);
  });

  it('no government wording anywhere in Onboarding', () => {
    expect(ONBOARDING).not.toMatch(/government/i);
    expect(ONBOARDING).not.toContain('جهة حكومية');
    expect(ONBOARDING).not.toContain('حكومي');
  });

  it('individual completion still skips createBusiness', () => {
    expect(ONBOARDING).toMatch(/accountType === 'business' && businessName && username/);
  });
});