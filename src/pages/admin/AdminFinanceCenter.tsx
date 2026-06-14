/**
 * ADMIN UX RECONSOLIDATION PHASE 2 — Finance Center shell.
 *
 * Currently re-exports the existing Memberships & Payments hub so the
 * new canonical /admin/finance URL resolves without moving any logic.
 * Future phases may extend with additional finance tabs.
 */
export { default } from './AdminMembershipsHub';
