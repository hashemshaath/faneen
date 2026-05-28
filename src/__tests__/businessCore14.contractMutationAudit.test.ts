import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks must be set up before importing the SUT.
// ─────────────────────────────────────────────────────────────────────────────
const emitMock = vi.fn();
const readStatusMock = vi.fn();
vi.mock('@/modules/contracts/services/emitContractAudit', () => ({
  emitContractAudit: (...args: unknown[]) => emitMock(...args),
  readContractStatusSafe: (...args: unknown[]) => readStatusMock(...args),
}));

const rpcMock = vi.fn();
const updateMock = vi.fn();
const eqMock = vi.fn();
const fromMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import { createContractFromTemplate } from '@/modules/contracts/services/createContractFromTemplate';
import { updateContractById } from '@/modules/contracts/services/updateContractById';
import {
  acceptContract,
  sendContractForApproval,
} from '@/modules/contracts/services/mutations';

beforeEach(() => {
  emitMock.mockReset();
  readStatusMock.mockReset();
  rpcMock.mockReset();
  fromMock.mockReset();
  updateMock.mockReset();
  eqMock.mockReset();
  fromMock.mockReturnValue({ update: updateMock });
  updateMock.mockReturnValue({ eq: eqMock });
  eqMock.mockResolvedValue({ data: null, error: null });
  emitMock.mockResolvedValue(undefined);
  readStatusMock.mockResolvedValue(null);
});

describe('BUSINESS-CORE-14 — contract mutation audit emission', () => {
  it('createContractFromTemplate emits contract.created with the returned id', async () => {
    rpcMock.mockResolvedValueOnce({ data: 'new-contract-uuid', error: null });
    const r = await createContractFromTemplate({
      _payload: { a: 1 },
      _template_version_id: 'v1',
    } as never);
    expect(r).toEqual({ data: 'new-contract-uuid', error: null });
    expect(emitMock).toHaveBeenCalledTimes(1);
    expect(emitMock).toHaveBeenCalledWith({
      contractId: 'new-contract-uuid',
      action: 'contract.created',
    });
  });

  it('createContractFromTemplate does NOT emit when RPC errors', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'fail' } });
    await createContractFromTemplate({
      _payload: {},
      _template_version_id: 'v1',
    } as never);
    expect(emitMock).not.toHaveBeenCalled();
  });

  it('updateContractById emits contract.updated when payload has no status', async () => {
    await updateContractById('c1', { title_ar: 'x' });
    expect(readStatusMock).not.toHaveBeenCalled();
    expect(emitMock).toHaveBeenCalledWith({
      contractId: 'c1',
      action: 'contract.updated',
    });
  });

  it('updateContractById emits contract.status_changed with previous/new when status is set', async () => {
    readStatusMock.mockResolvedValueOnce('draft');
    await updateContractById('c2', { status: 'active', title_ar: 'x' });
    expect(readStatusMock).toHaveBeenCalledWith('c2');
    expect(emitMock).toHaveBeenCalledWith({
      contractId: 'c2',
      action: 'contract.status_changed',
      previousStatus: 'draft',
      newStatus: 'active',
    });
  });

  it('updateContractById does NOT emit when update errors', async () => {
    eqMock.mockResolvedValueOnce({ data: null, error: { message: 'rls' } });
    await updateContractById('c3', { title_ar: 'y' });
    expect(emitMock).not.toHaveBeenCalled();
  });

  it('acceptContract emits contract.signed after successful RPC', async () => {
    rpcMock.mockResolvedValueOnce({ data: { status: 'active' }, error: null });
    await acceptContract('c4');
    expect(emitMock).toHaveBeenCalledWith({
      contractId: 'c4',
      action: 'contract.signed',
    });
  });

  it('acceptContract does NOT emit when RPC throws', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'denied' } });
    await expect(acceptContract('c5')).rejects.toMatchObject({ message: 'denied' });
    expect(emitMock).not.toHaveBeenCalled();
  });

  it('sendContractForApproval reads previous status then emits contract.status_changed', async () => {
    readStatusMock.mockResolvedValueOnce('draft');
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await sendContractForApproval('c6');
    expect(readStatusMock).toHaveBeenCalledWith('c6');
    expect(emitMock).toHaveBeenCalledWith({
      contractId: 'c6',
      action: 'contract.status_changed',
      previousStatus: 'draft',
    });
  });

  it('audit emission failure does not bubble up to the mutation caller', async () => {
    emitMock.mockRejectedValueOnce(new Error('audit blew up'));
    rpcMock.mockResolvedValueOnce({ data: 'new-id', error: null });
    await expect(
      createContractFromTemplate({
        _payload: {},
        _template_version_id: 'v1',
      } as never),
    ).resolves.toEqual({ data: 'new-id', error: null });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hygiene — instrumentation files don't import forbidden modules and don't
// write to business_audit_log directly (only through the helper).
// ─────────────────────────────────────────────────────────────────────────────
describe('BUSINESS-CORE-14 — instrumentation hygiene', () => {
  const files = [
    'src/modules/contracts/services/emitContractAudit.ts',
    'src/modules/contracts/services/createContractFromTemplate.ts',
    'src/modules/contracts/services/updateContractById.ts',
    'src/modules/contracts/services/mutations.ts',
  ];

  it('no forbidden imports (notifications / realtime / cron / auth / payments / membership)', async () => {
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

  it('only emitContractAudit writes to business_audit_log; mutation services never do directly', async () => {
    const fs = await import('node:fs/promises');
    for (const f of files.slice(1)) {
      const src = await fs.readFile(f, 'utf-8');
      expect(src, f).not.toMatch(/business_audit_log/);
    }
  });

  it('emit metadata never carries PII / payment / token fields literally', async () => {
    const fs = await import('node:fs/promises');
    for (const f of files) {
      const src = await fs.readFile(f, 'utf-8');
      expect(src, f).not.toMatch(/email:|phone:|client_secret:|provider_intent_id:|password:|otp:/);
    }
  });
});