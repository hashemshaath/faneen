/**
 * BUSINESS-WORKFLOW-5D — Transition a draft quotation to "sent" and attach
 * an approval token. The token is generated client-side; only its SHA-256
 * hash is persisted. The raw token is returned ONCE to the caller so it can
 * be embedded in the client share link.
 *
 * No email/SMS/WhatsApp delivery here — sending channels are out of scope
 * for 5D and will land in 5E. This function only flips status + records audit.
 */
import { supabase } from "@/integrations/supabase/client";
import { recordWorkOrderAudit } from "./recordWorkOrderAudit";
import type { WorkOrderQuotationRow } from "../types";

const HEX = "0123456789abcdef";

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    out += HEX[(b >> 4) & 0xf] + HEX[b & 0xf];
  }
  return out;
}

/** Generates a 48-byte url-safe token (96 hex chars). */
export function generateQuotationApprovalToken(): string {
  const arr = new Uint8Array(48);
  // crypto is available in browsers and modern Node (vitest/jsdom).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis as any;
  if (g.crypto && typeof g.crypto.getRandomValues === "function") {
    g.crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return bytesToHex(arr);
}

async function sha256Hex(input: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis as any;
  const subtle = g.crypto?.subtle;
  if (!subtle) throw new Error("subtle_crypto_unavailable");
  const enc = new TextEncoder().encode(input);
  const buf = await subtle.digest("SHA-256", enc);
  return bytesToHex(new Uint8Array(buf));
}

export interface SendWorkOrderQuotationInput {
  quotation_id: string;
  actor_id: string;
  valid_until?: string | null;
}

export interface SendWorkOrderQuotationResult {
  quotation: WorkOrderQuotationRow | null;
  /** Raw token — show to caller exactly once for share-link construction. */
  token: string | null;
  error: unknown;
}

export async function sendWorkOrderQuotation(
  input: SendWorkOrderQuotationInput,
): Promise<SendWorkOrderQuotationResult> {
  if (!input.quotation_id || !input.actor_id) {
    return { quotation: null, token: null, error: new Error("missing_required") };
  }

  const token = generateQuotationApprovalToken();
  let tokenHash: string;
  try {
    tokenHash = await sha256Hex(token);
  } catch (err) {
    return { quotation: null, token: null, error: err };
  }

  const patch: Record<string, unknown> = {
    status: "sent",
    approval_token_hash: tokenHash,
  };
  if (input.valid_until !== undefined) patch.valid_until = input.valid_until;

  const { data, error } = await supabase
    .from("work_order_quotations")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(patch as any)
    .eq("id", input.quotation_id)
    .eq("status", "draft")
    .select(
      "id, ref_id, work_order_id, boq_id, business_id, status, quotation_number, title, notes, subtotal, tax, total, currency, valid_until, sent_at, viewed_at, approved_at, rejected_at, rejection_reason, approval_token_hash, pdf_attachment_id, created_by, created_at, updated_at, deleted_at",
    )
    .maybeSingle();

  if (error || !data) {
    return { quotation: null, token: null, error: error ?? new Error("send_failed") };
  }

  await recordWorkOrderAudit({
    business_id: data.business_id,
    actor_id: input.actor_id,
    entity_id: data.work_order_id,
    action: "work_order.quotation_sent",
    metadata: {
      quotation_id: data.id,
      ref_id: data.ref_id,
    },
  });

  return { quotation: data as WorkOrderQuotationRow, token, error: null };
}