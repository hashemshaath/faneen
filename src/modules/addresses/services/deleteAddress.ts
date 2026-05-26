import { supabase } from '@/integrations/supabase/client';

export async function deleteAddress(id: string): Promise<{ error: unknown }> {
  const { error } = await supabase.from('addresses').delete().eq('id', id);
  return { error };
}