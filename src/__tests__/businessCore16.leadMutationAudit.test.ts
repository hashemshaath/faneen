import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks must be set up before importing the SUTs.
// ─────────────────────────────────────────────────────────────────────────────
const emitLeadCreatedMock = vi.fn();
const emitLeadStatusChangedMock = vi.fn();
vi.mock('@/modules/leads/services/emitLeadAudit', () => ({
  emitLeadCreated: (...args: unknown[]) => emitLeadCreatedMock(...args),
  emitLeadStatusChanged: (...args: unknown[]) => emitLeadStatusChangedMock(...args),
}));

const emitQuoteAuditMock = vi.fn();
const readStatusSafeMock = vi.fn();
vi.mock('@/modules/quotes/services/emitQuoteAudit', () => ({
  emitQuoteAudit: (...args: unknown[]) => emitQuoteAuditMock(...args),
  readLeadRequestStatusSafe: (...args: unknown[]) => readStatusSafeMock(...args),
}));

const insertMock = vi.fn();
const updateMock = vi.fn();
const eqMock = vi.fn();
const fromMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import { insertLeadRequest, type InsertLeadRequestPayload } from '@/modules/leads/services/submit';
import { updateLeadRequestStatus } from '@/modules/leads/services/mutations';

const basePayload: InsertLeadRequestPayload = {
  id: 'lead-1',
  business_id: 'biz-1',
  user_id: 'usr-1',
  name: 'Test',
  email: 't@example.com',
  phone: null,
  phone_country_code: null,
  phone_national: null,
  subject: null,
  message: 'hello world long enough',
  budget_range: null,
  contact_preference: 'any',
  source: 'business-profile',
};

beforeEach(() => {
  emitLeadCreatedMock.mockReset();
  emitLeadStatusChangedMock.mockReset();
  emitQuoteAuditMock.mockReset();
  readStatusSafeMock.mockReset();
  fromMock.mockReset();
  insertMock.mockReset();
  updateMock.mockReset();
  eqMock.mockReset();
  emitLeadCreatedMock.mockResolvedValue(undefined);
  emitLeadStatusChangedMock.mockResolvedValue(undefined);
  emitQuoteAuditMock.mockResolvedValue(undefined);
  readStatusSafeMock.mockResolvedValue('new');
  // default: from() returns an object that supports both insert + update
  // so both SUTs can share the same setup.
  fromMock.mockReturnValue({ insert: insertMock, update: updateMock });
  updateMock.mockReturnValue({ eq: eqMock });
  insertMock.mockResolvedValue({ error: null });
  eqMock.mockResolvedValue({ data: null, error: null });
});

describe('BUSINESS-CORE-16 — lead.created on insertLeadRequest', () => {
  it('emits lead.created with business_id from the insert payload', async () => {
    await insertLeadRequest(basePayload);
    expect(emitLeadCreatedMock).toHaveBeenCalledTimes(1);
    expect(emitLeadCreatedMock).toHaveBeenCalledWith({
      leadRequestId: 'lead-1',
      businessId: 'biz-1',
      refId: null,
    });
  });

  it('does NOT emit when the insert errors', async () => {
    insertMock.mockResolvedValueOnce({ error: { message: 'rls' } });
    await expect(insertLeadRequest(basePayload)).rejects.toMatchObject({ message: 'rls' });
    expect(emitLeadCreatedMock).not.toHaveBeenCalled();
  });

  it('audit emission failure does not bubble up to the caller', async () => {
    emitLeadCreatedMock.mockRejectedValueOnce(new Error('audit blew up'));
    await expect(insertLeadRequest(basePayload)).resolves.toEqual({ id: 'lead-1' });
  });
});

