/**
 * CRITICAL-ENTITY-IDENTITY-ACCESS-FIX-1 — Phase 3 + 4
 * Admin-only read-only identity & workspace diagnostics.
 *
 * All wrappers below are READ-ONLY. They do not mutate auth.users,
 * profiles, businesses, business_staff, or user_roles. They surface
 * masked / aggregate data sufficient for support triage.
 */
export * from './getAdminIdentityIntegrityReport';
export * from './getAdminCompanyAccessDiagnostic';
export * from './getAdminUserAccessSummary';