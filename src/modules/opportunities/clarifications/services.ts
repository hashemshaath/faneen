/**
 * R4 — RFQ clarifications (Q&A) services. RLS-gated; no bypass.
 */
import { supabase } from '@/integrations/supabase/client';
import { createNotification } from '@/modules/notifications';
import type {
  ClarificationAuthorRole,
  RfqClarificationAttachment,
  RfqClarificationRow,
} from './types';

/**
 * List clarifications on an RFQ. Pass `bidId=null` to list only the
 * general thread (no bid) and a UUID to list a specific bid thread.
 * Omit `bidId` entirely to list every clarification visible to the
 * viewer (RLS filters per role automatically).
 */
export async function listClarifications(
  opportunityId: string,
  bidId?: string | null,
): Promise<RfqClarificationRow[]> {
  let q = supabase
    .from('rfq_clarifications')
    .select('*')
    .eq('quote_request_id', opportunityId)
    .order('created_at', { ascending: true });
  if (bidId === null) q = q.is('bid_id', null);
  else if (bidId) q = q.eq('bid_id', bidId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as RfqClarificationRow[];
}

async function logEvent(
  quoteRequestId: string,
  type: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from('quote_request_events').insert({
      quote_request_id: quoteRequestId,
      event_type: type,
      actor_user_id: auth?.user?.id ?? null,
      metadata: metadata as unknown as never,
    });
  } catch {
    /* best-effort */
  }
}

export interface PostClarificationInput {
  opportunityId: string;
  bidId?: string | null;
  authorRole: ClarificationAuthorRole;
  authorUserId: string;
  body: string;
  attachments?: RfqClarificationAttachment[];
  /**
   * Optional recipient id for the counter-party in-app notification.
   * Client posting → provider user id, provider posting → RFQ owner id.
   */
  notifyUserId?: string | null;
}

/** Insert a clarification message; RLS enforces role/scope. */
export async function postClarification(
  input: PostClarificationInput,
): Promise<RfqClarificationRow> {
  const body = input.body.trim();
  if (!body) throw new Error('نص الرسالة مطلوب');
  if (body.length > 4000) throw new Error('الحد الأقصى 4000 حرف');

  const { data, error } = await supabase
    .from('rfq_clarifications')
    .insert({
      quote_request_id: input.opportunityId,
      bid_id: input.bidId ?? null,
      author_user_id: input.authorUserId,
      author_role: input.authorRole,
      body,
      attachments: (input.attachments ?? []) as unknown as never,
    })
    .select('*')
    .single();
  if (error) throw error;

  await logEvent(input.opportunityId, 'clarification.posted', {
    bid_id: input.bidId ?? null,
    clarification_id: data.id,
    author_role: input.authorRole,
  });

  if (input.notifyUserId) {
    try {
      const isClient = input.authorRole === 'client';
      await createNotification({
        user_id: input.notifyUserId,
        notification_type: 'rfq_clarification_posted',
        title_ar: isClient
          ? 'استفسار جديد من العميل'
          : 'رد جديد من المورّد',
        title_en: isClient
          ? 'New clarification from the client'
          : 'New reply from the provider',
        body_ar: body.slice(0, 160),
        body_en: body.slice(0, 160),
        reference_id: input.opportunityId,
        reference_type: 'opportunity',
      });
    } catch {
      /* best-effort */
    }
  }

  return data as RfqClarificationRow;
}
