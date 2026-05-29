/**
 * CUSTOMER-EXPERIENCE-2 — Installation appointments: migration contract,
 * services, portal/provider UI, communications, security boundaries.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  computeInstallationMetrics,
  type InstallationAppointmentRow,
} from '@/modules/installationAppointments';
import {
  CUSTOMER_PROJECT_EVENT_TYPES,
  WIRED_CUSTOMER_PROJECT_EVENT_TYPES,
  isWiredCustomerProjectEventType,
} from '@/modules/operations/customerCommunications/eventTypes';
import { CUSTOMER_EVENT_COPY } from '@/modules/operations/customerCommunications/copy';

const ROOT = path.resolve(__dirname, '..', '..');
const MIGRATION_DIR = path.join(ROOT, 'supabase/migrations');
const PORTAL_PAGE = path.join(ROOT, 'src/pages/CustomerProjectPortal.tsx');
const PROVIDER_CARD = path.join(
  ROOT,
  'src/components/workOrders/InstallationAppointmentCard.tsx',
);
const OPS_PAGE = path.join(ROOT, 'src/pages/dashboard/DashboardOperationsCenter.tsx');
const TEMPLATE_DIR = path.join(
  ROOT,
  'supabase/functions/_shared/transactional-email-templates',
);
const INSTALL_TEMPLATES = [
  'customer-installation-scheduled.tsx',
  'customer-installation-confirmed.tsx',
  'customer-installation-reschedule-requested.tsx',
  'customer-installation-completed.tsx',
];

function allSql(): string {
  return fs
    .readdirSync(MIGRATION_DIR)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => fs.readFileSync(path.join(MIGRATION_DIR, f), 'utf8'))
    .join('\n');
}

describe('A. Migration contract', () => {
  const sql = allSql();
  it('creates installation_appointments with APT- ref + sequence', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.installation_appointments/);
    expect(sql).toMatch(/'APT-' \|\| lpad/);
    expect(sql).toMatch(/seq_installation_appointment/);
  });
  it('enforces one active appointment per work order', () => {
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX[^;]+installation_appointments\(work_order_id\)\s+WHERE status NOT IN \('cancelled','completed'\)/,
    );
  });
  it('enables RLS and grants only authenticated/service_role', () => {
    expect(sql).toMatch(/ALTER TABLE public\.installation_appointments ENABLE ROW LEVEL SECURITY/);
    expect(sql).not.toMatch(/GRANT[^;]+ON public\.installation_appointments[^;]+TO anon/);
  });
  it('provider RPCs are authenticated-only', () => {
    for (const fn of [
      'create_installation_appointment',
      'update_installation_appointment',
      'cancel_installation_appointment',
      'complete_installation_appointment',
    ]) {
      expect(sql).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn}[^;]+TO authenticated`));
      expect(sql).not.toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn}[^;]+anon`));
    }
  });
  it('customer RPCs are anon-callable, token-gated', () => {
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.customer_confirm_appointment[^;]+TO anon, authenticated/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.customer_request_appointment_reschedule[^;]+TO anon, authenticated/);
    // Token hash verification present
    expect(sql).toMatch(/encode\(extensions\.digest\(_token, 'sha256'\)/);
    expect(sql).toMatch(/length\(_token\) < 32/);
  });
  it('complete cannot run on cancelled appointment', () => {
    expect(sql).toMatch(/appointment_cancelled/);
  });
  it('snapshot RPC exposes only customer-safe installation fields', () => {
    const fn = sql.match(
      /CREATE OR REPLACE FUNCTION public\.get_customer_project_snapshot[\s\S]+?\$\$;[\s\S]+?GRANT EXECUTE[^;]+;/g,
    );
    expect(fn, 'snapshot fn').toBeTruthy();
    const latest = fn![fn!.length - 1];
    expect(latest).toMatch(/'installation', v_installation/);
    // The installation jsonb_build_object must NOT contain internal_note or created_by
    const block = latest.match(/SELECT jsonb_build_object\(\s*'appointment_ref'[\s\S]+?FROM public\.installation_appointments/)![0];
    for (const forbidden of ['internal_note', 'created_by', 'business_id', 'work_order_id']) {
      expect(block).not.toMatch(new RegExp(forbidden));
    }
  });
});

describe('B. Metrics aggregation', () => {
  const today = new Date('2026-05-30T12:00:00Z');
  const mk = (over: Partial<InstallationAppointmentRow>): InstallationAppointmentRow => ({
    id: 'x', ref_id: 'APT-1', business_id: 'b', work_order_id: 'w',
    customer_tracking_link_id: null, scheduled_date: '2026-05-30',
    time_window: null, status: 'scheduled', customer_confirmation_status: 'pending',
    customer_note: null, internal_note: null, confirmed_at: null, completed_at: null,
    created_at: '', updated_at: '', ...over,
  });
  it('counts core buckets correctly', () => {
    const m = computeInstallationMetrics([
      mk({ status: 'scheduled', customer_confirmation_status: 'pending' }),
      mk({ status: 'confirmed', customer_confirmation_status: 'confirmed' }),
      mk({ status: 'reschedule_requested', customer_confirmation_status: 'reschedule_requested' }),
      mk({ status: 'completed' }),
      mk({ status: 'cancelled' }),
    ], today);
    expect(m.scheduled).toBe(1);
    expect(m.rescheduleRequests).toBe(1);
    expect(m.completed).toBe(1);
    expect(m.awaitingConfirmation).toBe(1);
    expect(m.alertRescheduleAwaitingAction).toBe(1);
  });
  it('flags within-24h-unconfirmed and overdue alerts', () => {
    const m = computeInstallationMetrics([
      mk({ scheduled_date: '2026-05-30', status: 'scheduled', customer_confirmation_status: 'pending' }),
      mk({ scheduled_date: '2026-05-25', status: 'scheduled' }),
      mk({ scheduled_date: '2026-05-25', status: 'completed' }),
    ], today);
    expect(m.alertWithin24hUnconfirmed).toBeGreaterThanOrEqual(1);
    expect(m.alertOverdue).toBe(1);
  });
});

describe('C. Events & copy', () => {
  it('wires the 4 installation events', () => {
    for (const e of [
      'installation.scheduled',
      'installation.confirmed',
      'installation.reschedule_requested',
      'installation.completed',
    ]) {
      expect(CUSTOMER_PROJECT_EVENT_TYPES).toContain(e);
      expect(isWiredCustomerProjectEventType(e)).toBe(true);
    }
  });
  it('all wired installation events map to a template', () => {
    for (const e of WIRED_CUSTOMER_PROJECT_EVENT_TYPES) {
      if (e.startsWith('installation.')) {
        expect(CUSTOMER_EVENT_COPY[e].emailTemplate).toBeTruthy();
      }
    }
  });
  it('copy is bilingual and free of internal data', () => {
    for (const e of ['installation.scheduled','installation.confirmed','installation.reschedule_requested','installation.completed'] as const) {
      const c = CUSTOMER_EVENT_COPY[e];
      expect(c.titleAr).toMatch(/[\u0600-\u06FF]/);
      expect(c.titleEn.length).toBeGreaterThan(0);
      for (const banned of ['internal_note','supplier_quote','staff_','technician','SMS','WhatsApp']) {
        expect(c.bodyAr + c.bodyEn).not.toMatch(new RegExp(banned, 'i'));
      }
    }
  });
});

describe('D. Email templates', () => {
  for (const f of INSTALL_TEMPLATES) {
    it(`${f} is bilingual and safe`, () => {
      const src = fs.readFileSync(path.join(TEMPLATE_DIR, f), 'utf-8');
      expect(src).toMatch(/titleAr/);
      expect(src).toMatch(/titleEn/);
      expect(/[\u0600-\u06FF]/.test(src)).toBe(true);
      for (const banned of ['internal_note','internal note','supplier_quote','supplier price','staff_assignment','technician']) {
        expect(src.toLowerCase()).not.toContain(banned.toLowerCase());
      }
      expect(src.toLowerCase()).not.toContain('whatsapp');
      expect(src.toLowerCase()).not.toMatch(/\bsms\b/);
      expect(src).not.toMatch(/[?&]token=/);
    });
  }
  it('all 4 installation templates are registered', () => {
    const reg = fs.readFileSync(path.join(TEMPLATE_DIR, 'registry.ts'), 'utf-8');
    expect(reg).toContain("'customer-installation-scheduled'");
    expect(reg).toContain("'customer-installation-confirmed'");
    expect(reg).toContain("'customer-installation-reschedule-requested'");
    expect(reg).toContain("'customer-installation-completed'");
  });
});

describe('E. Customer portal security', () => {
  const src = fs.readFileSync(PORTAL_PAGE, 'utf-8');
  it('renders installation section and inline reschedule form (no dialogs)', () => {
    expect(src).toContain('customer-portal-installation');
    expect(src).toContain('customer-reschedule-form');
    expect(src).toContain('customer-confirm-appointment');
    expect(src).not.toMatch(/<Dialog|<AlertDialog|<Modal|<Drawer/);
  });
  it('does not access supabase.from or expose internal/staff data', () => {
    expect(src).not.toMatch(/supabase\.from\(/);
    for (const forbidden of ['internal_note','staff_','technician','created_by','supplier_']) {
      expect(src).not.toMatch(new RegExp(forbidden));
    }
  });
  it('uses module wrappers for customer actions', () => {
    expect(src).toContain('confirmAppointment');
    expect(src).toContain('requestAppointmentReschedule');
  });
});

describe('F. Provider card', () => {
  const src = fs.readFileSync(PROVIDER_CARD, 'utf-8');
  it('inline-only — contains no dialogs', () => {
    expect(src).not.toMatch(/<Dialog|<AlertDialog|<Modal|<Drawer/);
  });
  it('uses typed module wrappers, not raw supabase', () => {
    expect(src).not.toMatch(/supabase\.from\(/);
    expect(src).not.toMatch(/supabase\.rpc\(/);
    expect(src).toContain('createInstallationAppointment');
    expect(src).toContain('cancelInstallationAppointment');
    expect(src).toContain('completeInstallationAppointment');
  });
  it('hides from non-managers', () => {
    expect(src).toMatch(/if \(!canManage\) return null;/);
  });
});

describe('G. Operations Center metrics wiring', () => {
  const src = fs.readFileSync(OPS_PAGE, 'utf-8');
  it('includes installation metrics + alerts sections', () => {
    expect(src).toContain('installations-section');
    expect(src).toContain('installation-alerts-section');
    expect(src).toContain('computeInstallationMetrics');
  });
  it('does not access supabase.from directly', () => {
    expect(src).not.toMatch(/supabase\.from\(/);
  });
});