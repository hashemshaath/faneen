/**
 * SERVICE-ACTIVATION-GOVERNANCE-1 — Module: providerServices
 *
 * Canonical entry point for everything related to a provider's activated
 * services. All UI must read/mutate provider service status through this
 * module — never via direct Supabase calls to status fields on
 * `business_services`.
 */
export {
  resolveServiceEntitlement,
  resolveServiceEntitlements,
  normalizeTier,
} from './resolveServiceEntitlement';
export type {
  EffectiveServiceStatus,
  ProviderActivationStatus,
  AdminActivationStatus,
  MembershipGateStatus,
  ProviderServiceRowLike,
  ResolverInput,
  ResolvedServiceEntitlement,
} from './resolveServiceEntitlement';

export {
  setProviderServiceStatus,
  pauseProviderService,
  activateProviderService,
} from './services/mutations';
export type { SetProviderServiceStatusArgs } from './services/mutations';

export { effectiveStatusLabel, effectiveStatusBadgeClass } from './display';

/** SERVICE-ACTIVATION-GOVERNANCE-2 — Phase D admin surface. */
export {
  adminListServiceActivations,
  adminApproveProviderService,
  adminRejectProviderService,
  adminSuspendProviderService,
  adminRestoreProviderService,
  adminSetRequiredPlanTier,
  adminClearRequiredPlanTier,
  adminSetRequiresReview,
  adminSetPremiumService,
  adminSetFeaturedService,
  adminUpdateServiceActivationNote,
  type AdminServiceActivationRow,
  type AdminListFilters,
} from './services/admin';

/** SERVICE-ACTIVATION-GOVERNANCE-3 — Phase E notifications. */
export {
  notifyServiceActivationEvent,
  type ServiceActivationEvent,
  type ServiceActivationNotificationInput,
} from './services/notifications';