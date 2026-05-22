/**
 * R2A.1 — Contracts module type aliases.
 *
 * Re-exports the pure type surface that consumers of the contracts module
 * need. Generated Supabase row types are NOT duplicated here — import them
 * from '@/integrations/supabase/types' directly.
 */
export type {
  ContractStatus,
  ContractStatusMeta,
  SecondaryStatusMeta,
} from '@/lib/contract-statuses';
export type {
  WorkTypeKey,
  WorkTypeMeta,
} from '@/lib/contract-work-types';
export type {
  PricingMethod,
  PricingInput,
  PricingResult,
} from '@/lib/contract-pricing';
export type {
  VatBreakdown,
  VatHandling,
  LineItemLike,
  MeasurementLike,
  MilestoneLike,
  LineVatBreakdown,
  PaymentScheduleValidation,
  PaymentPreset,
  GeneratedPaymentRow,
  ContractCoverage,
  CoverageState,
  AmendmentFinancialPreview,
} from '@/lib/contract-financials';
export type {
  CompletenessStep,
  CompletenessStatus,
  CompletenessMissing,
  CompletenessInput,
  CompletenessResult,
} from '@/lib/contract-completeness';