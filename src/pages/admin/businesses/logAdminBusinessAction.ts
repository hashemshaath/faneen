/**
 * Phase 5G — extracted admin activity logger for the AdminBusinesses
 * screen. Inserts a typed row into `admin_activity_log` with
 * `entity_type = 'business'`. Behaviour-preserving move from the
 * inline `logAction` closure that previously lived in
 * `AdminBusinesses.tsx`.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  AdminActivityLogInsert,
  AdminJson,
} from '@/pages/admin/adminBusinesses.types';

export async function logAdminBusinessAction(
  userId: string,
  action: string,
  entityId: string,
  details: Record<string, unknown>,
): Promise<void> {
  const payload: AdminActivityLogInsert = {
    user_id: userId,
    action,
    entity_type: 'business',
    entity_id: entityId,
    details: details as AdminJson,
  };
  await supabase.from('admin_activity_log').insert(payload);
}