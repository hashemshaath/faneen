/**
 * useContractAggregates — extracted from DashboardContracts.tsx
 *
 * Bundles the 9 child-table aggregate queries (milestones, notes,
 * attachments, payments, measurements, warranties, maintenance,
 * amendments, line items) for a list of contract IDs into a single hook.
 * Each underlying query keeps its original key/shape so cache hits and
 * invalidations elsewhere keep working unchanged.
 */
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  listMilestonesForContracts,
  listNotesForContracts,
  listAttachmentsForContracts,
  listInstallmentPaymentsForContracts,
  listMeasurementsForContracts,
  listWarrantiesForContracts,
  listMaintenanceRequestsForContracts,
  listAmendmentsForContracts,
  listLineItemsForContracts,
} from '@/modules/contracts/services/aggregates';

export function useContractAggregates(contractIds: string[]) {
  const enabled = contractIds.length > 0;

  const { data: allMilestones = [] } = useQuery({
    queryKey: ['dashboard-milestones', contractIds],
    queryFn: () => listMilestonesForContracts(contractIds),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const { data: allNotes = [] } = useQuery({
    queryKey: ['dashboard-contract-notes', contractIds],
    queryFn: () => listNotesForContracts(contractIds),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const { data: allAttachments = [] } = useQuery({
    queryKey: ['dashboard-contract-attachments', contractIds],
    queryFn: () => listAttachmentsForContracts(contractIds),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const { data: allPayments = [] } = useQuery({
    queryKey: ['dashboard-contract-payments', contractIds],
    queryFn: () => listInstallmentPaymentsForContracts(contractIds),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const { data: allMeasurements = [] } = useQuery({
    queryKey: ['dashboard-contract-measurements', contractIds],
    queryFn: () => listMeasurementsForContracts(contractIds),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const { data: allWarranties = [] } = useQuery({
    queryKey: ['dashboard-contract-warranties', contractIds],
    queryFn: () => listWarrantiesForContracts(contractIds),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const { data: allMaintenanceRequests = [] } = useQuery({
    queryKey: ['dashboard-contract-maintenance', contractIds],
    queryFn: () => listMaintenanceRequestsForContracts(contractIds),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const { data: allAmendments = [] } = useQuery({
    queryKey: ['dashboard-contract-amendments', contractIds],
    queryFn: () => listAmendmentsForContracts(contractIds),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const { data: allLineItems = [] } = useQuery({
    queryKey: ['dashboard-contract-line-items', contractIds],
    queryFn: () => listLineItemsForContracts(contractIds),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  return {
    allMilestones,
    allNotes,
    allAttachments,
    allPayments,
    allMeasurements,
    allWarranties,
    allMaintenanceRequests,
    allAmendments,
    allLineItems,
  };
}