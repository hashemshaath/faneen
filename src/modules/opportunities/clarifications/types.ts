/**
 * R4 — RFQ clarifications (Q&A) domain types.
 */
import type { Database } from '@/integrations/supabase/types';

export type RfqClarificationRow =
  Database['public']['Tables']['rfq_clarifications']['Row'];

export type ClarificationAuthorRole = 'client' | 'provider' | 'admin';

export interface RfqClarificationAttachment {
  path: string;
  file_name?: string | null;
  size?: number | null;
}
