/**
 * User roles service.
 *
 * Status: Scaffold only (R0). No callsite changes.
 * In R1, this module will expose typed `hasRole`, `grantRole`, `revokeRole`
 * helpers that wrap the `has_role` SQL function and the `user_roles` table,
 * so that pages/components stop reading `user_roles` directly.
 *
 * SECURITY: roles must never be derived from client state. All checks must
 * go through the `has_role` security-definer function or RLS-gated queries.
 */
export {};
