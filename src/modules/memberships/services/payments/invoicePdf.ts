/**
 * M5.1 — Server-side helpers for the KSA membership tax invoice PDF.
 *
 * All direct supabase access for the invoice PDF flow lives here so that
 * `src/pages/MembershipInvoice.tsx` keeps its source-boundary contract
 * (no direct supabase client, no `.rpc(`, no `provider_intent_id`
 * literal). The page + hook consume the safe wrapper functions below.
 */
import { supabase } from '@/integrations/supabase/client';

const INVOICE_BUCKET = 'membership-invoices';
const SIGNED_URL_TTL_SECONDS = 300;

export interface MembershipInvoiceExtras {
  id: string;
  user_id: string | null;
  billing_cycle: string | null;
  provider: string | null;
  invoice_pdf_path: string | null;
  invoice_number: string | null;
  /** External provider payment id (Moyasar id / manual reference). */
  payment_ref: string | null;
}

/**
 * Fetch the extra columns (numbering, storage path, provider metadata)
 * needed to render / download the invoice. Visibility is enforced by RLS
 * on `membership_payment_intents` — owners see their own, admins see all.
 */
export async function getMembershipInvoiceExtras(
  paymentIntentId: string,
): Promise<{ data: MembershipInvoiceExtras | null; error: unknown }> {
  // Cast the query builder to any because `invoice_pdf_path` and
  // `invoice_number` are not yet reflected in the generated types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('membership_payment_intents') as any)
    .select('id, user_id, billing_cycle, provider, invoice_pdf_path, invoice_number, provider_intent_id, invoice_id')
    .eq('id', paymentIntentId)
    .maybeSingle();
  if (error) return { data: null, error };
  const row = (data as Record<string, unknown> | null) ?? null;
  if (!row) return { data: null, error: null };
  return {
    data: {
      id: String(row.id ?? ''),
      user_id: (row.user_id as string | null) ?? null,
      billing_cycle: (row.billing_cycle as string | null) ?? null,
      provider: (row.provider as string | null) ?? null,
      invoice_pdf_path: (row.invoice_pdf_path as string | null) ?? null,
      invoice_number: (row.invoice_number as string | null) ?? null,
      payment_ref: ((row.provider_intent_id as string | null)
        ?? (row.invoice_id as string | null))
        ?? null,
    },
    error: null,
  };
}

export interface BillingSellerSettings {
  vatNumber: string | null;
  legalNameAr: string;
  legalNameEn: string;
  commercialRegistration: string | null;
}

const DEFAULT_SELLER_AR = 'شركة بيانات للتقنية — منصة قطاعات';
const DEFAULT_SELLER_EN = 'Bayanat Technology Company — Qitaat Platform';

export async function getBillingSellerSettings(): Promise<BillingSellerSettings> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('setting_key, setting_value')
    .eq('category', 'billing');
  if (error || !data) {
    return {
      vatNumber: null,
      legalNameAr: DEFAULT_SELLER_AR,
      legalNameEn: DEFAULT_SELLER_EN,
      commercialRegistration: null,
    };
  }
  const map: Record<string, string> = {};
  for (const row of data as Array<{ setting_key: string; setting_value: string | null }>) {
    map[row.setting_key] = row.setting_value ?? '';
  }
  const vat = (map.vat_registration_number || '').trim();
  const cr = (map.seller_commercial_registration || '').trim();
  return {
    vatNumber: vat || null,
    legalNameAr: map.seller_legal_name_ar || DEFAULT_SELLER_AR,
    legalNameEn: map.seller_legal_name_en || DEFAULT_SELLER_EN,
    commercialRegistration: cr || null,
  };
}

export interface InvoiceBuyerProfile {
  full_name: string | null;
  email: string | null;
}

export async function getInvoiceBuyerProfile(
  userId: string,
): Promise<InvoiceBuyerProfile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('user_id', userId)
    .maybeSingle();
  return (data as InvoiceBuyerProfile | null) ?? null;
}

export async function assignInvoiceNumberRpc(paymentIntentId: string): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)(
    'assign_membership_invoice_number',
    { _intent_id: paymentIntentId },
  );
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return (rows[0] as { invoice_number?: string } | undefined)?.invoice_number ?? null;
}

export async function recordInvoicePathRpc(
  paymentIntentId: string,
  path: string,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)(
    'record_membership_invoice_pdf_path',
    { _intent_id: paymentIntentId, _path: path },
  );
  if (error) throw error;
}

export async function uploadInvoicePdf(
  path: string,
  bytes: Uint8Array,
): Promise<void> {
  const { error } = await supabase.storage
    .from(INVOICE_BUCKET)
    .upload(path, new Blob([bytes as BlobPart], { type: 'application/pdf' }), {
      contentType: 'application/pdf',
      upsert: true,
    });
  if (error) throw error;
}

export async function signInvoicePath(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(INVOICE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('signed_url_missing');
  return data.signedUrl;
}

export function membershipInvoiceStoragePath(
  subscriptionId: string,
  paymentIntentId: string,
): string {
  return `invoices/${subscriptionId}/${paymentIntentId}.pdf`;
}
