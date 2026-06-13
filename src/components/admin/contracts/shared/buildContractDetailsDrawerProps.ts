/**
 * Pure adapter: maps an admin contract row into props for
 * `ContractDetailsDrawer`. No Supabase, no side effects, no mutations.
 */
import type { ContractDetailsDrawerProps } from './ContractDetailsDrawer';

export interface ContractRowForDrawer {
  id: string;
  contract_number: string;
  title_ar: string | null;
  title_en: string | null;
  status: string;
  total_amount: number | null;
  currency_code: string | null;
  provider_id: string;
  client_id: string | null;
  created_at: string;
  start_date: string | null;
  end_date: string | null;
}

export interface BuildContractDetailsDrawerPropsInput {
  contract: ContractRowForDrawer;
  isRTL: boolean;
  onClose: () => void;
}

export function buildContractDetailsDrawerProps({
  contract,
  isRTL,
  onClose,
}: BuildContractDetailsDrawerPropsInput): ContractDetailsDrawerProps {
  const title =
    (isRTL ? contract.title_ar : contract.title_en || contract.title_ar) ||
    contract.contract_number;
  return {
    contractId: contract.id,
    contractNumber: contract.contract_number,
    title,
    status: contract.status,
    providerId: contract.provider_id,
    clientId: contract.client_id,
    totalAmount: contract.total_amount,
    currencyCode: contract.currency_code,
    createdAt: contract.created_at,
    startDate: contract.start_date,
    endDate: contract.end_date,
    isRTL,
    onClose,
  };
}