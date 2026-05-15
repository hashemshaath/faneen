/**
 * Provider commercial configuration for Qitaat.
 * During launch, contact reveal stays admin-approved and free.
 * Flip these flags later to require lead credits.
 */
export const PROVIDER_COMMERCIAL_CONFIG = {
  /** Master switch for the lead credits subsystem (UI hints, etc.). */
  leadCreditsEnabled: false,
  /** When true, contact reveal will check & consume provider credits. */
  requireCreditForContactReveal: false,
  /** When true, reveals during launch are logged as launch_free_reveal. */
  freeRevealDuringLaunch: true,
  /** Default credits consumed per contact reveal once enabled. */
  defaultLeadRevealCost: 1,
} as const;

export type ProviderCommercialConfig = typeof PROVIDER_COMMERCIAL_CONFIG;
