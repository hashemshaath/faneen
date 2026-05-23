import { supabase } from '@/integrations/supabase/client';

/**
 * Find an existing direct conversation between two users (either ordering of
 * participant_1 / participant_2). Used by BusinessProfile.contactMutation
 * before insertion. Preserves `.select("id").or(and(...),and(...)).maybeSingle()`.
 */
export function findConversationBetweenUsers({
  userIdA,
  userIdB,
}: {
  userIdA: string;
  userIdB: string;
}) {
  return supabase
    .from('conversations')
    .select('id')
    .or(
      `and(participant_1.eq.${userIdA},participant_2.eq.${userIdB}),and(participant_1.eq.${userIdB},participant_2.eq.${userIdA})`,
    )
    .maybeSingle();
}