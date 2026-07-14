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
import {
  buildMembershipInvoicePdf,
  type MembershipInvoiceData,
} from '@/lib/membership-invoice-pdf';
import {
  assignInvoiceNumberRpc,
  membershipInvoiceStoragePath,
  recordInvoicePathRpc,
  signInvoicePath,
  uploadInvoicePdf,
} from '@/modules/memberships/services/payments/invoicePdf';

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

export function useMembershipInvoicePdf() {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getInvoice = useCallback(
    async (ctx: MembershipInvoiceContext): Promise<GenerateResult> => {
      setIsBusy(true);
      setError(null);
      try {
        const path = membershipInvoiceStoragePath(ctx.subscriptionId, ctx.paymentIntentId);

        // Fast path — reuse the stored PDF unless the caller asked to
        // regenerate (admin retry).
        if (ctx.existingPath && !ctx.regenerate) {
          const url = await signInvoicePath(ctx.existingPath);
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
          ?? (await assignInvoiceNumberRpc(ctx.paymentIntentId))
          ?? (ctx.data.documentRef ?? ctx.paymentIntentId);

        // 2) Build the PDF client-side
        const bytes = await buildMembershipInvoicePdf({
          ...ctx.data,
          invoiceNumber,
          documentTitleAr: 'فاتورة عضوية',
          documentTitleEn: 'Membership Invoice',
        });

        // 3) Upload (upsert — idempotent regeneration)
        await uploadInvoicePdf(path, bytes);

        // 4) Record path (fail-soft — signed URL still works if this fails)
        try {
          await recordInvoicePathRpc(ctx.paymentIntentId, path);
        } catch (recErr) {
          console.warn('[useMembershipInvoicePdf] record_path failed', recErr);
        }

        // 5) Signed URL for download
        const url = await signInvoicePath(path);
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
