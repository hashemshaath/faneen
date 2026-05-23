import { supabase } from '@/integrations/supabase/client';

/**
 * M-3 mutation wrapper for inserting a message row.
 *
 * Used by:
 *  - BusinessProfile.contactMutation greeting message (no select)
 *  - DashboardMessages.sendMutation user-typed send (no select, attachment_url optional)
 *
 * Payload is passed through untransformed. Returns the raw Supabase result.
 * No `.select()` / `.single()` is applied because neither current callsite
 * relies on the inserted row being returned.
 */
export type InsertMessagePayload = {
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  attachment_url?: string | null;
};

export function insertMessage(payload: InsertMessagePayload) {
  return supabase.from('messages').insert(payload);
}