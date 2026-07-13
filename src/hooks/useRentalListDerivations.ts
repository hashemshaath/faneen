/**
 * DASHBOARD RENTALS PAGE EXTRACTION — pure derivations hook.
 *
 * Extracts inline `useMemo` blocks from `DashboardRentals.tsx` for
 * order stats (active/expiring/overdue) and provider items search +
 * status filtering. Pure logic only — no DB, no RPC, no mutations.
 */
import { useMemo } from 'react';
import type { RentalItem, RentalOrder } from '@/modules/rentals';

export interface RentalOrderStats {
  active: RentalOrder[];
  expiring: RentalOrder[];
  overdue: RentalOrder[];
  /** T1 — customer requests awaiting provider accept/decline. */
  pending: RentalOrder[];
}

export interface UseRentalListDerivationsInput {
  items: RentalItem[];
  orders: RentalOrder[];
  listQuery: string;
  listStatus: 'all' | RentalItem['status'];
}

export interface UseRentalListDerivationsResult {
  stats: RentalOrderStats;
  filteredItems: RentalItem[];
}

export function useRentalListDerivations(
  input: UseRentalListDerivationsInput,
): UseRentalListDerivationsResult {
  const { items, orders, listQuery, listStatus } = input;

  const stats = useMemo<RentalOrderStats>(() => ({
    active: orders.filter(o => o.status === 'active'),
    expiring: orders.filter(o => o.status === 'expiring_soon'),
    overdue: orders.filter(o => o.status === 'expired'),
    pending: orders.filter(o => o.status === 'pending_provider_review'),
  }), [orders]);

  const filteredItems = useMemo<RentalItem[]>(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q && listStatus === 'all') return items;
    return items.filter(it => {
      if (listStatus !== 'all' && it.status !== listStatus) return false;
      if (!q) return true;
      return (
        it.name_ar?.toLowerCase().includes(q) ||
        (it.name_en ?? '').toLowerCase().includes(q) ||
        (it.brand ?? '').toLowerCase().includes(q) ||
        it.ref_id?.toLowerCase().includes(q)
      );
    });
  }, [items, listQuery, listStatus]);

  return { stats, filteredItems };
}

export default useRentalListDerivations;