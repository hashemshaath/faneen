import { supabase } from '@/integrations/supabase/client';
import type { AssetCategory, ServiceResult } from '../types';

export async function listCategories(): Promise<ServiceResult<AssetCategory[]>> {
  const { data, error } = await supabase
    .from('asset_categories' as never)
    .select('*')
    .order('sort_order', { ascending: true });
  return { data: (data as AssetCategory[] | null) ?? [], error: error as Error | null };
}