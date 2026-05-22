import {
  sendTransactionalEmail,
  type SendTransactionalEmailPayload,
} from '@/modules/notifications/services/sendTransactionalEmail';

export type SendLeadTransactionalEmailPayload = SendTransactionalEmailPayload;

/**
 * Lead-specific transactional email entry point.
 *
 * Delegates to the shared `sendTransactionalEmail` wrapper without
 * altering payload, return shape, or error behavior. Maintained as a
 * named export so existing lead callsites (e.g. AdminLeadRequests) and
 * regression tests keep working unchanged.
 */
export async function sendLeadTransactionalEmail(
  payload: SendLeadTransactionalEmailPayload,
): ReturnType<typeof sendTransactionalEmail> {
  return sendTransactionalEmail(payload);
}
