/**
 * User roles service (compatibility shim — ID-3).
 *
 * Role READS and MUTATIONS are now canonical in
 * `src/modules/identity/services/roles/` and re-exported here for
 * backward compatibility. New code should import directly from
 * `@/modules/identity`.
 */
export type { AppRole, UserRoleRow } from '@/modules/identity';
export {
  getUserRoles,
  hasRole,
  hasAdminAccess,
  hasSuperAdminAccess,
  listAllUserRoles,
  listUserRolesFor,
  countByRole,
  grantRole,
  revokeRoleById,
  revokeRoleByUserAndRole,
} from '@/modules/identity';
