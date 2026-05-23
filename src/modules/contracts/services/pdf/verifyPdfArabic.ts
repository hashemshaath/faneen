import { supabase } from '@/integrations/supabase/client';

export interface VerifyPdfArabicPayload {
  pdfBase64: string;
  fileName?: string;
  [key: string]: unknown;
}

/**
 * EF-2: Thin wrapper around the `verify-pdf-arabic` edge function.
 *
 * Behavior contract:
 * - Invokes `verify-pdf-arabic` with `{ body: payload }` verbatim.
 * - Returns the raw `{ data, error }` result from `supabase.functions.invoke`.
 * - Does not transform, validate, or inspect the payload.
 * - Does not modify PDF generation, Arabic shaping, fonts, or
 *   verification semantics.
 */
export async function verifyPdfArabic(
  payload: VerifyPdfArabicPayload,
): Promise<ReturnType<typeof supabase.functions.invoke>> {
  return supabase.functions.invoke('verify-pdf-arabic', {
    body: payload,
  });
}