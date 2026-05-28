import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks must be set up before importing the SUT.
// ─────────────────────────────────────────────────────────────────────────────
const emitMock = vi.fn();
const readStatusMock = vi.fn();
vi.mock('@/modules/quotes/services/emitQuoteAudit', () => ({
  emitQuoteAudit: (...args: unknown[]) => emitMock(...args),
  readLeadRequestStatusSafe: (...args: unknown[]) => readStatusMock(...args),
}));

const emitLeadStatusChangedMock = vi.fn();
vi.mock('@/modules/leads/services/emitLeadAudit', () => ({
  emitLeadStatusChanged: (...args: unknown[]) => emitLeadStatusChangedMock(...args),
  emitLeadCreated: vi.fn(),
}));

const updateMock = vi.fn();
const eqMock = vi.fn();
const fromMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import { updateLeadRequestStatus } from '@/modules/leads/services/mutations';

beforeEach(() => {
  emitMock.mockReset();
  readStatusMock.mockReset();
  fromMock.mockReset();
  updateMock.mockReset();
  eqMock.mockReset();
  emitLeadStatusChangedMock.mockReset();
  fromMock.mockReturnValue({ update: updateMock });
  updateMock.mockReturnValue({ eq: eqMock });
  eqMock.mockResolvedValue({ data: null, error: null });
  emitMock.mockResolvedValue(undefined);
  emitLeadStatusChangedMock.mockResolvedValue(undefined);
  readStatusMock.mockResolvedValue('new');
});

