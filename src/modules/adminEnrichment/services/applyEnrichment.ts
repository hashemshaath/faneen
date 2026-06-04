import { supabase } from "@/integrations/supabase/client";
import type {
  EnrichmentApplyResult,
  EnrichmentDraftSummary,
  EnrichmentSessionRow,
} from "../types";

export interface EnrichmentExtra {
  category_slug?: string | null;
  services_ar?: string | null;
  services_en?: string | null;
  ai_enhanced?: Record<string, string> | null;
  selected_place?: Record<string, unknown> | null;
  db_matches?: Record<string, unknown> | null;
  diagnostics?: Record<string, unknown> | null;
  notes?: string | null;
}

export interface ApplyEnrichmentInput {
  action?: "save_draft" | "approve";
  session_id: string;
  mode?: "lead" | "business";
  business_id?: string;
  approved: Record<string, string | undefined>;
  extra?: EnrichmentExtra;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(
    "admin-enrichment-apply",
    { body },
  );
  if (error) return { error: "request_failed" } as unknown as T;
  return (data ?? ({ error: "empty_response" } as unknown as T));
}

/** Approve (or save) — defaults to approve for back-compat. */
export async function applyEnrichment(
  input: ApplyEnrichmentInput,
): Promise<EnrichmentApplyResult> {
  return invoke<EnrichmentApplyResult>({ action: input.action ?? "approve", ...input });
}

/** Persist current state as an editable draft. No account or Ref ID is created. */
export async function saveEnrichmentDraft(input: {
  session_id: string;
  approved: Record<string, string | undefined>;
  extra?: EnrichmentExtra;
}): Promise<EnrichmentApplyResult> {
  return invoke<EnrichmentApplyResult>({ action: "save_draft", ...input });
}

export async function listEnrichmentDrafts(): Promise<{
  ok?: boolean;
  drafts?: EnrichmentDraftSummary[];
  error?: string;
}> {
  return invoke({ action: "list_drafts" });
}

export async function loadEnrichmentDraft(session_id: string): Promise<{
  ok?: boolean;
  session?: EnrichmentSessionRow;
  error?: string;
}> {
  return invoke({ action: "load_draft", session_id });
}

export async function deleteEnrichmentDraft(session_id: string): Promise<{
  ok?: boolean;
  error?: string;
}> {
  return invoke({ action: "delete_draft", session_id });
}