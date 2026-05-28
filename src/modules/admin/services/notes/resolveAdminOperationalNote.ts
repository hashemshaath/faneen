import { supabase } from '@/integrations/supabase/client';
import type { AdminOperationalNoteRow } from './listAdminOperationalNotes';

/**
 * BUSINESS-ADMIN-2 — Resolve an open admin note.
 *
 * RLS + the `admin_operational_notes_guard` trigger ensure only
 * admin/super_admin can update, and only `status` / `resolved_*` may change.
 * Notes already in `resolved` state are rejected by the trigger.
 */
export async function resolveAdminOperationalNote({
  id,
}: {
  id: string;
}): Promise<{ data: AdminOperationalNoteRow | null; error: unknown }> {
  if (typeof id !== 'string' || id.length === 0) {
    return { data: null, error: new Error('admin-note: invalid-id') };
  }
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user?.id) {
    return { data: null, error: userErr ?? new Error('admin-note: no-session') };
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('admin_operational_notes')
    .update({
      status: 'resolved',
      resolved_by: userRes.user.id,
      resolved_at: nowIso,
    })
    .eq('id', id)
    .eq('status', 'open')
    .select(
      'id, ref_id, entity_type, note, severity, status, created_by, created_at, resolved_by, resolved_at, metadata',
    )
    .maybeSingle();

  if (error) return { data: null, error };
  return { data: (data as AdminOperationalNoteRow) ?? null, error: null };
}