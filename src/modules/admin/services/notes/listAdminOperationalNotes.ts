import { supabase } from '@/integrations/supabase/client';
import {
  isOfficialRef,
  sanitizeAdminNoteMetadata,
  type AdminNoteEntityType,
  type AdminNoteSeverity,
  type AdminNoteStatus,
} from './sanitizeAdminNote';

/**
 * BUSINESS-ADMIN-2 — Admin-safe wrapper for reading operational notes.
 * Read-only. RLS limits SELECT to admin/super_admin (non-admins get 0 rows).
 */

export interface AdminOperationalNoteRow {
  id: string;
  ref_id: string;
  entity_type: AdminNoteEntityType;
  note: string;
  severity: AdminNoteSeverity;
  status: AdminNoteStatus;
  created_by: string | null;
  created_at: string;
  resolved_by: string | null;
  resolved_at: string | null;
  metadata: Record<string, unknown>;
}

export interface ListAdminOperationalNotesOptions {
  refId?: string;
  status?: AdminNoteStatus | 'all';
  severity?: AdminNoteSeverity | 'all';
  limit?: number;
}

export async function listAdminOperationalNotes(
  options: ListAdminOperationalNotesOptions = {},
): Promise<{ data: AdminOperationalNoteRow[] | null; error: unknown }> {
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  let query = supabase
    .from('admin_operational_notes')
    .select(
      'id, ref_id, entity_type, note, severity, status, created_by, created_at, resolved_by, resolved_at, metadata',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options.refId && isOfficialRef(options.refId)) {
    query = query.eq('ref_id', options.refId.trim().toUpperCase());
  }
  if (options.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }
  if (options.severity && options.severity !== 'all') {
    query = query.eq('severity', options.severity);
  }

  const { data, error } = await query;
  if (error) return { data: null, error };

  const rows = (data ?? []) as AdminOperationalNoteRow[];
  const cleaned: AdminOperationalNoteRow[] = rows.map((r) => ({
    ...r,
    metadata: sanitizeAdminNoteMetadata(r.metadata ?? {}),
  }));
  return { data: cleaned, error: null };
}