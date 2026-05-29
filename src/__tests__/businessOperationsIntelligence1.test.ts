/**
 * BUSINESS-OPERATIONS-INTELLIGENCE-1 — Customer communications & ops center guards.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const ROOT = path.resolve(__dirname, '..', '..');
const CC_DIR = path.join(ROOT, 'src/modules/operations/customerCommunications');
const TEMPLATE_DIR = path.join(
  ROOT,
  'supabase/functions/_shared/transactional-email-templates',
);
const CUSTOMER_TEMPLATES = [
  'customer-quotation-ready.tsx',
  'customer-quotation-approved.tsx',
  'customer-work-order-created.tsx',
  'customer-work-order-completed.tsx',
];
const OPS_PAGE = path.join(ROOT, 'src/pages/dashboard/DashboardOperationsCenter.tsx');

import {
  CUSTOMER_PROJECT_EVENT_TYPES,
  WIRED_CUSTOMER_PROJECT_EVENT_TYPES,
  isCustomerProjectEventType,
  isWiredCustomerProjectEventType,
} from '@/modules/operations/customerCommunications/eventTypes';
import {
  isDeliverableCustomerEmail,
  isSafeCustomerActionUrl,
} from '@/modules/operations/customerCommunications/safety';

const insertMock = vi.fn();
const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      insert: (row: unknown) => ({
        select: () => ({
          maybeSingle: () => insertMock(row),
        }),
      }),
    }),
    functions: { invoke: (...a: unknown[]) => invokeMock(...a) },
  },
}));

beforeEach(() => {
  insertMock.mockReset();
  invokeMock.mockReset();
});

import { dispatchCustomerProjectNotification } from '@/modules/operations/customerCommunications/dispatcher';

describe('event allow-list', () => {
  it('contains all required customer events', () => {
    for (const evt of [
      'quotation.sent', 'quotation.viewed', 'quotation.approved',
      'quotation.rejected', 'quotation.expiring_soon',
      'contract.draft_created', 'contract.sent', 'contract.signed', 'contract.activated',
      'work_order.created', 'work_order.measurements_started',
      'work_order.measurements_completed', 'work_order.production_started',
      'work_order.qc_started', 'work_order.ready_for_installation',
      'work_order.installation_scheduled', 'work_order.completed',
      'customer_visible_attachment_added',
    ]) {
      expect(isCustomerProjectEventType(evt)).toBe(true);
    }
  });
  it('rejects unknown events', () => {
    expect(isCustomerProjectEventType('whatever.random')).toBe(false);
  });
  it('wired list is the safe low-risk subset', () => {
    expect([...WIRED_CUSTOMER_PROJECT_EVENT_TYPES].sort()).toEqual(
      [
        'installation.completed',
        'installation.confirmed',
        'installation.reschedule_requested',
        'installation.scheduled',
        'quotation.approved',
        'quotation.sent',
        'work_order.completed',
        'work_order.created',
      ],
    );
    for (const evt of WIRED_CUSTOMER_PROJECT_EVENT_TYPES) {
      expect(CUSTOMER_PROJECT_EVENT_TYPES).toContain(evt);
      expect(isWiredCustomerProjectEventType(evt)).toBe(true);
    }
  });
});

describe('safety helpers', () => {
  it('blocks synthetic phone emails', () => {
    expect(isDeliverableCustomerEmail('966500000000@phone.qitaat.local')).toBe(false);
  });
  it('blocks example/test domains', () => {
    expect(isDeliverableCustomerEmail('foo@example.com')).toBe(false);
    expect(isDeliverableCustomerEmail('foo@test.local')).toBe(false);
  });
  it('accepts normal emails', () => {
    expect(isDeliverableCustomerEmail('client@acme.sa')).toBe(true);
  });
  it('rejects URLs containing raw UUIDs', () => {
    expect(
      isSafeCustomerActionUrl('https://qitaat.com/q/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
    ).toBe(false);
  });
  it('accepts /q/:refId style URLs', () => {
    expect(isSafeCustomerActionUrl('https://qitaat.com/q/QT-1000001')).toBe(true);
    expect(isSafeCustomerActionUrl('/q/QT-1000001')).toBe(true);
  });
  it('rejects arbitrary external URLs', () => {
    expect(isSafeCustomerActionUrl('https://evil.example/path')).toBe(false);
  });
});

describe('dispatcher', () => {
  it('requires an idempotency key', async () => {
    const r = await dispatchCustomerProjectNotification({
      eventType: 'work_order.created', businessId: 'b1', idempotencyKey: '',
    });
    expect(r.outcome).toBe('skipped_missing_idempotency');
    expect(insertMock).not.toHaveBeenCalled();
  });
  it('rejects events not in the wired allow-list', async () => {
    const r = await dispatchCustomerProjectNotification({
      eventType: 'work_order.qc_started', businessId: 'b1', idempotencyKey: 'k1',
    });
    expect(r.outcome).toBe('skipped_event_not_wired');
    expect(insertMock).not.toHaveBeenCalled();
  });
  it('rejects unknown events', async () => {
    const r = await dispatchCustomerProjectNotification({
      eventType: 'nope', businessId: 'b1', idempotencyKey: 'k1',
    });
    expect(r.outcome).toBe('skipped_invalid_event');
  });
  it('does not email synthetic phone addresses', async () => {
    insertMock.mockResolvedValue({ data: { id: 'n1' }, error: null });
    const r = await dispatchCustomerProjectNotification({
      eventType: 'work_order.created', businessId: 'b1',
      customerEmail: '966500000000@phone.qitaat.local', idempotencyKey: 'k2',
    });
    expect(r.outcome).toBe('queued_internal');
    expect(invokeMock).not.toHaveBeenCalled();
    const row = insertMock.mock.calls[0][0];
    expect(row.channel).toBe('internal');
  });
  it('sends transactional email for safe address', async () => {
    insertMock.mockResolvedValue({ data: { id: 'n2' }, error: null });
    invokeMock.mockResolvedValue({ data: { sent: true }, error: null });
    const r = await dispatchCustomerProjectNotification({
      eventType: 'quotation.sent', businessId: 'b1',
      customerEmail: 'client@acme.sa', idempotencyKey: 'k3',
      actionUrl: 'https://qitaat.com/q/QT-1000001',
    });
    expect(r.outcome).toBe('sent');
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock.mock.calls[0][0]).toBe('send-transactional-email');
    const body = invokeMock.mock.calls[0][1].body;
    expect(body.templateName).toBe('customer-quotation-ready');
    expect(body.idempotencyKey).toBe('k3');
  });
  it('blocks unsafe action URL', async () => {
    const r = await dispatchCustomerProjectNotification({
      eventType: 'quotation.sent', businessId: 'b1',
      customerEmail: 'client@acme.sa', idempotencyKey: 'k4',
      actionUrl: 'https://evil.example/path',
    });
    expect(r.outcome).toBe('skipped_unsafe_action_url');
  });
  it('never throws into the caller', async () => {
    insertMock.mockRejectedValue(new Error('boom'));
    const r = await dispatchCustomerProjectNotification({
      eventType: 'work_order.completed', businessId: 'b1', idempotencyKey: 'k5',
    });
    expect(r.ok).toBe(false);
    expect(r.outcome).toBe('failed');
  });
});

describe('email templates', () => {
  for (const file of CUSTOMER_TEMPLATES) {
    it(`${file} contains AR and EN content and is free of internal data`, () => {
      const src = fs.readFileSync(path.join(TEMPLATE_DIR, file), 'utf-8');
      expect(src).toMatch(/titleAr/);
      expect(src).toMatch(/titleEn/);
      expect(/[\u0600-\u06FF]/.test(src)).toBe(true);
      // No banned content
      for (const banned of [
        'internal_note', 'internal note',
        'supplier_price', 'supplier price', 'supplier_quote', 'supplier quote',
        'audit_metadata', 'sla_event',
      ]) {
        expect(src.toLowerCase()).not.toContain(banned);
      }
      // No raw token-style query params in the template body
      expect(src).not.toMatch(/[?&]token=/);
      // No SMS/WhatsApp wiring
      expect(src.toLowerCase()).not.toContain('whatsapp');
      expect(src.toLowerCase()).not.toMatch(/\bsms\b/);
    });
  }

  it('all four templates are registered', () => {
    const reg = fs.readFileSync(path.join(TEMPLATE_DIR, 'registry.ts'), 'utf-8');
    expect(reg).toContain("'customer-quotation-ready'");
    expect(reg).toContain("'customer-quotation-approved'");
    expect(reg).toContain("'customer-work-order-created'");
    expect(reg).toContain("'customer-work-order-completed'");
  });
});

describe('operations center page', () => {
  const src = fs.readFileSync(OPS_PAGE, 'utf-8');
  it('exists and uses pure analytics helpers', () => {
    expect(src).toContain('computeProductionMetrics');
    expect(src).toContain('computeWorkOrderDiagnostics');
    expect(src).toContain('computeProcurementDiagnostics');
    expect(src).toContain('KpiStrip');
  });
  it('does not contain forbidden domains', () => {
    for (const banned of [
      'inventory', 'supplier_payment', 'accounting', 'whatsapp', 'twilio',
    ]) {
      expect(src.toLowerCase()).not.toContain(banned);
    }
  });
  it('does not access supabase.from directly', () => {
    expect(src).not.toMatch(/supabase\.from\(/);
  });
  it('is registered as a dashboard route', () => {
    const app = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
    expect(app).toContain('/dashboard/operations-center');
    expect(app).toContain('DashboardOperationsCenter');
  });
});

describe('dispatcher source guarantees', () => {
  const src = fs.readFileSync(path.join(CC_DIR, 'dispatcher.ts'), 'utf-8');
  it('routes email through the shared wrapper', () => {
    expect(src).toContain("from '@/modules/notifications/services/sendTransactionalEmail'");
  });
  it('does not use SMS/WhatsApp/external provider', () => {
    const lower = src.toLowerCase();
    expect(lower).not.toContain('whatsapp');
    expect(lower).not.toMatch(/\bsms\b/);
    expect(lower).not.toContain('twilio');
    expect(lower).not.toContain('messagebird');
  });
  it('does not import inventory/supplier-payments/accounting modules', () => {
    expect(src).not.toMatch(/from ['"]@\/modules\/(inventory|accounting|warehouse)/);
  });
});