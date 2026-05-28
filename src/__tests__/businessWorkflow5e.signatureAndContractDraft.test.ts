/**
 * BUSINESS-WORKFLOW-5E — E-signature capture + contract draft conversion.
 *
 * Source-level invariants for the 5E migration, service surface, dashboard
 * UI, public viewer signature form, and security boundaries (no payment /
 * invoice / notification / realtime / external e-sign provider).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const MIGRATIONS = join(ROOT, "supabase/migrations");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

function findMigration(needle: string): string | null {
  if (!existsSync(MIGRATIONS)) return null;
  for (const f of readdirSync(MIGRATIONS).filter((x) => x.endsWith(".sql"))) {
    const src = readFileSync(join(MIGRATIONS, f), "utf8");
    if (src.includes(needle)) return src;
  }
  return null;
}

/* ─── 1. Migration / schema ─── */
describe("BUSINESS-WORKFLOW-5E migration", () => {
  const sql = findMigration("create_contract_draft_from_quotation");

  it("adds signature columns + contract link to work_order_quotations", () => {
    expect(sql).not.toBeNull();
    expect(sql!).toMatch(/ADD COLUMN IF NOT EXISTS approved_by_name/);
    expect(sql!).toMatch(/ADD COLUMN IF NOT EXISTS approved_by_title/);
    expect(sql!).toMatch(/ADD COLUMN IF NOT EXISTS signature_text/);
    expect(sql!).toMatch(/ADD COLUMN IF NOT EXISTS approval_ip_hash/);
    expect(sql!).toMatch(/ADD COLUMN IF NOT EXISTS approval_user_agent_hash/);
    expect(sql!).toMatch(/ADD COLUMN IF NOT EXISTS contract_id/);
    expect(sql!).toMatch(/REFERENCES public\.contracts\(id\) ON DELETE SET NULL/);
  });

  it("freezes signature fields and contract_id once set", () => {
    expect(sql!).toMatch(/quotation_signature_locked/);
    expect(sql!).toMatch(/quotation_contract_link_locked/);
  });

  it("replaces approve RPC with signature-required variant", () => {
    expect(sql!).toMatch(/DROP FUNCTION IF EXISTS public\.approve_quotation_by_token\(text, text\)/);
    expect(sql!).toMatch(
      /CREATE OR REPLACE FUNCTION public\.approve_quotation_by_token\([^)]*_approved_by_name[^)]*_signature_text/s,
    );
    expect(sql!).toMatch(/signature_required/);
    expect(sql!).toMatch(/work_order\.quotation_approved_with_signature/);
  });

  it("keeps the approval token SHA-256 hashed (no raw token columns)", () => {
    // No new raw-token columns. The hashed column is the only persisted form.
    expect(sql!).not.toMatch(/ADD COLUMN[^;]*approval_token\s+text/i);
    expect(sql!).toMatch(/digest\(_token, 'sha256'\)/);
  });

  it("adds manager-only contract draft RPC, idempotent + approved-only", () => {
    expect(sql!).toMatch(/CREATE OR REPLACE FUNCTION public\.create_contract_draft_from_quotation/);
    expect(sql!).toMatch(/is_business_owner_or_manager/);
    expect(sql!).toMatch(/quotation_not_approved/);
    expect(sql!).toMatch(/already_existed/);
    expect(sql!).toMatch(/work_order\.quotation_converted_to_contract_draft/);
  });

  it("grants RPC execution correctly: anon may approve (token-gated); only authenticated may convert", () => {
    expect(sql!).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.approve_quotation_by_token\([^)]*\) TO anon, authenticated/,
    );
    expect(sql!).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.create_contract_draft_from_quotation\(uuid\) TO authenticated/,
    );
    expect(sql!).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.create_contract_draft_from_quotation\(uuid\) TO anon/,
    );
  });

  it("never creates payments, invoices, or external notifications in this migration", () => {
    expect(sql!).not.toMatch(/INSERT INTO public\.contract_payments/i);
    expect(sql!).not.toMatch(/INSERT INTO public\.invoices/i);
    expect(sql!).not.toMatch(/INSERT INTO public\.notifications\b/i);
    expect(sql!).not.toMatch(/pg_notify\s*\(/i);
  });
});

