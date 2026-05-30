import { supabase } from '@/integrations/supabase/client';

export type LoyaltyLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface LoyaltyEntry {
  id: string;
  user_id: string;
  points: number;
  reason: string;
  reference_id: string | null;
  created_at: string;
}

export interface LoyaltySummary {
  total_points: number;
  level: LoyaltyLevel;
}

export async function getLoyaltySummary(userId: string): Promise<LoyaltySummary> {
  const { data, error } = await supabase.rpc('get_loyalty_summary', { _user_id: userId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    total_points: Number(row?.total_points ?? 0),
    level: (row?.level as LoyaltyLevel) ?? 'bronze',
  };
}

export async function listLoyaltyEntries(userId: string): Promise<LoyaltyEntry[]> {
  const { data, error } = await supabase
    .from('loyalty_points')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as LoyaltyEntry[];
}

export const LEVEL_THRESHOLDS: Record<LoyaltyLevel, number> = {
  bronze: 0,
  silver: 500,
  gold: 2000,
  platinum: 5000,
};

export function nextLevel(level: LoyaltyLevel): LoyaltyLevel | null {
  const order: LoyaltyLevel[] = ['bronze', 'silver', 'gold', 'platinum'];
  const i = order.indexOf(level);
  return i < order.length - 1 ? order[i + 1] : null;
}