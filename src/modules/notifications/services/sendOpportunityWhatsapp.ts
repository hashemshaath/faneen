import { supabase } from "@/integrations/supabase/client";
import {
  buildOpportunityMessage,
  type OpportunityChannel,
  type OpportunityEventType,
  type OpportunityMessageContext,
  type OpportunityRecipientRole,
} from "../opportunityMessageCatalog";

export interface DispatchOpportunityMessageInput {
  event: OpportunityEventType;
  role: OpportunityRecipientRole;
  channel?: OpportunityChannel; // default whatsapp
  language: "ar" | "en";
  recipientPhone: string;
  recipientUserId?: string;
  opportunityId?: string;
  context: OpportunityMessageContext;
}

/**
 * Build the bilingual body from the catalog and dispatch it through the
 * `send-opportunity-whatsapp` edge function (which logs every attempt to
 * `opportunity_message_send_log`).
 */
export async function dispatchOpportunityMessage(input: DispatchOpportunityMessageInput) {
  const channel = input.channel ?? "whatsapp";
  const message = buildOpportunityMessage(input.event, input.role, channel, input.context);
  if (!message) return { ok: false, skipped: true, reason: "no_template" as const };
  const body = message[input.language];

  const { data, error } = await supabase.functions.invoke("send-opportunity-whatsapp", {
    body: {
      opportunity_id: input.opportunityId,
      opportunity_ref: input.context.ref,
      event_type: input.event,
      recipient_role: input.role,
      recipient_user_id: input.recipientUserId,
      recipient_phone: input.recipientPhone,
      language: input.language,
      body,
      channel,
    },
  });

  if (error) return { ok: false, error: error.message };
  return data as { ok: boolean; status?: string; provider_message_id?: string | null; error?: string | null };
}