/**
 * BUSINESS-OPERATIONS-2I — Production-safe SLA notification recipient resolver.
 *
 * Resolves the internal user IDs that should receive an in-app
 * notification for a planned SLA alert. Intentionally conservative:
 *
 *   - Reads only opaque ownership ids (`owner_user_id`,
 *     `owner_business_id`, `businesses.user_id`).
 *   - NEVER selects or returns names, phones, emails, addresses,
 *     notes, message bodies, or any customer free-text.
 *   - On missing ownership OR any read failure → returns empty
 *     recipients so the dispatcher skips (never fails) the
 *     notification. No throws.
 *   - Deduplicates by `userId`.
 *
 * Read sources are injected for testability. Production wiring uses the
 * supabase-backed loaders defined below; tests inject fakes and never
 * touch the global client.
 *
 * No source-domain mutations. No SMS/email/push. No cron.
 */
import { supabase } from '@/integrations/supabase/client';
import type { PlannedNotification } from './planNotifications';
import type {
  NotificationRecipient,
} from './notificationDispatcher';

export type RecipientSourceReason =
  | 'business_owner'
  | 'provider_owner'
  | 'alert_owner';

export interface ResolvedRecipient extends NotificationRecipient {
  source: RecipientSourceReason;
}

/** Minimal opaque ownership snapshot for a single operational alert row. */
export interface AlertOwnershipSnapshot {
  alertId: string;
  ownerUserId: string | null;
  ownerBusinessId: string | null;
}

export interface AlertOwnershipLookup {
  (alertId: string): Promise<AlertOwnershipSnapshot | null>;
}

export interface BusinessOwnerLookup {
  (businessId: string): Promise<{ userId: string | null } | null>;
}

export interface CreateRecipientResolverDeps {
  lookupAlertOwnership?: AlertOwnershipLookup;
  lookupBusinessOwner?: BusinessOwnerLookup;
}

export interface RecipientResolverResult {
  recipients: ResolvedRecipient[];
}

export type SafeNotificationRecipientResolver = (
  planned: PlannedNotification,
) => Promise<ResolvedRecipient | null>;

// ── Production loaders (narrow SELECTs, opaque ids only) ─────────────────

const lookupAlertOwnershipFromSupabase: AlertOwnershipLookup = async (
  alertId,
) => {
  const { data, error } = await supabase
    .from('operational_alerts')
    .select('id, owner_user_id, owner_business_id')
    .eq('id', alertId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    alertId: data.id,
    ownerUserId: (data.owner_user_id as string | null) ?? null,
    ownerBusinessId: (data.owner_business_id as string | null) ?? null,
  };
};

const lookupBusinessOwnerFromSupabase: BusinessOwnerLookup = async (
  businessId,
) => {
  const { data, error } = await supabase
    .from('businesses')
    .select('user_id')
    .eq('id', businessId)
    .maybeSingle();
  if (error || !data) return null;
  return { userId: (data.user_id as string | null) ?? null };
};

/**
 * Resolve a planned SLA notification to a list of safe recipients.
 * Public, dependency-injected core. Always async, never throws.
 */
export async function resolveSlaNotificationRecipients(
  planned: PlannedNotification,
  deps: CreateRecipientResolverDeps = {},
): Promise<RecipientResolverResult> {
  const lookupAlert = deps.lookupAlertOwnership ?? lookupAlertOwnershipFromSupabase;
  const lookupBusiness =
    deps.lookupBusinessOwner ?? lookupBusinessOwnerFromSupabase;

  if (!planned.alertId) {
    return { recipients: [] };
  }

  let snapshot: AlertOwnershipSnapshot | null = null;
  try {
    snapshot = await lookupAlert(planned.alertId);
  } catch {
    return { recipients: [] };
  }
  if (!snapshot) return { recipients: [] };

  const out: ResolvedRecipient[] = [];
  const seen = new Set<string>();

  function push(userId: string | null | undefined, source: RecipientSourceReason): void {
    if (!userId) return;
    if (seen.has(userId)) return;
    seen.add(userId);
    out.push({ userId, source });
  }

  if (snapshot.ownerUserId) {
    push(snapshot.ownerUserId, 'alert_owner');
  }

  if (snapshot.ownerBusinessId) {
    let owner: { userId: string | null } | null = null;
    try {
      owner = await lookupBusiness(snapshot.ownerBusinessId);
    } catch {
      owner = null;
    }
    if (owner?.userId) {
      // Treat as provider_owner for provider-side conditions (invitations,
      // contracts, payments); business_owner otherwise. The distinction is
      // observational metadata only — both resolve to the same user row.
      const domain = planned.conditionCode.split('.')[0];
      const source: RecipientSourceReason =
        domain === 'invitation' ||
        domain === 'contract' ||
        domain === 'payment'
          ? 'provider_owner'
          : 'business_owner';
      push(owner.userId, source);
    }
  }

  return { recipients: out };
}

/**
 * Adapter to the `NotificationRecipientResolver` shape consumed by
 * `dispatchPlannedNotifications`. Returns the first recipient (or null
 * when none). Multiple recipients per planned notification are supported
 * by future fan-out logic; in 2I we keep single-recipient delivery to
 * preserve per-run idempotency keys.
 */
export function createSafeSlaRecipientResolver(
  deps: CreateRecipientResolverDeps = {},
): SafeNotificationRecipientResolver {
  return async (planned) => {
    const { recipients } = await resolveSlaNotificationRecipients(planned, deps);
    return recipients[0] ?? null;
  };
}