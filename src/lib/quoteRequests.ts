import { supabase } from '@/integrations/supabase/client';
// Re-exports moved to src/modules/leads/* in R3A.
// This file remains as a back-compat shim so existing imports keep working.
export {
  QUOTE_BUCKET,
  SIGNED_URL_TTL,
} from '@/modules/leads/constants/storage';
export {
  QUOTE_STATUSES,
  QUOTE_STATUS_LABEL_AR,
  QUOTE_STATUS_LABEL_EN,
  QUOTE_STATUS_DESC_AR,
  QUOTE_STATUS_TONE,
  LEAD_STATUSES,
  LEAD_STATUS_LABEL_AR,
  LEAD_STATUS_TONE,
  type QuoteStatus,
  type LeadRequestStatus as LeadStatus,
} from '@/modules/leads/constants/quoteStatuses';
export {
  CUSTOMER_TYPE_LABEL_AR,
  CONTACT_METHOD_LABEL_AR,
  SERVICE_LOCATION_LABEL_AR,
  TIMELINE_LABEL_AR,
  SECTOR_LABEL_AR,
} from '@/modules/leads/constants/labels';
export { normalizePhoneForWhatsApp } from '@/modules/leads/utils/phone';
export { formatFileSize } from '@/modules/leads/utils/fileSize';

import { QUOTE_BUCKET, SIGNED_URL_TTL } from '@/modules/leads/constants/storage';

export async function createSignedQuoteFileUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(QUOTE_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_TTL);
  if (error) {
    console.warn('signed url failed', error);
    return null;
  }
  return data?.signedUrl ?? null;
}