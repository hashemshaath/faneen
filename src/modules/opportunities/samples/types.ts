/**
 * R3 — Sample track (opportunities → sample gate → contract).
 * Backed by `public.rfq_samples`. All access is enforced by RLS:
 * client (RFQ owner), provider staff of the awarded business, and admins.
 */
import type { Database } from '@/integrations/supabase/types';

export type RfqSampleRow = Database['public']['Tables']['rfq_samples']['Row'];
export type RfqSampleInsert = Database['public']['Tables']['rfq_samples']['Insert'];
export type RfqSampleStatus =
  | 'requested'
  | 'shipped'
  | 'received'
  | 'approved'
  | 'rejected';

export interface RfqSamplePhoto {
  path: string;
  uploaded_at: string;
  uploaded_by?: string | null;
  file_name?: string | null;
}

export const SAMPLE_STATUS_LABEL_AR: Record<RfqSampleStatus, string> = {
  requested: 'طلب العينة',
  shipped: 'الشحن',
  received: 'الاستلام',
  approved: 'تم الاعتماد',
  rejected: 'مرفوضة',
};

export const SAMPLE_STAGES: RfqSampleStatus[] = [
  'requested',
  'shipped',
  'received',
  'approved',
];