/* ─── 2. Approve service: signature contract ─── */
describe("approveWorkOrderQuotation service (5E)", () => {
  const src = read("src/modules/workOrders/services/approveWorkOrderQuotation.ts");

  it("requires approvedByName + signatureText and forwards them to the RPC", () => {
    expect(src).toMatch(/approvedByName:\s*string/);
    expect(src).toMatch(/signatureText:\s*string/);
    expect(src).toMatch(/signature_required/);
    expect(src).toMatch(/_approved_by_name:/);
    expect(src).toMatch(/_signature_text:/);
    expect(src).toMatch(/_approved_by_title:/);
    expect(src).toMatch(/_ip_hash:/);
    expect(src).toMatch(/_user_agent_hash:/);
  });

  it("never logs or returns the raw token", () => {
    expect(src).not.toMatch(/console\.[a-z]+\(.*token/i);
    // No object property named `token` (or `approval_token`/`approvalToken`) in any return.
    expect(src).not.toMatch(/return[^;]*\b(approval_?t|t)oken\s*:/i);
  });
});

/* ─── 3. Contract draft conversion service ─── */
describe("createContractDraftFromApprovedQuotation service", () => {
  const path = "src/modules/workOrders/services/createContractDraftFromApprovedQuotation.ts";
  const src = read(path);

  it("calls the SECURITY DEFINER RPC by name", () => {
    expect(src).toMatch(/supabase\.rpc\(\s*"create_contract_draft_from_quotation"/);
    expect(src).toMatch(/_quotation_id:/);
  });

  it("returns idempotent shape with alreadyExisted boolean", () => {
    expect(src).toMatch(/alreadyExisted/);
  });

  it("never imports payment, invoice, membership, notifications, realtime or external e-sign providers", () => {
    expect(src).not.toMatch(/from\s+["'][^"']*payments?/i);
    expect(src).not.toMatch(/from\s+["'][^"']*invoices?/i);
    expect(src).not.toMatch(/from\s+["'][^"']*membership/i);
    expect(src).not.toMatch(/from\s+["'][^"']*notifications?/i);
    expect(src).not.toMatch(/realtime/i);
    expect(src).not.toMatch(/docusign|hellosign|adobesign|esign|signnow/i);
    expect(src).not.toMatch(/whatsapp|twilio|sendgrid|mailgun|resend\.com/i);
  });

  it("does not contain raw IP / token logging", () => {
    expect(src).not.toMatch(/console\.[a-z]+\(.*(?:token|ip)\b/i);
  });
});

/* ─── 4. Barrel exports ─── */
describe("workOrders module barrel (5E)", () => {
  const src = read("src/modules/workOrders/index.ts");
  it("exports the new contract draft conversion service", () => {
    expect(src).toMatch(/createContractDraftFromApprovedQuotation/);
    expect(src).toMatch(/CreateContractDraftFromApprovedQuotationInput/);
  });
});

/* ─── 5. Public viewer signature form ─── */
describe("QuotationViewer signature form (5E)", () => {
  const src = read("src/pages/QuotationViewer.tsx");

  it("renders an inline approval form with name + signature + consent checkbox", () => {
    expect(src).toMatch(/wo-quotation-viewer-approve-form/);
    expect(src).toMatch(/wo-quotation-viewer-approve-name/);
    expect(src).toMatch(/wo-quotation-viewer-approve-signature/);
    expect(src).toMatch(/wo-quotation-viewer-approve-consent/);
    expect(src).toMatch(/wo-quotation-viewer-approve-submit/);
    expect(src).toMatch(/أوافق على عرض السعر والشروط/);
    expect(src).toMatch(/I approve this quotation and terms/);
  });

  it("blocks submission unless consent + name + signature are present", () => {
    expect(src).toMatch(/!consent\s*\|\|\s*!signName\.trim\(\)\s*\|\|\s*!signature\.trim\(\)/);
  });

  it("does not use any modal/dialog primitive for approval", () => {
    expect(src).not.toMatch(/from\s+["']@\/components\/ui\/dialog["']/);
    expect(src).not.toMatch(/<Dialog\b/);
    expect(src).not.toMatch(/<AlertDialog\b/);
  });

  it("does not log the raw token", () => {
    expect(src).not.toMatch(/console\.[a-z]+\(.*token/i);
  });
});

/* ─── 6. Dashboard quotations section ─── */
describe("WorkOrderQuotationsSection (5E)", () => {
  const src = read("src/components/workOrders/WorkOrderQuotationsSection.tsx");

  it("shows the create-contract-draft button and open-contract link", () => {
    expect(src).toMatch(/wo-quotations-create-contract-draft-btn/);
    expect(src).toMatch(/wo-quotations-open-contract-link/);
    expect(src).toMatch(/createContractDraftFromApprovedQuotation/);
  });

  it("only offers conversion for approved quotations without an existing contract link", () => {
    expect(src).toMatch(
      /activeQuotation\.status === "approved"[\s\S]*!activeQuotation\.contract_id/,
    );
  });

  it("displays the captured signer name when approved", () => {
    expect(src).toMatch(/wo-quotations-signature-block/);
    expect(src).toMatch(/approved_by_name/);
  });

  it("uses no modal/dialog primitives", () => {
    expect(src).not.toMatch(/from\s+["']@\/components\/ui\/dialog["']/);
    expect(src).not.toMatch(/<Dialog\b/);
    expect(src).not.toMatch(/<AlertDialog\b/);
  });
});

/* ─── 7. Security boundaries across 5E surface ─── */
describe("BUSINESS-WORKFLOW-5E security boundaries", () => {
  const files = [
    "src/modules/workOrders/services/approveWorkOrderQuotation.ts",
    "src/modules/workOrders/services/createContractDraftFromApprovedQuotation.ts",
    "src/pages/QuotationViewer.tsx",
    "src/components/workOrders/WorkOrderQuotationsSection.tsx",
  ];

  it.each(files)("%s does not pull in payments / invoices / external e-sign / realtime", (rel) => {
    const src = read(rel);
    expect(src).not.toMatch(/from\s+["'][^"']*\/payments?\//i);
    expect(src).not.toMatch(/from\s+["'][^"']*\/invoices?\//i);
    expect(src).not.toMatch(/docusign|hellosign|adobesign|esign\.com|signnow/i);
    expect(src).not.toMatch(/whatsapp|twilio|sendgrid|mailgun|resend\.com/i);
    expect(src).not.toMatch(/supabase\.channel\(|\.on\(\s*["']postgres_changes["']/);
  });
});