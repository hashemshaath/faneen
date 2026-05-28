// Module: admin
// Public API — admin tooling service wrappers.
export { abEvaluate } from './services/experiments/abEvaluate';
// EF-6: thin email-center wrappers.
export { adminPreviewEmail } from './services/email/adminPreviewEmail';
export { adminRetryDlqEmail } from './services/email/adminRetryDlqEmail';
export { adminCreateUser } from './services/users/adminCreateUser';
export type {
  AdminCreateUserPayload,
  AdminCreateUserAccountType,
  AdminCreateUserRole,
} from './services/users/adminCreateUser';
export { listUserEntityLinks } from './services/users/listUserEntityLinks';
export type {
  UserEntityLink,
  UserEntityRole,
} from './services/users/listUserEntityLinks';

// BUSINESS-ADMIN-1: Admin Operations Console wrappers.
export { listAdminOperationalActivity } from './services/operations/listAdminOperationalActivity';
export type {
  AdminOperationalSourceType,
  ListAdminOperationalActivityOptions,
} from './services/operations/listAdminOperationalActivity';
export { listAdminWorkOrders } from '@/modules/workOrders';
export type { ListAdminWorkOrdersOptions } from '@/modules/workOrders';
export { getAdminOperationsSummary } from './services/operations/getAdminOperationsSummary';
export type { AdminOperationsSummary } from './services/operations/getAdminOperationsSummary';

// BUSINESS-ADMIN-3: Admin Reference Inspector resolver.
export {
  getAdminReferenceSummary,
  isOfficialAdminRef,
  ADMIN_REF_OFFICIAL,
} from './services/operations/getAdminReferenceSummary';
export type {
  AdminRefEntityType,
  AdminReferenceSummary,
  AdminReferenceInspectorBundle,
} from './services/operations/getAdminReferenceSummary';

// BUSINESS-ADMIN-2: Admin Operational Notes wrappers (append-only, internal).
export { listAdminOperationalNotes } from './services/notes/listAdminOperationalNotes';
export type {
  AdminOperationalNoteRow,
  ListAdminOperationalNotesOptions,
} from './services/notes/listAdminOperationalNotes';
export { createAdminOperationalNote } from './services/notes/createAdminOperationalNote';
export type { CreateAdminOperationalNoteInput } from './services/notes/createAdminOperationalNote';
export { resolveAdminOperationalNote } from './services/notes/resolveAdminOperationalNote';
export { getAdminOperationalNotesSummary } from './services/notes/getAdminOperationalNotesSummary';
export type { AdminOperationalNotesSummary } from './services/notes/getAdminOperationalNotesSummary';
export {
  isOfficialRef as isOfficialAdminNoteRef,
  sanitizeAdminNoteMetadata,
  assertSafeNoteText,
  type AdminNoteSeverity,
  type AdminNoteStatus,
  type AdminNoteEntityType,
} from './services/notes/sanitizeAdminNote';
