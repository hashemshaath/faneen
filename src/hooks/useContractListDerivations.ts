/**
 * useContractListDerivations — extracted from DashboardContracts.tsx.
 *
 * Pure derivations for the contracts list page:
 *   - aggregate `stats` (totals, counts, paid/overdue amounts)
 *   - `filtered` list (role + status + search + sort)
 *
 * Behaviour is byte-identical to the inline `useMemo`s previously in
 * DashboardContracts.tsx — no data fetching, no mutations, no side
 * effects. Same inputs → same outputs.
 */
import { useMemo } from 'react';
import { getContractHealth } from '@/components/contracts/dashboard/contract-helpers';
import type { Database } from '@/integrations/supabase/types';

type ContractRow = Database['public']['Tables']['contracts']['Row'];
type MilestoneRow = Database['public']['Tables']['contract_milestones']['Row'];
type PaymentRow = Database['public']['Tables']['installment_payments']['Row'];

type ContractLike = ContractRow;
type PaymentLike = PaymentRow & { contract_id: string | undefined };
type MilestoneLike = MilestoneRow;
interface AttachmentLike { contract_id: string }
interface MaintenanceLike { contract_id: string }
interface MeasurementLike { contract_id: string }

interface ProfileLike {
  user_id: string;
  full_name?: string | null;
}

type RoleFilter = 'all' | 'provider' | 'client';
type SortBy = 'recent' | 'amount' | 'status' | 'health' | string;

export interface UseContractListDerivationsArgs<C extends ContractLike> {
  contracts: C[];
  providerContracts: C[];
  clientContracts: C[];
  allPayments: PaymentLike[];
  allMilestones: MilestoneLike[];
  allAttachments: AttachmentLike[];
  allMaintenanceRequests: MaintenanceLike[];
  allMeasurements: MeasurementLike[];
  profiles: ProfileLike[];
  roleFilter: RoleFilter;
  statusFilter: string;
  searchQuery: string;
  sortBy: SortBy;
}

export function useContractListDerivations<C extends ContractLike = ContractRow>(
  args: UseContractListDerivationsArgs<C>,
) {
  const {
    contracts, providerContracts, clientContracts,
    allPayments, allMilestones, allAttachments,
    allMaintenanceRequests, allMeasurements,
    profiles, roleFilter, statusFilter, searchQuery, sortBy,
  } = args;

  const stats = useMemo(() => {
    const src = roleFilter === 'provider' ? providerContracts : roleFilter === 'client' ? clientContracts : contracts;
    const totalAmount = src.reduce((s: number, c) => s + Number(c.total_amount), 0);
    const totalPaid = allPayments.filter((p) => p.status === 'paid' && src.some((c) => c.id === p.contract_id)).reduce((s: number, p) => s + Number(p.amount), 0);
    const overduePayments = allPayments.filter((p) => p.status === 'overdue' && src.some((c) => c.id === p.contract_id));
    return {
      total: src.length,
      active: src.filter((c) => c.status === 'active').length,
      completed: src.filter((c) => c.status === 'completed').length,
      pendingApproval: src.filter((c) => c.status === 'pending_approval').length,
      draft: src.filter((c) => c.status === 'draft').length,
      cancelled: src.filter((c) => c.status === 'cancelled').length,
      totalAmount, totalPaid,
      overdueCount: overduePayments.length,
      overdueAmount: overduePayments.reduce((s: number, p) => s + Number(p.amount), 0),
      asProvider: providerContracts.length,
      asClient: clientContracts.length,
      totalMilestones: allMilestones.length,
      completedMilestones: allMilestones.filter((m) => m.status === 'completed').length,
      totalAttachments: allAttachments.length,
      totalMaintenance: allMaintenanceRequests.length,
      totalMeasurements: allMeasurements.length,
    };
  }, [contracts, providerContracts, clientContracts, allPayments, allMilestones, allAttachments, allMaintenanceRequests, allMeasurements, roleFilter]);

  const filtered = useMemo(() => {
    let items: Array<C & { _role: string }> =
      roleFilter === 'provider' ? providerContracts.map((c) => ({ ...c, _role: 'provider' })) :
      roleFilter === 'client' ? clientContracts.map((c) => ({ ...c, _role: 'client' })) :
      (contracts as Array<C & { _role: string }>);

    if (statusFilter !== 'all') items = items.filter((c) => c.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((c) =>
        c.title_ar?.toLowerCase().includes(q) || c.title_en?.toLowerCase().includes(q) ||
        c.contract_number?.toLowerCase().includes(q) ||
        profiles.some((p) => (p.full_name?.toLowerCase().includes(q)) && (p.user_id === c.client_id || p.user_id === c.provider_id))
      );
    }

    if (sortBy === 'amount') items = [...items].sort((a, b) => Number(b.total_amount) - Number(a.total_amount));
    else if (sortBy === 'status') items = [...items].sort((a, b) => a.status.localeCompare(b.status));
    else if (sortBy === 'health') {
      items = [...items].sort((a, b) => {
        const hA = getContractHealth(a, allMilestones.filter((m) => m.contract_id === a.id), allPayments.filter((p) => p.contract_id === a.id));
        const hB = getContractHealth(b, allMilestones.filter((m) => m.contract_id === b.id), allPayments.filter((p) => p.contract_id === b.id));
        return hB - hA;
      });
    } else items = [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return items;
  }, [contracts, providerContracts, clientContracts, statusFilter, searchQuery, roleFilter, profiles, sortBy, allMilestones, allPayments]);

  return { stats, filtered };
}