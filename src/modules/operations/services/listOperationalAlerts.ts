/**
 * BUSINESS-OPERATIONS-2B — Read wrapper for operational_alerts.
 *
 * RLS limits which rows are visible (admins all, owner user, business
 * members). Returns the raw Supabase `{ data, error }` envelope unchanged.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  OperationalAlertDomain,
  OperationalAlertSeverity,
  OperationalAlertStatus,
} from '../constants/alerts';

export type ListOperationalAlertsArgs = {
  status?: OperationalAlertStatus;
  severity?: OperationalAlertSeverity;
  domain?: OperationalAlertDomain;
  ownerBusinessId?: string;
  ownerUserId?: string;
  limit?: number;
};

export function listOperationalAlerts(args: ListOperationalAlertsArgs = {}) {
  let q = supabase
    .from('operational_alerts')
    .select('*')
    .order('triggered_at', { ascending: false });
  if (args.status) q = q.eq('status', args.status);
  if (args.severity) q = q.eq('severity', args.severity);
  if (args.domain) q = q.eq('domain', args.domain);
  if (args.ownerBusinessId) q = q.eq('owner_business_id', args.ownerBusinessId);
  if (args.ownerUserId) q = q.eq('owner_user_id', args.ownerUserId);
  if (typeof args.limit === 'number') q = q.limit(args.limit);
  return q;
}