/**
 * Admin activity log canonical wrapper.
 * Writes audit rows to `admin_activity_log` (RLS: admins only).
 */
import { supabase } from '@/integrations/supabase/client';

export interface LogAdminActivityInput {
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

export async function logAdminActivity(input: LogAdminActivityInput): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('admin_activity_log').insert({
    user_id: user.id,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    details: (input.details ?? {}) as never,
  });
}

export async function logAdminActivityBatch(
  entries: LogAdminActivityInput[],
): Promise<void> {
  if (entries.length === 0) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const rows = entries.map(e => ({
    user_id: user.id,
    action: e.action,
    entity_type: e.entityType ?? null,
    entity_id: e.entityId ?? null,
    details: (e.details ?? {}) as never,
  }));
  await supabase.from('admin_activity_log').insert(rows);
}