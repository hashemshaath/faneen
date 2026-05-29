/**
 * BUSINESS-WORKFLOW-REALTIME-1 — Safe Postgres Changes invalidation.
 *
 * Subscribes to per-business `postgres_changes` for the work-order +
 * procurement tables and invalidates the registered React Query keys.
 *
 * Hard constraints (enforced by tests):
 *  - postgres_changes only (no other realtime channel types)
 *  - no direct supabase.from / mutation from realtime callbacks
 *  - channel scoped per business: `qitaat-workflow-{businessId}`
 *  - no subscription when businessId is missing
 *  - clean teardown via supabase.removeChannel on unmount
 *  - no toasts, no notification inserts, no external calls
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type Table =
  | 'work_orders'
  | 'work_order_stage_assignments'
  | 'work_order_checklists'
  | 'work_order_checklist_items'
  | 'work_order_pipeline_events'
  | 'work_order_boqs'
  | 'work_order_quotations'
  | 'procurement_rfqs'
  | 'procurement_supplier_quotes'
  | 'procurement_purchase_orders';

/** Tables that carry a `business_id` column we can filter on. */
const BUSINESS_SCOPED_TABLES: ReadonlyArray<Table> = [
  'work_orders',
  'work_order_boqs',
  'work_order_quotations',
  'procurement_rfqs',
  'procurement_supplier_quotes',
  'procurement_purchase_orders',
];

/** Tables filtered by work_order_id when a workOrderId is provided. */
const WORK_ORDER_SCOPED_TABLES: ReadonlyArray<Table> = [
  'work_order_stage_assignments',
  'work_order_checklists',
  'work_order_checklist_items',
  'work_order_pipeline_events',
];

const ALL_TABLES: ReadonlyArray<Table> = [
  ...BUSINESS_SCOPED_TABLES,
  ...WORK_ORDER_SCOPED_TABLES,
];

/** React Query keys that may be invalidated by realtime events. */
const QUERY_KEYS: ReadonlyArray<ReadonlyArray<string>> = [
  ['work-orders'],
  ['work-order-detail'],
  ['work-order-board'],
  ['work-order-pipeline'],
  ['work-order-checklists'],
  ['work-order-boqs'],
  ['work-order-quotations'],
  ['procurement-rfqs'],
  ['procurement-detail'],
  ['procurement-po-drafts'],
];

export function useWorkOrderRealtimeInvalidation(opts: {
  businessId: string | null | undefined;
  workOrderId?: string | null;
  /** Optional refetch trigger for pages that don't use React Query. */
  onChange?: () => void;
}): void {
  const qc = useQueryClient();
  const { businessId, workOrderId, onChange } = opts;

  useEffect(() => {
    // Safety: never subscribe without a scoped businessId.
    if (!businessId) return;

    let channel = supabase.channel(`qitaat-workflow-${businessId}`);

    const handle = () => {
      for (const key of QUERY_KEYS) {
        qc.invalidateQueries({ queryKey: key as unknown[] });
      }
      if (onChange) onChange();
    };

    for (const table of ALL_TABLES) {
      const config: Record<string, unknown> = {
        event: '*',
        schema: 'public',
        table,
      };
      if (BUSINESS_SCOPED_TABLES.includes(table)) {
        config.filter = `business_id=eq.${businessId}`;
      } else if (workOrderId) {
        config.filter = `work_order_id=eq.${workOrderId}`;
      }
      channel = channel.on(
        // postgres_changes is loosely typed in supabase-js v2.
        'postgres_changes' as unknown as 'system',
        config as never,
        handle,
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, workOrderId, qc]);
}

export const WORK_ORDER_REALTIME_TABLES = ALL_TABLES;
export const WORK_ORDER_REALTIME_QUERY_KEYS = QUERY_KEYS;