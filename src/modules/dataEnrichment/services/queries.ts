import { supabase } from "@/integrations/supabase/client";
import type { EnrichmentRecord, RecordStatus } from "../types";

type Row = Record<string, unknown>;

function rowToRecord(row: Row): EnrichmentRecord {
  return {
    id: String(row.id),
    source_key: row.source_key as EnrichmentRecord["source_key"],
    external_ref: (row.external_ref as string | null) ?? null,
    raw: (row.raw as Record<string, unknown>) ?? {},
    normalized: (row.normalized as EnrichmentRecord["normalized"]) ?? {},
    translated: (row.translated as EnrichmentRecord["translated"]) ?? {},
    confidence: (row.confidence as EnrichmentRecord["confidence"]) ?? {},
    conflicts: (row.conflicts as EnrichmentRecord["conflicts"]) ?? [],
    quality_score: Number(row.quality_score ?? 0),
    status: row.status as RecordStatus,
    target_entity_type: (row.target_entity_type as string | null) ?? null,
    target_entity_id: (row.target_entity_id as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function listRecords(filter?: { status?: RecordStatus; source?: string }) {
  let q = supabase
    .from("data_enrichment_records")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter?.status) q = q.eq("status", filter.status);
  if (filter?.source) q = q.eq("source_key", filter.source);
  const { data, error } = await q;
  if (error) return { data: [] as EnrichmentRecord[], error };
  return { data: ((data ?? []) as Row[]).map(rowToRecord), error: null };
}

export async function listAudit(record_id?: string) {
  let q = supabase
    .from("data_enrichment_audit")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (record_id) q = q.eq("record_id", record_id);
  return q;
}

export async function listSourcesFromDb() {
  return supabase
    .from("data_enrichment_sources")
    .select("*")
    .order("trust_weight", { ascending: false });
}

export async function listQualitySnapshots(entity_type?: string) {
  let q = supabase
    .from("data_enrichment_quality_snapshots")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (entity_type) q = q.eq("entity_type", entity_type);
  return q;
}