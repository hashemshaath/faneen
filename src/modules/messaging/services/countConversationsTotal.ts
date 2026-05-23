import { supabase } from '@/integrations/supabase/client';

/**
 * Count all conversations (admin KPI).
 * Preserves: `.from('conversations').select('id', { count: 'exact', head: true })`.
 */
export function countConversationsTotal() {
  return supabase.from('conversations').select('id', { count: 'exact', head: true });
}