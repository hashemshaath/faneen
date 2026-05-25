/**
 * REGISTRATION-UX-FULL-COMPLETE-1 Part 3
 * Source-level guarantees for:
 *   - main-location step UI
 *   - staff-invite shell (skip-only)
 *   - verification badge mounted in onboarding summary
 *   - admin nav entry for /admin/entity-access-requests
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

describe('Part 3 — step order extended with main-location + staff-invite', () => {
  it('STEP_ORDER includes main-location → staff-invite → summary in order', () => {
    expect(ONBOARDING).toMatch(/'business-sectors',\s*'main-location',\s*'staff-invite',\s*'summary'/);
  });
  it('OnboardingStep union includes the two new steps', () => {
    expect(ONBOARDING).toContain("| 'main-location'");
    expect(ONBOARDING).toContain("| 'staff-invite'");
  });
  it('sectors Continue advances to main-location (not directly to completion)', () => {
    expect(ONBOARDING).toMatch(/setStep\('main-location'\)/);
  });
  it('main-location Continue advances to staff-invite', () => {
    expect(ONBOARDING).toMatch(/setStep\('staff-invite'\)/);
  });
  it('staff-invite completes onboarding via completeOnboarding', () => {
    expect(ONBOARDING).toMatch(/data-action="skip-staff-invite"[\s\S]{0,400}completeOnboarding/);
  });
});

describe('Part 3 — main-location UI', () => {
  it('exposes all required fields', () => {
    for (const f of [
      'data-field="location_name"',
      'data-field="location_type"',
      'data-field="city"',
      'data-field="address_line_1"',
      'data-field="address_line_2"',
      'data-field="postal_code"',
    ]) {
      expect(ONBOARDING).toContain(f);
    }
  });
  it('declares all 9 allowed location types and excludes government', () => {
    for (const t of ['headquarters','branch','office','factory','warehouse','project_site','service_site','client_site','other']) {
      expect(ONBOARDING).toContain(`id: '${t}'`);
    }
    expect(ONBOARDING).not.toMatch(/government_site/);
    expect(ONBOARDING).not.toMatch(/government_entity/);
    expect(ONBOARDING).not.toMatch(/government/i);
    expect(ONBOARDING).not.toContain('جهة حكومية');
    expect(ONBOARDING).not.toContain('حكومي');
  });
  it('Arabic + English copy present', () => {
    expect(ONBOARDING).toContain('الموقع الرئيسي');
    expect(ONBOARDING).toContain('Main location');
    expect(ONBOARDING).toContain("Add the entity's main location");
    expect(ONBOARDING).toContain('أضف الموقع الرئيسي للمنشأة');
  });
  it('calls insertBusinessBranch after createBusiness with the resolved business id', () => {
    expect(ONBOARDING).toContain("import { insertBusinessBranch } from '@/modules/businesses'");
    expect(ONBOARDING).toMatch(/createBusiness\([\s\S]{0,3000}insertBusinessBranch/);
    expect(ONBOARDING).toMatch(/location_type:\s*locationType/);
    expect(ONBOARDING).toMatch(/is_main:\s*locationType === 'headquarters'/);
  });
  it('branch creation failure surfaces a non-blocking warning on summary', () => {
    expect(ONBOARDING).toContain('data-feature="main-location-warning"');
    expect(ONBOARDING).toContain('locationWarning');
    expect(ONBOARDING).toMatch(/setLocationWarning\(/);
  });
});

describe('Part 3 — staff-invite shell', () => {
  it('renders a skip-only shell with informative copy', () => {
    expect(ONBOARDING).toContain('data-feature="staff-invite-shell"');
    expect(ONBOARDING).toContain('Staff invitations will be available from entity settings after onboarding');
    expect(ONBOARDING).toContain('دعوة الموظفين ستكون متاحة من إعدادات المنشأة بعد اكتمال التسجيل');
  });
  it('shows role previews as informational only (no select/onClick handlers)', () => {
    // Roles are rendered from a literal array. Only a single skip button exists.
    expect(ONBOARDING).toMatch(/data-role-preview=\{r\.en\.toLowerCase\(\)\}/);
    expect(ONBOARDING).toMatch(/ar:\s*'مدير',\s*en:\s*'Manager'/);
    expect(ONBOARDING).toMatch(/ar:\s*'محرر',\s*en:\s*'Editor'/);
    expect(ONBOARDING).toMatch(/ar:\s*'مشاهد',\s*en:\s*'Viewer'/);
  });
  it('does not generate or display any token / fake send call', () => {
    // No token rendering inside the staff-invite block
    const block = ONBOARDING.split('data-feature="staff-invite-shell"')[1]?.split('</AuthLayout>')[0] ?? '';
    expect(block).not.toMatch(/token/i);
    expect(block).not.toMatch(/sendInvite|sendStaffInvite|invite-staff/i);
  });
});

describe('Part 3 — verification badge mounted in summary', () => {
  it('imports and mounts EntityVerificationStatusBadge on the summary screen', () => {
    expect(ONBOARDING).toContain("import { EntityVerificationStatusBadge } from '@/components/entities/EntityVerificationStatusBadge'");
    expect(ONBOARDING).toContain('data-feature="entity-verification-badge"');
    expect(ONBOARDING).toContain('<EntityVerificationStatusBadge');
  });
  it('badge exposes all five MVP states with Arabic + English labels', () => {
    for (const s of ['draft','pending_verification','verified','rejected','needs_more_info']) {
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

describe('Part 3 — admin access requests navigation', () => {
  it('admin route is registered behind requireAdmin', () => {
    expect(APP).toMatch(/path="\/admin\/entity-access-requests"[\s\S]{0,200}requireAdmin/);
  });
  it('sidebar exposes an Access Requests entry pointing at the admin route', () => {
    expect(SIDEBAR).toContain("'/admin/entity-access-requests'");
    expect(SIDEBAR).toContain('Access Requests');
    expect(SIDEBAR).toContain('طلبات الانضمام');
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

describe('Part 3 — regression guards', () => {
  it('invite route /invite/:token still wired from intent screen', () => {
    expect(ONBOARDING).toMatch(/navigate\(`\/invite\/\$\{encodeURIComponent\(inviteToken\)\}`\)/);
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