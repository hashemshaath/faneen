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
export { listAdminWorkOrders } from './services/operations/listAdminWorkOrders';
export type { ListAdminWorkOrdersOptions } from './services/operations/listAdminWorkOrders';
export { getAdminOperationsSummary } from './services/operations/getAdminOperationsSummary';
export type { AdminOperationsSummary } from './services/operations/getAdminOperationsSummary';
