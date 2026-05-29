/**
 * CUSTOMER-EXPERIENCE-3 — Project closure, feedback, NPS, warranty UI & wiring.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  classifyNps,
  computeNpsScore,
  computeWarrantyStatus,
  computeClosureMetrics,
} from '@/modules/projectClosure';
import {
  CUSTOMER_PROJECT_EVENT_TYPES,
  WIRED_CUSTOMER_PROJECT_EVENT_TYPES,
  isWiredCustomerProjectEventType,
} from '@/modules/operations/customerCommunications/eventTypes';
import { CUSTOMER_EVENT_COPY } from '@/modules/operations/customerCommunications/copy';

const ROOT = path.resolve(__dirname, '..', '..');
const PORTAL = path.join(ROOT, 'src/pages/CustomerProjectPortal.tsx');
const CARD = path.join(ROOT, 'src/components/workOrders/ProjectClosureCard.tsx');
const WOD = path.join(ROOT, 'src/pages/dashboard/DashboardWorkOrderDetail.tsx');
const OPS = path.join(ROOT, 'src/pages/dashboard/DashboardOperationsCenter.tsx');
const TEMPLATE_DIR = path.join(
  ROOT,
  'supabase/functions/_shared/transactional-email-templates',
);
const CX3_TEMPLATES = [
  'customer-project-completed.tsx',
  'customer-project-confirmed.tsx',
  'customer-warranty-started.tsx',
  'customer-thank-you-feedback.tsx',
];

describe('A. Helpers', () => {
  it('classifyNps buckets', () => {
    expect(classifyNps(10)).toBe('promoter');
    expect(classifyNps(9)).toBe('promoter');
    expect(classifyNps(8)).toBe('passive');
    expect(classifyNps(7)).toBe('passive');
    expect(classifyNps(6)).toBe('detractor');
    expect(classifyNps(0)).toBe('detractor');
  });
  it('computeNpsScore', () => {
    const r = computeNpsScore([{ score: 10 }, { score: 9 }, { score: 6 }, { score: 0 }]);
    expect(r.promoters).toBe(2);
    expect(r.detractors).toBe(2);
    expect(r.score).toBe(0);
    expect(computeNpsScore([]).score).toBe(0);
  });
  it('computeWarrantyStatus', () => {
    const now = new Date('2026-06-01T00:00:00Z');
    expect(computeWarrantyStatus(null, now)).toBe('none');
    expect(computeWarrantyStatus({ status: 'void', end_date: '2027-01-01' }, now)).toBe('void');
    expect(computeWarrantyStatus({ status: 'active', end_date: '2025-01-01' }, now)).toBe('expired');
    expect(computeWarrantyStatus({ status: 'active', end_date: '2027-01-01' }, now)).toBe('active');
  });
  it('computeClosureMetrics alerts', () => {
    const now = new Date('2026-06-15T00:00:00Z');
    const m = computeClosureMetrics({
      closures: [
        { closure_status: 'pending_customer_confirmation', created_at: '2026-06-01T00:00:00Z' } as never,
        { closure_status: 'issue_reported', created_at: '2026-06-10T00:00:00Z' } as never,
      ],
      feedback: [{ rating: 1 }, { rating: 5 }],
      nps: [{ score: 3 }, { score: 10 }],
      warranties: [
        { status: 'active', end_date: '2026-06-30' },
        { status: 'active', end_date: '2027-12-31' },
      ],
      now,
    });
    expect(m.pendingConfirmation).toBe(1);
    expect(m.issuesReported).toBe(1);
    expect(m.alertNotConfirmed7d).toBe(1);
    expect(m.alertLowRating).toBe(1);
    expect(m.alertNpsDetractors).toBe(1);
    expect(m.activeWarranties).toBe(2);
    expect(m.alertWarrantyExpiringSoon).toBe(1);
  });
});

describe('B. Provider ProjectClosureCard', () => {
  const src = fs.readFileSync(CARD, 'utf-8');
  it('exists, inline-only, uses wrappers', () => {
    expect(src).not.toMatch(/<Dialog|<AlertDialog|<Modal|<Drawer|<Popover/);
    expect(src).toContain('createProjectClosure');
    expect(src).toContain('addDeliveryEvidence');
    expect(src).toContain('startWorkOrderWarranty');
    expect(src).toMatch(/if \(!canManage\) return null;/);
  });
  it('is mounted in WorkOrderDetail', () => {
    const wod = fs.readFileSync(WOD, 'utf-8');
    expect(wod).toContain('ProjectClosureCard');
    expect(wod).toMatch(/<ProjectClosureCard[\s\S]+workOrderId=/);
  });
});

describe('C. Customer portal sections', () => {
  const src = fs.readFileSync(PORTAL, 'utf-8');
  it('renders closure/evidence/warranty/feedback/nps sections', () => {
    for (const id of [
      'customer-portal-closure',
      'customer-portal-evidence',
      'customer-portal-warranty',
      'customer-portal-feedback',
      'customer-portal-nps',
    ]) expect(src).toContain(id);
  });
  it('inline only (no dialog/modal/popover/drawer)', () => {
    expect(src).not.toMatch(/<Dialog|<AlertDialog|<Modal|<Drawer|<Popover/);
  });
  it('uses customer action wrappers', () => {
    expect(src).toContain('customerConfirmCompletion');
    expect(src).toContain('customerReportProjectIssue');
    expect(src).toContain('customerSubmitFeedback');
    expect(src).toContain('customerSubmitNps');
  });
  it('no supabase.from / no internal/staff/supplier/attachment exposure', () => {
    expect(src).not.toMatch(/supabase\.from\(/);
    for (const banned of ['internal_note','staff_','technician','supplier_','attachment_id','procurement','invoice','payment_amount']) {
      expect(src).not.toMatch(new RegExp(banned));
    }
  });
  it('no raw UUID rendering', () => {
    expect(src).not.toMatch(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  });
  it('no chat / SMS / WhatsApp surfaces', () => {
    expect(src.toLowerCase()).not.toContain('whatsapp');
    expect(src.toLowerCase()).not.toMatch(/\bsms\b/);
    expect(src.toLowerCase()).not.toMatch(/\bchat\b/);
  });
});

describe('D. Operations Center metrics wiring', () => {
  const src = fs.readFileSync(OPS, 'utf-8');
  it('mounts closure & alerts sections and uses helpers', () => {
    expect(src).toContain('closures-section');
    expect(src).toContain('closures-alerts-section');
    expect(src).toContain('computeClosureMetrics');
    expect(src).toContain('computeNpsScore');
  });
  it('no supabase.from access', () => {
    expect(src).not.toMatch(/supabase\.from\(/);
  });
});

describe('E. Email templates', () => {
  for (const f of CX3_TEMPLATES) {
    it(`${f} is bilingual and safe`, () => {
      const src = fs.readFileSync(path.join(TEMPLATE_DIR, f), 'utf-8');
      expect(/[\u0600-\u06FF]/.test(src)).toBe(true);
      for (const banned of ['internal_note','internal note','supplier_quote','supplier price','staff_assignment','technician']) {
        expect(src.toLowerCase()).not.toContain(banned.toLowerCase());
      }
      expect(src.toLowerCase()).not.toContain('whatsapp');
      expect(src.toLowerCase()).not.toMatch(/\bsms\b/);
      expect(src).not.toMatch(/[?&]token=/);
    });
  }
  it('all 4 CX-3 templates are registered', () => {
    const reg = fs.readFileSync(path.join(TEMPLATE_DIR, 'registry.ts'), 'utf-8');
    for (const t of [
      'customer-project-completed',
      'customer-project-confirmed',
      'customer-warranty-started',
      'customer-thank-you-feedback',
    ]) expect(reg).toContain(`'${t}'`);
  });
});

describe('F. Event allow-list & dispatcher safety', () => {
  it('CX-3 events are declared', () => {
    for (const e of ['project.completed','project.confirmed','feedback.received','warranty.started']) {
      expect(CUSTOMER_PROJECT_EVENT_TYPES).toContain(e);
    }
  });
  it('only approved CX-3 events are wired to customer emails', () => {
    expect(isWiredCustomerProjectEventType('project.completed')).toBe(true);
    expect(isWiredCustomerProjectEventType('project.confirmed')).toBe(true);
    expect(isWiredCustomerProjectEventType('warranty.started')).toBe(true);
    // feedback.received MUST remain internal-only unless intentionally wired.
    expect(isWiredCustomerProjectEventType('feedback.received')).toBe(false);
    expect(WIRED_CUSTOMER_PROJECT_EVENT_TYPES as ReadonlyArray<string>).not.toContain('feedback.received');
  });
  it('wired CX-3 events map to a template', () => {
    for (const e of ['project.completed','project.confirmed','warranty.started'] as const) {
      expect(CUSTOMER_EVENT_COPY[e].emailTemplate).toBeTruthy();
    }
  });
  it('copy is bilingual and free of internal data', () => {
    for (const e of ['project.completed','project.confirmed','feedback.received','warranty.started'] as const) {
      const c = CUSTOMER_EVENT_COPY[e];
      expect(c.titleAr).toMatch(/[\u0600-\u06FF]/);
      expect(c.titleEn.length).toBeGreaterThan(0);
      for (const banned of ['internal_note','supplier_quote','staff_','technician','SMS','WhatsApp']) {
        expect(c.bodyAr + c.bodyEn).not.toMatch(new RegExp(banned, 'i'));
      }
    }
  });
});