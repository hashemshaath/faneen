/**
 * M5.1 / M5.2 / M5.3 — Membership invoice PDF orchestration.
 *
 * Responsibilities:
 *   1. Reserve an invoice number via the `assign_membership_invoice_number`
 *      RPC (idempotent — succeeded intents only).
 *   2. Build the KSA-compliant tax invoice PDF client-side using
 *      `buildMembershipInvoicePdf`.
 *   3. Upload the PDF to the private `membership-invoices` bucket at
 *      `invoices/{subscription_id}/{intent_id}.pdf`.
 *   4. Record the storage path via `record_membership_invoice_pdf_path`.
 *   5. Return a short-lived signed URL for download.
 *
 * Idempotent + best-effort: uses `upsert:true` on upload; failure at any
 * step throws — the caller decides how to surface it. Payment confirmation
 * itself is never at risk since this is triggered on-demand from the UI.
 */
import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  buildMembershipInvoicePdf,
  type MembershipInvoiceData,
} from '@/lib/membership-invoice-pdf';

const BUCKET = 'membership-invoices';
const SIGNED_URL_TTL_SECONDS = 300;

export interface MembershipInvoiceContext {
  paymentIntentId: string;
  subscriptionId: string;
  existingPath: string | null;
  existingInvoiceNumber: string | null;
  data: Omit<MembershipInvoiceData, 'invoiceNumber' | 'documentTitleAr' | 'documentTitleEn'>;
  /** Optional: bypass local generation when a path already exists. */
  regenerate?: boolean;
}

interface GenerateResult {
  path: string;
  invoiceNumber: string;
  signedUrl: string;
}

function storagePath(subscriptionId: string, intentId: string): string {
  return `invoices/${subscriptionId}/${intentId}.pdf`;
}

async function assignInvoiceNumber(intentId: string, fallback: string): Promise<string> {
  // Types have not been regenerated yet for the new RPCs; cast to any.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)(
    'assign_membership_invoice_number', { _intent_id: intentId },
  );
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  const first = rows[0] as { invoice_number?: string } | undefined;
  return first?.invoice_number ?? fallback;
}

async function recordPath(intentId: string, path: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)(
    'record_membership_invoice_pdf_path',
    { _intent_id: intentId, _path: path },
  );
  if (error) throw error;
}

async function signPath(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('signed_url_missing');
  return data.signedUrl;
}

export function useMembershipInvoicePdf() {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getInvoice = useCallback(
    async (ctx: MembershipInvoiceContext): Promise<GenerateResult> => {
      setIsBusy(true);
      setError(null);
      try {
        const path = storagePath(ctx.subscriptionId, ctx.paymentIntentId);

        // Fast path — reuse the stored PDF unless the caller asked to
        // regenerate (admin retry).
        if (ctx.existingPath && !ctx.regenerate) {
          const url = await signPath(ctx.existingPath);
          return {
            path: ctx.existingPath,
            invoiceNumber: ctx.existingInvoiceNumber
              ?? ctx.data.documentRef
              ?? ctx.paymentIntentId,
            signedUrl: url,
          };
        }

        // 1) Reserve/reuse invoice number
        const invoiceNumber = ctx.existingInvoiceNumber
          ?? (await assignInvoiceNumber(
            ctx.paymentIntentId,
            ctx.data.documentRef ?? ctx.paymentIntentId,
          ));

        // 2) Build the PDF client-side
        const bytes = await buildMembershipInvoicePdf({
          ...ctx.data,
          invoiceNumber,
          documentTitleAr: 'فاتورة عضوية',
          documentTitleEn: 'Membership Invoice',
        });

        // 3) Upload (upsert — idempotent regeneration)
        const uploadRes = await supabase.storage
          .from(BUCKET)
          .upload(path, new Blob([bytes as BlobPart], { type: 'application/pdf' }), {
            contentType: 'application/pdf',
            upsert: true,
          });
        if (uploadRes.error) throw uploadRes.error;

        // 4) Record path (fail-soft — signed URL still works if this fails)
        try {
          await recordPath(ctx.paymentIntentId, path);
        } catch (recErr) {
          console.warn('[useMembershipInvoicePdf] record_path failed', recErr);
        }

        // 5) Signed URL for download
        const url = await signPath(path);
        return { path, invoiceNumber, signedUrl: url };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      } finally {
        setIsBusy(false);
      }
    },
    [],
  );

  return { getInvoice, isBusy, error };
}
