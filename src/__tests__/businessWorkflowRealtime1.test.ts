/**
 * BUSINESS-WORKFLOW-REALTIME-1 — source-level invariants for the
 * postgres_changes invalidation hook + page mounts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { QueryClient as QC } from '@tanstack/react-query';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const HOOK = 'src/hooks/useWorkOrderRealtimeInvalidation.ts';
const HOOK_SRC = read(HOOK);
const BOARD_SRC = read('src/pages/dashboard/ProductionBoardPage.tsx');
const WO_DETAIL_SRC = read('src/pages/dashboard/DashboardWorkOrderDetail.tsx');
const PROC_DETAIL_SRC = read('src/pages/dashboard/DashboardProcurementDetail.tsx');

describe('BUSINESS-WORKFLOW-REALTIME-1 hook source invariants', () => {
  it('exports useWorkOrderRealtimeInvalidation', () => {
    expect(HOOK_SRC).toMatch(/export\s+function\s+useWorkOrderRealtimeInvalidation/);
  });

  it('uses postgres_changes only — no broadcast / presence / realtime.messages', () => {
    expect(HOOK_SRC).toMatch(/postgres_changes/);
    expect(HOOK_SRC).not.toMatch(/broadcast/i);
    expect(HOOK_SRC).not.toMatch(/presence/i);
    expect(HOOK_SRC).not.toMatch(/realtime\.messages/);
    expect(HOOK_SRC).not.toMatch(/\btrack\s*\(/);
  });

  it('does not call supabase.from directly inside the hook', () => {
    expect(HOOK_SRC).not.toMatch(/supabase\.from\(/);
  });

  it('scopes channel name by businessId and bails when missing', () => {
    expect(HOOK_SRC).toMatch(/qitaat-workflow-\$\{businessId\}/);
    expect(HOOK_SRC).toMatch(/if\s*\(\s*!businessId\s*\)\s*return/);
  });

  it('cleans up via supabase.removeChannel', () => {
    expect(HOOK_SRC).toMatch(/supabase\.removeChannel\(/);
  });

  it('does not insert notifications / send emails / call external services', () => {
    expect(HOOK_SRC).not.toMatch(/notifications/);
    expect(HOOK_SRC).not.toMatch(/sendEmail|sendSms|sendWhatsapp|enqueueNotification/);
    expect(HOOK_SRC).not.toMatch(/\bfetch\s*\(/);
  });

  it('does not import payments / membership / auth-mutation / contracts modules', () => {
    for (const mod of [
      '@/modules/payments',
      '@/modules/memberships',
      '@/modules/billing',
      '@/modules/notifications',
      '@/modules/contracts',
      '@/modules/auth',
    ]) {
      expect(HOOK_SRC).not.toContain(`from "${mod}"`);
      expect(HOOK_SRC).not.toContain(`from '${mod}'`);
    }
  });

  it('invalidates the documented React Query keys', () => {
    for (const key of [
      'work-orders',
      'work-order-detail',
      'work-order-board',
      'work-order-pipeline',
      'work-order-checklists',
      'work-order-boqs',
      'work-order-quotations',
      'procurement-rfqs',
      'procurement-detail',
      'procurement-po-drafts',
    ]) {
      expect(HOOK_SRC).toContain(`'${key}'`);
    }
  });

  it('lists the documented postgres_changes tables', () => {
    for (const t of [
      'work_orders',
      'work_order_stage_assignments',
      'work_order_checklists',
      'work_order_checklist_items',
      'work_order_pipeline_events',
      'work_order_boqs',
      'work_order_quotations',
      'procurement_rfqs',
      'procurement_supplier_quotes',
      'procurement_purchase_orders',
    ]) {
      expect(HOOK_SRC).toContain(`'${t}'`);
    }
  });
});

describe('BUSINESS-WORKFLOW-REALTIME-1 page mounts', () => {
  it('ProductionBoardPage mounts the hook', () => {
    expect(BOARD_SRC).toMatch(/useWorkOrderRealtimeInvalidation\(/);
  });
  it('DashboardWorkOrderDetail mounts the hook', () => {
    expect(WO_DETAIL_SRC).toMatch(/useWorkOrderRealtimeInvalidation\(/);
  });
  it('DashboardProcurementDetail mounts the hook', () => {
    expect(PROC_DETAIL_SRC).toMatch(/useWorkOrderRealtimeInvalidation\(/);
  });
});

// ─── Runtime behavior ─────────────────────────────────────────────────────
type Chain = {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  _ons: Array<{ topic: string; cfg: Record<string, unknown>; cb: () => void }>;
};

let chain: Chain;
const channelMock = vi.fn();
const removeChannelMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: (n: string) => channelMock(n),
    removeChannel: (c: unknown) => removeChannelMock(c),
  },
}));

beforeEach(() => {
  chain = {
    on: vi.fn(),
    subscribe: vi.fn(),
    _ons: [],
  };
  chain.on.mockImplementation((topic: string, cfg: Record<string, unknown>, cb: () => void) => {
    chain._ons.push({ topic, cfg, cb });
    return chain;
  });
  chain.subscribe.mockImplementation(() => chain);
  channelMock.mockReset();
  channelMock.mockImplementation(() => chain);
  removeChannelMock.mockReset();
});

describe('BUSINESS-WORKFLOW-REALTIME-1 runtime', () => {
  it('skips subscription when businessId is missing', async () => {
    const { renderHook } = await import('@testing-library/react');
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const { useWorkOrderRealtimeInvalidation } = await import(
      '../hooks/useWorkOrderRealtimeInvalidation'
    );
    const qc = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      ((QueryClientProvider as unknown) as (props: { client: QC; children: React.ReactNode }) => JSX.Element)(
        { client: qc, children },
      );
    renderHook(() => useWorkOrderRealtimeInvalidation({ businessId: null }), { wrapper });
    expect(channelMock).not.toHaveBeenCalled();
  });

  it('subscribes with scoped channel and invalidates keys; cleans up on unmount', async () => {
    const { renderHook } = await import('@testing-library/react');
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const { useWorkOrderRealtimeInvalidation } = await import(
      '../hooks/useWorkOrderRealtimeInvalidation'
    );
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      ((QueryClientProvider as unknown) as (props: { client: QC; children: React.ReactNode }) => JSX.Element)(
        { client: qc, children },
      );
    const onChange = vi.fn();
    const { unmount } = renderHook(
      () =>
        useWorkOrderRealtimeInvalidation({
          businessId: 'biz-1',
          workOrderId: 'wo-1',
          onChange,
        }),
      { wrapper },
    );

    expect(channelMock).toHaveBeenCalledWith('qitaat-workflow-biz-1');
    // 10 tables × 1 listener
    expect(chain._ons).toHaveLength(10);
    // Every listener uses postgres_changes
    for (const o of chain._ons) {
      expect(o.topic).toBe('postgres_changes');
      expect(o.cfg.schema).toBe('public');
      expect(o.cfg.event).toBe('*');
    }
    // business-scoped table carries business_id filter
    const wo = chain._ons.find((o) => o.cfg.table === 'work_orders')!;
    expect(wo.cfg.filter).toBe('business_id=eq.biz-1');
    // work-order-scoped table carries work_order_id filter
    const chk = chain._ons.find((o) => o.cfg.table === 'work_order_checklists')!;
    expect(chk.cfg.filter).toBe('work_order_id=eq.wo-1');

    // Fire a change → invalidates + onChange
    chain._ons[0].cb();
    expect(spy).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledTimes(1);

    unmount();
    expect(removeChannelMock).toHaveBeenCalledWith(chain);
  });
});