describe('BUSINESS-CORE-16 — lead.status_changed routing', () => {
  it('routes generic transitions to lead.status_changed with previous/new', async () => {
    readStatusSafeMock.mockResolvedValueOnce('viewed');
    await updateLeadRequestStatus('l1', 'accepted');
    expect(emitLeadStatusChangedMock).toHaveBeenCalledWith({
      leadRequestId: 'l1',
      previousStatus: 'viewed',
      newStatus: 'accepted',
    });
    expect(emitQuoteAuditMock).not.toHaveBeenCalled();
  });

  it('does NOT route to lead.status_changed when this is a quote response', async () => {
    await updateLeadRequestStatus('l2', 'quoted', { quote_amount: 100 });
    expect(emitLeadStatusChangedMock).not.toHaveBeenCalled();
    expect(emitQuoteAuditMock).toHaveBeenCalledTimes(1);
    expect(emitQuoteAuditMock.mock.calls[0][0].action).toBe('quote.responded');
  });

  it('previous-status read failure does not block the mutation or the emit', async () => {
    readStatusSafeMock.mockRejectedValueOnce(new Error('read fail'));
    await updateLeadRequestStatus('l3', 'accepted');
    expect(emitLeadStatusChangedMock).toHaveBeenCalledTimes(1);
    expect(emitLeadStatusChangedMock.mock.calls[0][0].previousStatus).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// emitLeadAudit safety — uses the REAL helper with mocked deps.
// ─────────────────────────────────────────────────────────────────────────────
const recordMock = vi.fn();
vi.mock('@/modules/businesses/notes', () => ({
  recordBusinessSourceAudit: (...args: unknown[]) => recordMock(...args),
}));
const getUserMock = vi.fn();
vi.mock('@/modules/identity/services/session/getCurrentUser', () => ({
  getCurrentUser: (...args: unknown[]) => getUserMock(...args),
}));

describe('BUSINESS-CORE-16 — emitLeadAudit safety', () => {
  beforeEach(() => {
    recordMock.mockReset();
    getUserMock.mockReset();
    fromMock.mockReset();
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  async function loadReal() {
    return await vi.importActual<typeof import('@/modules/leads/services/emitLeadAudit')>(
      '@/modules/leads/services/emitLeadAudit',
    );
  }

  function mockLeadRow(row: Record<string, unknown> | null) {
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: row, error: null });
    const eq2 = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const select = vi.fn().mockReturnValue({ eq: eq2 });
    fromMock.mockReturnValue({ select });
  }

  it('emitLeadCreated skips when businessId is missing', async () => {
    const { emitLeadCreated } = await loadReal();
    await emitLeadCreated({ leadRequestId: 'l1', businessId: '' });
    expect(recordMock).not.toHaveBeenCalled();
  });

  it('emitLeadCreated writes a clean lead.created event', async () => {
    const { emitLeadCreated } = await loadReal();
    await emitLeadCreated({
      leadRequestId: 'l1',
      businessId: 'biz-1',
      refId: 'LRQ-1000001',
      status: 'new',
    });
    expect(recordMock).toHaveBeenCalledTimes(1);
    const [arg] = recordMock.mock.calls[0];
    expect(arg).toMatchObject({
      business_id: 'biz-1',
      actor_id: 'user-1',
      entity_type: 'lead',
      entity_id: 'l1',
      action: 'lead.created',
    });
    expect(arg.metadata).toMatchObject({
      lead_ref_id: 'LRQ-1000001',
      source_type: 'lead',
      new_status: 'new',
    });
  });

  it('emitLeadCreated drops UUID-shaped refs', async () => {
    const { emitLeadCreated } = await loadReal();
    await emitLeadCreated({
      leadRequestId: 'l1',
      businessId: 'biz-1',
      refId: '11111111-1111-1111-1111-111111111111',
    });
    const [arg] = recordMock.mock.calls[0];
    expect(arg.metadata.lead_ref_id).toBeNull();
  });

  it('emitLeadStatusChanged skips when lead has no business_id', async () => {
    mockLeadRow({ id: 'l1', business_id: null, ref_id: 'LRQ-1', legacy_ref_id: null, status: 'new' });
    const { emitLeadStatusChanged } = await loadReal();
    await emitLeadStatusChanged({ leadRequestId: 'l1' });
    expect(recordMock).not.toHaveBeenCalled();
  });

  it('emitLeadStatusChanged emits with safe metadata and ref fallback', async () => {
    mockLeadRow({
      id: 'l1', business_id: 'biz-1', ref_id: null, legacy_ref_id: 'LEG-1000001', status: 'accepted',
    });
    const { emitLeadStatusChanged } = await loadReal();
    await emitLeadStatusChanged({ leadRequestId: 'l1', previousStatus: 'viewed' });
    const [arg] = recordMock.mock.calls[0];
    expect(arg).toMatchObject({
      business_id: 'biz-1',
      action: 'lead.status_changed',
      entity_type: 'lead',
    });
    expect(arg.metadata).toMatchObject({
      lead_ref_id: 'LEG-1000001',
      source_type: 'lead',
      previous_status: 'viewed',
      new_status: 'accepted',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hygiene — instrumentation files don't import forbidden modules and never
// write to business_audit_log directly.
// ─────────────────────────────────────────────────────────────────────────────
describe('BUSINESS-CORE-16 — instrumentation hygiene', () => {
  const files = [
    'src/modules/leads/services/emitLeadAudit.ts',
    'src/modules/leads/services/submit.ts',
    'src/modules/leads/services/mutations.ts',
  ];

  it('no forbidden imports (notifications / realtime / cron / payments / membership / auth)', async () => {
    const fs = await import('node:fs/promises');
    for (const f of files) {
      const src = await fs.readFile(f, 'utf-8');
      expect(src, f).not.toMatch(/@\/modules\/notifications/);
      expect(src, f).not.toMatch(/@\/modules\/payments/);
      expect(src, f).not.toMatch(/@\/modules\/memberships/);
      expect(src, f).not.toMatch(/@\/modules\/auth\b/);
      expect(src, f).not.toMatch(/supabase\.channel\(/);
      expect(src, f).not.toMatch(/postgres_changes/);
      expect(src, f).not.toMatch(/sla-sweep|cron/i);
    }
  });

  it('only the helper writes to business_audit_log; lead mutation/submit services never do directly', async () => {
    const fs = await import('node:fs/promises');
    for (const f of ['src/modules/leads/services/submit.ts', 'src/modules/leads/services/mutations.ts']) {
      const src = await fs.readFile(f, 'utf-8');
      expect(src, f).not.toMatch(/business_audit_log/);
    }
  });

  it('emit metadata never carries PII / payment / token fields literally', async () => {
    const fs = await import('node:fs/promises');
    // submit.ts legitimately declares `email: string`, `phone: ...` on the
    // InsertLeadRequestPayload interface. Those are pre-existing type
    // signatures, not audit metadata — exclude from this PII grep.
    const auditFiles = files.filter((f) => !f.endsWith('/submit.ts'));
    for (const f of auditFiles) {
      const src = await fs.readFile(f, 'utf-8');
      expect(src, f).not.toMatch(/email:|phone:|client_secret:|provider_intent_id:|password:|otp:/);
    }
  });
});