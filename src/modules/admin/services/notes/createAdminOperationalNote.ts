import { supabase } from '@/integrations/supabase/client';
import {
  assertSafeNoteText,
  isOfficialRef,
  sanitizeAdminNoteMetadata,
  type AdminNoteEntityType,
  type AdminNoteSeverity,
} from './sanitizeAdminNote';
import type { AdminOperationalNoteRow } from './listAdminOperationalNotes';

/**
 * BUSINESS-ADMIN-2 — Append-only create wrapper.
 * - Validates official ref shape (UUIDs rejected).
 * - Sanitizes note text & metadata (rejects tokens / intent ids / secrets).
 * - created_by must equal auth.uid() per RLS WITH CHECK.
 */

export interface CreateAdminOperationalNoteInput {
  refId: string;
  entityType: AdminNoteEntityType;
  note: string;
  severity?: AdminNoteSeverity;
  metadata?: Record<string, unknown>;
}

export async function createAdminOperationalNote(
  input: CreateAdminOperationalNoteInput,
): Promise<{ data: AdminOperationalNoteRow | null; error: unknown }> {
  if (!isOfficialRef(input.refId)) {
    return { data: null, error: new Error('admin-note: invalid-ref') };
  }
  try {
    assertSafeNoteText(input.note);
  } catch (err) {
    return { data: null, error: err };
  }

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user?.id) {
    return { data: null, error: userErr ?? new Error('admin-note: no-session') };
  }

  const payload = {
    ref_id: input.refId.trim().toUpperCase(),
    entity_type: input.entityType,
    note: input.note.trim(),
    severity: input.severity ?? 'info',
    status: 'open' as const,
    created_by: userRes.user.id,
    metadata: sanitizeAdminNoteMetadata(input.metadata ?? {}),
  };

  const { data, error } = await supabase
    .from('admin_operational_notes')
    .insert(payload)
    .select(
      'id, ref_id, entity_type, note, severity, status, created_by, created_at, resolved_by, resolved_at, metadata',
    )
    .maybeSingle();

  if (error) return { data: null, error };
  return { data: (data as AdminOperationalNoteRow) ?? null, error: null };
}