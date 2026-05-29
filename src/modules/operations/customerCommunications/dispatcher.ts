/**
 * BUSINESS-OPERATIONS-INTELLIGENCE-1 — Customer-project notification dispatcher.
 *
 * Responsibilities:
 *   - Validate event type against the allow-list.
 *   - Insert one row into `customer_project_notifications` (idempotent by key).
 *   - When `customerEmail` is safe and a template is mapped, route the send
 *     through the shared `sendTransactionalEmail` wrapper.
 *   - Never throw into the caller's business flow — failures degrade to a
 *     safe envelope.
 *
 * What this module deliberately does NOT do:
 *   - No text-message or chat-app channels.
 *   - No external notification provider.
 *   - No broadcast / presence / DB-changes subscriptions.
 *   - No direct table access outside the single insert documented above.
 *   - No raw tokens, supplier pricing, or internal notes in payloads.
 */
import { supabase } from '@/integrations/supabase/client';
import { sendTransactionalEmail } from '@/modules/notifications/services/sendTransactionalEmail';
import {
  isCustomerProjectEventType,
  isWiredCustomerProjectEventType,
  type CustomerProjectEventType,
} from './eventTypes';
import { getCustomerEventCopy } from './copy';
import { isDeliverableCustomerEmail, isSafeCustomerActionUrl } from './safety';

export interface DispatchCustomerProjectNotificationArgs {
  eventType: CustomerProjectEventType | string;
  businessId: string;
  workOrderId?: string | null;
  quotationId?: string | null;
  contractId?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  actionUrl?: string | null;
  idempotencyKey: string;
}

export type DispatchOutcome =
  | 'sent'
  | 'queued_internal'
  | 'skipped_event_not_wired'
  | 'skipped_invalid_event'
  | 'skipped_unsafe_email'
  | 'skipped_unsafe_action_url'
  | 'skipped_missing_idempotency'
  | 'failed';

export interface DispatchEnvelope {
  ok: boolean;
  outcome: DispatchOutcome;
  notificationId?: string;
  error?: string;
}

export async function dispatchCustomerProjectNotification(
  args: DispatchCustomerProjectNotificationArgs,
): Promise<DispatchEnvelope> {
  try {
    if (!args.idempotencyKey) {
      return { ok: false, outcome: 'skipped_missing_idempotency' };
    }
    if (!isCustomerProjectEventType(args.eventType)) {
      return { ok: false, outcome: 'skipped_invalid_event' };
    }
    if (!isWiredCustomerProjectEventType(args.eventType)) {
      return { ok: false, outcome: 'skipped_event_not_wired' };
    }
    if (!isSafeCustomerActionUrl(args.actionUrl)) {
      return { ok: false, outcome: 'skipped_unsafe_action_url' };
    }

    const copy = getCustomerEventCopy(args.eventType);
    const canEmail =
      !!args.customerEmail && isDeliverableCustomerEmail(args.customerEmail);
    const channel: 'email' | 'internal' = canEmail ? 'email' : 'internal';

    const row = {
      business_id: args.businessId,
      work_order_id: args.workOrderId ?? null,
      quotation_id: args.quotationId ?? null,
      contract_id: args.contractId ?? null,
      customer_email: args.customerEmail ?? null,
      customer_phone: args.customerPhone ?? null,
      channel,
      event_type: args.eventType,
      title_ar: copy.titleAr,
      title_en: copy.titleEn,
      body_ar: copy.bodyAr,
      body_en: copy.bodyEn,
      action_url: args.actionUrl ?? null,
      idempotency_key: args.idempotencyKey,
      status: 'pending' as const,
    };

    const { data, error } = await supabase
      .from('customer_project_notifications')
      .insert(row)
      .select('id')
      .maybeSingle();

    if (error) {
      // Idempotency conflicts are not failures — treat as "already dispatched".
      const msg = (error as { message?: string }).message ?? '';
      if (msg.toLowerCase().includes('duplicate')) {
        return { ok: true, outcome: canEmail ? 'sent' : 'queued_internal' };
      }
      return { ok: false, outcome: 'failed', error: msg };
    }

    if (!canEmail || !copy.emailTemplate) {
      return {
        ok: true,
        outcome: 'queued_internal',
        notificationId: data?.id,
      };
    }

    const res = await sendTransactionalEmail({
      templateName: copy.emailTemplate,
      recipientEmail: args.customerEmail as string,
      idempotencyKey: args.idempotencyKey,
      templateData: {
        actionUrl: args.actionUrl ?? undefined,
      },
    });
    const emailErr = (res as { error?: { message?: string } } | null)?.error;
    if (emailErr) {
      return {
        ok: false,
        outcome: 'failed',
        notificationId: data?.id,
        error: emailErr.message ?? 'email_failed',
      };
    }
    return { ok: true, outcome: 'sent', notificationId: data?.id };
  } catch (err: unknown) {
    return {
      ok: false,
      outcome: 'failed',
      error: err instanceof Error ? err.message : 'unknown_error',
    };
  }
}