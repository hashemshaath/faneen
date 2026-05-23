// Module: memberships
// Public API — read wrappers added in MEMB-2.
export { listActiveMembershipPlans } from './services/plans/reads';
export type { ListActiveMembershipPlansOptions } from './services/plans/reads';
export { getCurrentMembershipSubscription } from './services/subscriptions/reads';
export type { GetCurrentMembershipSubscriptionOptions } from './services/subscriptions/reads';
export { hasMembershipFeature, getMembershipUsage } from './services/usage/reads';
export type {
  HasMembershipFeatureArgs,
  GetMembershipUsageArgs,
} from './services/usage/reads';
export {
  subscribeToPlan,
  cancelSubscriptionAtPeriodEnd,
  resumeSubscriptionRenewal,
  cancelSubscription,
  adminUpgradeSubscription,
} from './services/subscriptions/mutations';
export type {
  SubscribeToPlanArgs,
  CancelSubscriptionAtPeriodEndArgs,
  ResumeSubscriptionRenewalArgs,
  CancelSubscriptionArgs,
  AdminUpgradeSubscriptionArgs,
} from './services/subscriptions/mutations';

// R4E-2C-4-PHASE-3: admin membership tier override (membership-owned).
export { setBusinessMembershipTier } from './services/subscriptions/setBusinessMembershipTier';
export type {
  MembershipTier,
  AdminSetBusinessMembershipTierResult,
} from './services/subscriptions/setBusinessMembershipTier';

// MEMB-4: upgrade requests
export {
  listMembershipUpgradeRequests,
  findPendingMembershipUpgradeRequest,
  listMyPendingMembershipUpgradeRequests,
} from './services/upgradeRequests/reads';
export type {
  ListMembershipUpgradeRequestsOptions,
  FindPendingMembershipUpgradeRequestOptions,
  ListMyPendingMembershipUpgradeRequestsOptions,
} from './services/upgradeRequests/reads';
export {
  insertMembershipUpgradeRequest,
  updateMembershipUpgradeRequestById,
} from './services/upgradeRequests/mutations';
export type {
  MembershipUpgradeRequestInsert,
  MembershipUpgradeRequestUpdate,
} from './services/upgradeRequests/mutations';

// MEMB-4: rejections
export { queryMembershipUpgradeRejections } from './services/rejections/reads';
export type { QueryMembershipUpgradeRejectionsOptions } from './services/rejections/reads';

// MEMB-4: subscription events
export { listRecentMembershipSubscriptionEvents } from './services/events/reads';
export type { ListRecentMembershipSubscriptionEventsOptions } from './services/events/reads';

// MEMB-5: invite keys
export {
  listMembershipInviteKeys,
  listMembershipInviteRedemptions,
} from './services/inviteKeys/reads';
export type {
  ListMembershipInviteKeysOptions,
  ListMembershipInviteRedemptionsOptions,
} from './services/inviteKeys/reads';
export {
  generateInviteKey,
  revokeInviteKey,
} from './services/inviteKeys/mutations';
export type {
  GenerateInviteKeyArgs,
  RevokeInviteKeyArgs,
} from './services/inviteKeys/mutations';

// MEMB-5: access keys
export {
  listMembershipAccessKeys,
  listAccessKeyUsageLog,
} from './services/accessKeys/reads';
export type {
  ListMembershipAccessKeysOptions,
  ListAccessKeyUsageLogOptions,
} from './services/accessKeys/reads';
export {
  createAccessKey,
  revokeAccessKey,
} from './services/accessKeys/mutations';
export type {
  CreateAccessKeyArgs,
  RevokeAccessKeyArgs,
} from './services/accessKeys/mutations';

// MEMB-6: promo codes
export {
  listMembershipPromoCodes,
  listMembershipPromoCodeAttempts,
} from './services/promoCodes/reads';
export type {
  ListMembershipPromoCodesOptions,
  ListMembershipPromoCodeAttemptsOptions,
} from './services/promoCodes/reads';
export { redeemPromoCode } from './services/promoCodes/mutations';
export type { RedeemPromoCodeArgs } from './services/promoCodes/mutations';

// MEMB-7: admin plan/subscription reads + provider legacy
export {
  listAdminMembershipPlans,
} from './services/plans/reads';
export type { ListAdminMembershipPlansOptions } from './services/plans/reads';
export {
  insertMembershipPlan,
  updateMembershipPlanById,
} from './services/plans/mutations';
export type {
  MembershipPlanInsert,
  MembershipPlanUpdate,
} from './services/plans/mutations';
export {
  listAdminMembershipSubscriptions,
  countActiveMembershipSubscriptions,
  adminListMembershipUsage,
} from './services/subscriptions/reads';
export type {
  ListAdminMembershipSubscriptionsOptions,
  AdminListMembershipUsageArgs,
} from './services/subscriptions/reads';
export {
  listProviderPlans,
  listProviderSubscriptions,
  listProviderSubscriptionsForCurrentUser,
  getProviderSubscriptionForBusiness,
} from './services/providerSubscriptions/reads';
export type {
  ListProviderPlansOptions,
  ListProviderSubscriptionsOptions,
  ListProviderSubscriptionsForUserOptions,
  GetProviderSubscriptionForBusinessOptions,
} from './services/providerSubscriptions/reads';
export {
  updateProviderSubscriptionById,
  adminAdjustProviderCredits,
} from './services/providerSubscriptions/mutations';
export type {
  ProviderSubscriptionUpdate,
  AdminAdjustProviderCreditsArgs,
} from './services/providerSubscriptions/mutations';