describe('BUSINESS-CORE-15 — quote mutation audit emission', () => {
  it('routes non-quote status transitions to lead.status_changed (BC-16)', async () => {
    await updateLeadRequestStatus('l1', 'accepted');
    expect(readStatusMock).toHaveBeenCalledWith('l1');
    expect(emitMock).not.toHaveBeenCalled();
    expect(emitLeadStatusChangedMock).toHaveBeenCalledWith({
      leadRequestId: 'l1',
      previousStatus: 'new',
      newStatus: 'accepted',
    });
  });

  it('emits quote.responded when status transitions to quoted', async () => {
    readStatusMock.mockResolvedValueOnce('viewed');
    await updateLeadRequestStatus('l2', 'quoted', {
      quote_amount: 1000,
      quote_currency: 'SAR',
    });
    expect(emitMock).toHaveBeenCalledWith({
      leadRequestId: 'l2',
      action: 'quote.responded',
      previousStatus: 'viewed',
      newStatus: 'quoted',
    });
  });

  it('emits quote.responded when quote fields are supplied even without quoted status', async () => {
    await updateLeadRequestStatus('l3', 'accepted', { quote_note: 'n' });
    expect(emitMock.mock.calls[0][0].action).toBe('quote.responded');
    expect(emitLeadStatusChangedMock).not.toHaveBeenCalled();
  });

  it('does NOT emit when the underlying update errors', async () => {
    eqMock.mockResolvedValueOnce({ data: null, error: { message: 'rls' } });
    await expect(updateLeadRequestStatus('l4', 'accepted')).rejects.toMatchObject({
      message: 'rls',
    });
    expect(emitMock).not.toHaveBeenCalled();
  });

  it('audit emission failure does not bubble up to the caller', async () => {
    emitMock.mockRejectedValueOnce(new Error('audit blew up'));
    await expect(updateLeadRequestStatus('l5', 'accepted')).resolves.toBeUndefined();
  });

  it('previous-status read failure does not block the mutation or the emit', async () => {
    readStatusMock.mockRejectedValueOnce(new Error('read fail'));
    await updateLeadRequestStatus('l6', 'accepted');
    // non-quote transitions now route to emitLeadStatusChanged (BC-16)
    expect(emitLeadStatusChangedMock).toHaveBeenCalledTimes(1);
    expect(emitLeadStatusChangedMock.mock.calls[0][0].previousStatus).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// emitQuoteAudit sanitization + ref validation (uses real helper, mocked deps).
// ─────────────────────────────────────────────────────────────────────────────
const recordMock = vi.fn();
vi.mock('@/modules/businesses/notes', () => ({
  recordBusinessSourceAudit: (...args: unknown[]) => recordMock(...args),
}));
const getUserMock = vi.fn();
vi.mock('@/modules/identity/services/session/getCurrentUser', () => ({
  getCurrentUser: (...args: unknown[]) => getUserMock(...args),
}));

describe('BUSINESS-CORE-15 — emitQuoteAudit safety', () => {
  beforeEach(() => {
    recordMock.mockReset();
    getUserMock.mockReset();
    fromMock.mockReset();
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  function mockLeadRow(row: Record<string, unknown> | null) {
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: row, error: null });
    const eqMock2 = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock2 });
    fromMock.mockReturnValue({ select: selectMock });
  }

  // The top-level vi.mock replaces emitQuoteAudit module with a stub.
  // The safety tests need the REAL implementation — import it via importActual.
  async function loadReal() {
    const mod = await vi.importActual<
      typeof import('@/modules/quotes/services/emitQuoteAudit')
    >('@/modules/quotes/services/emitQuoteAudit');
    return mod;
  }

  it('skips emit when lead has no business_id', async () => {
    mockLeadRow({ id: 'l1', business_id: null, ref_id: 'QTE-1', status: 'new' });
    const { emitQuoteAudit } = await loadReal();
    await emitQuoteAudit({ leadRequestId: 'l1', action: 'quote.updated' });
    expect(recordMock).not.toHaveBeenCalled();
  });

  it('drops UUID-shaped ref_id (never displays UUID)', async () => {
    mockLeadRow({
      id: 'l1',
      business_id: 'biz-1',
      ref_id: '11111111-1111-1111-1111-111111111111',
      legacy_ref_id: null,
      status: 'quoted',
    });
    const { emitQuoteAudit } = await loadReal();
    await emitQuoteAudit({ leadRequestId: 'l1', action: 'quote.responded' });
    expect(recordMock).toHaveBeenCalledTimes(1);
    const [arg] = recordMock.mock.calls[0];
    expect(arg.metadata.quote_ref_id).toBeNull();
  });

  it('keeps a properly shaped ref_id', async () => {
    mockLeadRow({
      id: 'l1', business_id: 'biz-1', ref_id: 'LRQ-1000001', legacy_ref_id: null, status: 'quoted',
    });
    const { emitQuoteAudit } = await loadReal();
    await emitQuoteAudit({
      leadRequestId: 'l1',
      action: 'quote.responded',
      previousStatus: 'viewed',
    });
    const [arg] = recordMock.mock.calls[0];
    expect(arg).toMatchObject({
      business_id: 'biz-1',
      actor_id: 'user-1',
      entity_type: 'quote',
      action: 'quote.responded',
    });
    expect(arg.metadata).toMatchObject({
      quote_ref_id: 'LRQ-1000001',
      source_type: 'quote',
      previous_status: 'viewed',
      new_status: 'quoted',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hygiene — instrumentation files don't import forbidden modules and never
// write to business_audit_log directly.
// ─────────────────────────────────────────────────────────────────────────────
describe('BUSINESS-CORE-15 — instrumentation hygiene', () => {
  const files = [
    'src/modules/quotes/services/emitQuoteAudit.ts',
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

  it('only emitQuoteAudit / helper write to business_audit_log; mutation services never do directly', async () => {
    const fs = await import('node:fs/promises');
    const src = await fs.readFile('src/modules/leads/services/mutations.ts', 'utf-8');
    expect(src).not.toMatch(/business_audit_log/);
  });

  it('emit metadata never carries PII / payment / token fields literally', async () => {
    const fs = await import('node:fs/promises');
    for (const f of files) {
      const src = await fs.readFile(f, 'utf-8');
      expect(src, f).not.toMatch(/email:|phone:|client_secret:|provider_intent_id:|password:|otp:/);
    }
  });
});