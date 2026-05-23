import { supabase } from '@/integrations/supabase/client';

/**
 * M-3 mutation wrapper for creating a conversation row.
 *
 * Preserves the BusinessProfile.contactMutation behavior:
 *   supabase.from('conversations').insert(payload).select('id').single()
 *
 * Payload is passed through untransformed. Returns the raw Supabase result
 * (single row). Errors are surfaced via the returned `error` field — this
 * helper does not throw on its own.
 */
export type CreateConversationPayload = {
  participant_1: string;
  participant_2: string;
};

export function createConversation(payload: CreateConversationPayload) {
  return supabase
    .from('conversations')
    .insert(payload)
    .select('id')
    .single();
}