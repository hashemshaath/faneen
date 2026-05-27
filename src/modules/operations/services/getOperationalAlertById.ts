/**
 * BUSINESS-OPERATIONS-2B — Single-row read wrapper for operational_alerts.
 * RLS enforces visibility. Returns raw `{ data, error }` from maybeSingle().
 */
import { supabase } from '@/integrations/supabase/client';

export type GetOperationalAlertByIdArgs = { id: string };

export function getOperationalAlertById({ id }: GetOperationalAlertByIdArgs) {
  return supabase
    .from('operational_alerts')
    .select('*')
    .eq('id', id)
    .maybeSingle();
}