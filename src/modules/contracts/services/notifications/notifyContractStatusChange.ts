/**
 * CONTRACT STATUS NOTIFICATIONS — PHASE 1
 *
 * Central helper that emits in-app notifications to the parties of a
 * contract when its status changes or a notable action is taken on it.
 *
 * Constraints:
 * - Uses the existing `notifications` table via `createNotification`.
 * - Never notifies the actor (the user who performed the action).
 * - Only notifies users that are actually linked to the contract
 *   (`provider_id` = الطرف الأول, `client_id` = الطرف الثاني).
 * - Does not change the contract lifecycle, does not write status, does
 *   not call any RPC. It only reads the auth user and inserts rows in
 *   `notifications`.
 * - No service_role, no edge-function, no email SDK — strictly in-app
 *   (email delivery is deferred — see PHASE 1 REPORT).
 */
import {
  createNotification,
  type CreateNotificationPayload,
} from '@/modules/notifications/services/createNotification';
import { getCurrentUser } from '@/modules/identity/services/session/getCurrentUser';

export type ContractNotificationEvent =
  | 'draft_created'
  | 'sent_for_review'
  | 'updated'
  | 'approved_first_party'
  | 'approved_second_party'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export interface ContractPartiesRef {
  id: string;
  title_ar?: string | null;
  title_en?: string | null;
  provider_id?: string | null;
  client_id?: string | null;
  status?: string | null;
}

interface EventCopy {
  title_ar: string;
  title_en: string;
  body_ar?: string;
  body_en?: string;
}

const PARTY_FIRST_AR = 'الطرف الأول';
const PARTY_SECOND_AR = 'الطرف الثاني';

function buildCopy(
  event: ContractNotificationEvent,
  contract: ContractPartiesRef,
): EventCopy {
  const ref = contract.title_ar || contract.title_en || contract.id;
  switch (event) {
    case 'draft_created':
      return {
        title_ar: `تم إنشاء العقد كمسودة: ${ref}`,
        title_en: `Contract draft created: ${ref}`,
      };
    case 'sent_for_review':
      return {
        title_ar: `تم إرسال العقد للمراجعة — بانتظار موافقة ${PARTY_SECOND_AR}: ${ref}`,
        title_en: `Contract sent for review — pending second party approval: ${ref}`,
      };
    case 'updated':
      return {
        title_ar: `تم تحديث بيانات العقد: ${ref}`,
        title_en: `Contract details updated: ${ref}`,
      };
    case 'approved_first_party':
      return {
        title_ar: `وافق ${PARTY_FIRST_AR} على العقد: ${ref}`,
        title_en: `First party approved the contract: ${ref}`,
      };
    case 'approved_second_party':
      return {
        title_ar: `وافق ${PARTY_SECOND_AR} على العقد: ${ref}`,
        title_en: `Second party approved the contract: ${ref}`,
      };
    case 'rejected':
      return {
        title_ar: `تم رفض العقد أو طُلب تعديله: ${ref}`,
        title_en: `Contract rejected or change requested: ${ref}`,
      };
    case 'cancelled':
      return {
        title_ar: `تم إلغاء العقد: ${ref}`,
        title_en: `Contract cancelled: ${ref}`,
      };
    case 'completed':
      return {
        title_ar: `تم اكتمال العقد: ${ref}`,
        title_en: `Contract completed: ${ref}`,
      };
  }
}

export interface NotifyContractStatusChangeArgs {
  contract: ContractPartiesRef;
  event: ContractNotificationEvent;
  /** Optional override; defaults to the current auth user. */
  actorUserId?: string | null;
}

/**
 * Resolve recipients for a contract event.
 * Exported for tests — pure function, no I/O.
 */
export function resolveContractNotificationRecipients(
  contract: ContractPartiesRef,
  actorUserId: string | null | undefined,
): string[] {
  const candidates = [contract.provider_id, contract.client_id].filter(
    (v): v is string => typeof v === 'string' && v.length > 0,
  );
  const unique = Array.from(new Set(candidates));
  return actorUserId ? unique.filter((id) => id !== actorUserId) : unique;
}

export async function notifyContractStatusChange(
  args: NotifyContractStatusChangeArgs,
): Promise<{ recipients: string[]; errors: unknown[] }> {
  let actorUserId = args.actorUserId ?? null;
  if (!actorUserId) {
    try {
      const { data } = await getCurrentUser();
      actorUserId = data.user?.id ?? null;
    } catch {
      actorUserId = null;
    }
  }

  const recipients = resolveContractNotificationRecipients(
    args.contract,
    actorUserId,
  );
  if (recipients.length === 0) return { recipients: [], errors: [] };

  const copy = buildCopy(args.event, args.contract);
  const errors: unknown[] = [];

  await Promise.all(
    recipients.map(async (userId) => {
      const payload: CreateNotificationPayload = {
        user_id: userId,
        title_ar: copy.title_ar,
        title_en: copy.title_en,
        body_ar: copy.body_ar,
        body_en: copy.body_en,
        notification_type: 'contract',
        reference_type: 'contract',
        reference_id: args.contract.id,
        action_url: `/contracts/${args.contract.id}`,
      };
      try {
        const res = await createNotification(payload);
        const err = (res as { error?: unknown } | null | undefined)?.error;
        if (err) errors.push(err);
      } catch (err) {
        errors.push(err);
      }
    }),
  );

  return { recipients, errors };
}