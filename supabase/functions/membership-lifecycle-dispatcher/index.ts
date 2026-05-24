// R4F-5: Membership Lifecycle Email Dispatcher
// ─────────────────────────────────────────────
// Sends deferred membership lifecycle emails (expired, renewal reminder,
// renewal failed, promo redeemed) that were left out of R4F-4 Phase 1
// because they are driven by cron RPCs rather than UI actions.
//
// Design notes:
// - Drives off the idempotent `notifications` rows already produced by the
//   membership lifecycle RPCs (process_expired_memberships,
//   process_renewal_failures, notify_expiring_memberships). Promo emails
//   are driven off membership_promo_redemptions.
// - Fail-soft per email: a failure on one row does not block others.
// - Idempotency: a deterministic `dispatch_key` is recorded in
//   `email_send_log.metadata` as a marker row inserted BEFORE invoking
//   send-transactional-email. Subsequent runs that see the same key skip
//   the send. Daily cron + 7-day notification window means race risk is
//   negligible without a unique index.
// - This function performs NO membership state mutation. All RPCs and the
//   send-transactional-email pipeline are untouched.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  fetchLifecycleSubscriptionContext,
  fetchRecentPromoRedemptions,
  type LifecycleSubscriptionContext,
} from '../_shared/memberships/lifecycleEmailData.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const DISPATCH_SOURCE = 'membership-lifecycle-dispatcher';
const NOTIFICATION_WINDOW_DAYS = 7;
const PROMO_WINDOW_HOURS = 48;

interface DispatchDetail {
  template: string;
  recipient: string;
  dispatch_key: string;
  status: 'sent' | 'skipped' | 'failed';
  reason?: string;
}

function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 1) return '***';
  return `${email[0]}***${email.slice(at)}`;
}

function isoDateOnly(value: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

function daysBetween(now: Date, target: string | null): number | null {
  if (!target) return null;
  const t = new Date(target).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.ceil((t - now.getTime()) / 86400000));
}

async function alreadyDispatched(
  admin: any,
  dispatchKey: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from('email_send_log')
    .select('id')
    .eq('metadata->>dispatch_key', dispatchKey)
    .limit(1)
    .maybeSingle();
  if (error) {
    // Fail-closed for dedup so we never double-send on log read errors.
    console.warn('lifecycle-dispatcher: dedup check failed', { dispatchKey, error: error.message });
    return true;
  }
  return !!data;
}

async function recordDispatchMarker(
  admin: any,
  params: {
    templateName: string;
    recipient: string;
    dispatchKey: string;
    referenceType: string;
    referenceId: string;
  },
) {
  await admin.from('email_send_log').insert({
    template_name: params.templateName,
    recipient_email: params.recipient,
    status: 'pending',
    metadata: {
      dispatch_key: params.dispatchKey,
      source: DISPATCH_SOURCE,
      reference_type: params.referenceType,
      reference_id: params.referenceId,
    },
  });
}

async function invokeSendTransactionalEmail(
  body: {
    templateName: string;
    recipientEmail: string;
    idempotencyKey: string;
    templateData: Record<string, unknown>;
  },
  serviceKey: string,
  supabaseUrl: string,
): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify(body),
    });
    const text = await resp.text();
    if (!resp.ok) {
      return { ok: false, status: resp.status, error: text.slice(0, 240) };
    }
    return { ok: true, status: resp.status };
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

async function getRecipientForUser(
  admin: any,
  userId: string,
): Promise<{ email: string | null; name: string | null }> {
  const { data } = await admin
    .from('profiles')
    .select('email, login_email, full_name')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return { email: null, name: null };
  return {
    email: (data.email as string | null) ?? (data.login_email as string | null) ?? null,
    name: (data.full_name as string | null) ?? null,
  };
}

async function getBusinessName(admin: any, businessId: string | null): Promise<string | null> {
  if (!businessId) return null;
  const { data } = await admin
    .from('businesses')
    .select('name_ar, name_en')
    .eq('id', businessId)
    .maybeSingle();
  if (!data) return null;
  return (data.name_ar as string | null) ?? (data.name_en as string | null) ?? null;
}

function planLabel(ctx: LifecycleSubscriptionContext): string {
  return ctx.plan_name_ar || ctx.plan_name_en || ctx.plan_tier || '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return new Response(
      JSON.stringify({ error: 'server_misconfigured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ── Auth: cron secret OR service-role bearer OR admin user ───────────────
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  const headerSecret = req.headers.get('x-cron-secret') ?? '';
  const authHeader = req.headers.get('Authorization') ?? '';
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();

  let authorized = false;
  if (cronSecret && headerSecret && headerSecret === cronSecret) authorized = true;
  if (!authorized && bearer && bearer === serviceKey) authorized = true;
  if (!authorized && bearer) {
    try {
      const sb = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
      });
      const { data } = await sb.auth.getClaims(bearer);
      const uid = data?.claims?.sub;
      if (uid) {
        const { data: ok } = await sb.rpc('has_admin_access', { _user_id: uid });
        if (ok === true) authorized = true;
      }
    } catch (_e) {
      // ignore
    }
  }

  if (!authorized) {
    return new Response(
      JSON.stringify({ error: 'unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get('dryRun') === '1';

  const admin = createClient(supabaseUrl, serviceKey);
  const now = new Date();
  const windowStart = new Date(now.getTime() - NOTIFICATION_WINDOW_DAYS * 86400000).toISOString();

  const details: DispatchDetail[] = [];
  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  // EDGE-CRON-OBSERVABILITY-2: capture run start for cron_run_log.
  const runStartedAt = new Date().toISOString();

  // ── 1. Lifecycle notifications drive 3 of 4 templates ────────────────────
  const REF_TYPES = [
    'membership_subscription_expired',
    'membership_renewal_failed',
    'membership_subscription_expiring_3d',
    'membership_subscription_expiring_7d',
  ];

  const { data: notes, error: notesErr } = await admin
    .from('notifications')
    .select('id, user_id, reference_type, reference_id, created_at, is_demo')
    .in('reference_type', REF_TYPES)
    .gte('created_at', windowStart)
    .eq('is_demo', false)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (notesErr) {
    return new Response(
      JSON.stringify({ error: 'failed_to_read_notifications', message: notesErr.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  for (const note of (notes ?? []) as any[]) {
    if (!note.reference_id) continue;
    processed++;
    const subId: string = note.reference_id;
    const refType: string = note.reference_type;

    let templateName = '';
    let dispatchKey = '';
    let daysBefore: number | null = null;
    if (refType === 'membership_subscription_expired') {
      templateName = 'membership-subscription-expired';
      dispatchKey = `membership-expired-${subId}`;
    } else if (refType === 'membership_renewal_failed') {
      templateName = 'membership-renewal-failed';
      dispatchKey = `membership-renewal-failed-${subId}`;
    } else if (refType === 'membership_subscription_expiring_3d') {
      templateName = 'membership-renewal-reminder';
      daysBefore = 3;
    } else if (refType === 'membership_subscription_expiring_7d') {
      templateName = 'membership-renewal-reminder';
      daysBefore = 7;
    } else {
      continue;
    }

    try {
      const ctx = await fetchLifecycleSubscriptionContext(admin, subId);
      if (!ctx) {
        details.push({ template: templateName, recipient: '?', dispatch_key: dispatchKey || `pending-${subId}`, status: 'skipped', reason: 'subscription_missing' });
        skipped++;
        continue;
      }

      if (templateName === 'membership-renewal-reminder') {
        const bucket = isoDateOnly(ctx.expires_at) ?? isoDateOnly(note.created_at) ?? 'unknown';
        dispatchKey = `membership-renewal-reminder-${subId}-${bucket}-${daysBefore}`;
      }

      const recipient = await getRecipientForUser(admin, ctx.user_id);
      if (!recipient.email) {
        details.push({ template: templateName, recipient: '?', dispatch_key: dispatchKey, status: 'skipped', reason: 'no_recipient_email' });
        skipped++;
        continue;
      }

      if (await alreadyDispatched(admin, dispatchKey)) {
        details.push({ template: templateName, recipient: maskEmail(recipient.email), dispatch_key: dispatchKey, status: 'skipped', reason: 'already_dispatched' });
        skipped++;
        continue;
      }

      const businessName = await getBusinessName(admin, ctx.business_id);

      let templateData: Record<string, unknown> = {};
      if (templateName === 'membership-subscription-expired') {
        templateData = {
          recipientName: recipient.name ?? '',
          businessName: businessName ?? '',
          oldTier: ctx.plan_tier ?? '',
          newTier: ctx.downgrade_to_tier ?? 'free',
          expiresAt: isoDateOnly(ctx.expires_at) ?? '',
        };
      } else if (templateName === 'membership-renewal-failed') {
        templateData = {
          recipientName: recipient.name ?? '',
          businessName: businessName ?? '',
          tierName: planLabel(ctx),
          gracePeriodUntil: isoDateOnly(ctx.grace_period_until) ?? '',
          downgradeToTier: ctx.downgrade_to_tier ?? 'free',
        };
      } else if (templateName === 'membership-renewal-reminder') {
        const computed = daysBetween(now, ctx.expires_at);
        templateData = {
          recipientName: recipient.name ?? '',
          businessName: businessName ?? '',
          tierName: planLabel(ctx),
          daysRemaining: computed ?? daysBefore ?? 0,
          expiresAt: isoDateOnly(ctx.expires_at) ?? '',
        };
      }

      if (dryRun) {
        details.push({ template: templateName, recipient: maskEmail(recipient.email), dispatch_key: dispatchKey, status: 'skipped', reason: 'dry_run' });
        skipped++;
        continue;
      }

      await recordDispatchMarker(admin, {
        templateName,
        recipient: recipient.email,
        dispatchKey,
        referenceType: refType,
        referenceId: subId,
      });

      const result = await invokeSendTransactionalEmail(
        {
          templateName,
          recipientEmail: recipient.email,
          idempotencyKey: dispatchKey,
          templateData,
        },
        serviceKey,
        supabaseUrl,
      );

      if (result.ok) {
        sent++;
        details.push({ template: templateName, recipient: maskEmail(recipient.email), dispatch_key: dispatchKey, status: 'sent' });
      } else {
        failed++;
        details.push({ template: templateName, recipient: maskEmail(recipient.email), dispatch_key: dispatchKey, status: 'failed', reason: `status_${result.status}` });
        console.warn('lifecycle-dispatcher: send failed', { templateName, status: result.status, error: result.error });
      }
    } catch (err) {
      failed++;
      details.push({ template: templateName, recipient: '?', dispatch_key: dispatchKey || `pending-${subId}`, status: 'failed', reason: err instanceof Error ? err.message : 'unknown_error' });
    }
  }

  // ── 2. Promo redemptions ─────────────────────────────────────────────────
  try {
    const promoSince = new Date(now.getTime() - PROMO_WINDOW_HOURS * 3600000).toISOString();
    const redemptions = await fetchRecentPromoRedemptions(admin, promoSince);
    for (const r of redemptions) {
      processed++;
      const dispatchKey = `membership-promo-redeemed-${r.redemption_id}`;
      try {
        const recipient = await getRecipientForUser(admin, r.user_id);
        if (!recipient.email) {
          details.push({ template: 'membership-promo-redeemed', recipient: '?', dispatch_key: dispatchKey, status: 'skipped', reason: 'no_recipient_email' });
          skipped++;
          continue;
        }
        if (await alreadyDispatched(admin, dispatchKey)) {
          details.push({ template: 'membership-promo-redeemed', recipient: maskEmail(recipient.email), dispatch_key: dispatchKey, status: 'skipped', reason: 'already_dispatched' });
          skipped++;
          continue;
        }

        let expiresAt = '';
        let tierName = r.target_tier ?? '';
        if (r.applied_subscription_id) {
          const ctx = await fetchLifecycleSubscriptionContext(admin, r.applied_subscription_id);
          if (ctx) {
            expiresAt = isoDateOnly(ctx.expires_at) ?? '';
            tierName = planLabel(ctx) || tierName;
          }
        }
        const businessName = await getBusinessName(admin, r.business_id);

        const templateData = {
          recipientName: recipient.name ?? '',
          businessName: businessName ?? '',
          promoCode: r.promo_code,
          tierName,
          expiresAt,
        };

        if (dryRun) {
          details.push({ template: 'membership-promo-redeemed', recipient: maskEmail(recipient.email), dispatch_key: dispatchKey, status: 'skipped', reason: 'dry_run' });
          skipped++;
          continue;
        }

        await recordDispatchMarker(admin, {
          templateName: 'membership-promo-redeemed',
          recipient: recipient.email,
          dispatchKey,
          referenceType: 'membership_promo_redemption',
          referenceId: r.redemption_id,
        });

        const result = await invokeSendTransactionalEmail(
          {
            templateName: 'membership-promo-redeemed',
            recipientEmail: recipient.email,
            idempotencyKey: dispatchKey,
            templateData,
          },
          serviceKey,
          supabaseUrl,
        );

        if (result.ok) {
          sent++;
          details.push({ template: 'membership-promo-redeemed', recipient: maskEmail(recipient.email), dispatch_key: dispatchKey, status: 'sent' });
        } else {
          failed++;
          details.push({ template: 'membership-promo-redeemed', recipient: maskEmail(recipient.email), dispatch_key: dispatchKey, status: 'failed', reason: `status_${result.status}` });
          console.warn('lifecycle-dispatcher: promo send failed', { status: result.status, error: result.error });
        }
      } catch (err) {
        failed++;
        details.push({ template: 'membership-promo-redeemed', recipient: '?', dispatch_key: dispatchKey, status: 'failed', reason: err instanceof Error ? err.message : 'unknown_error' });
      }
    }
  } catch (err) {
    console.warn('lifecycle-dispatcher: promo block failed', err);
  }

  // EDGE-CRON-OBSERVABILITY-2: best-effort cron run log. Never store
  // recipient emails, payloads, tokens, or raw errors — only safe counts.
  // Logging failure must NEVER fail the dispatcher response.
  try {
    await admin.rpc('log_cron_run', {
      _job_name: 'membership-lifecycle-dispatcher',
      _function_name: 'membership-lifecycle-dispatcher',
      _started_at: runStartedAt,
      _finished_at: new Date().toISOString(),
      _ok: failed === 0,
      _status: dryRun ? 'dry-run' : 'completed',
      _summary: {
        dry_run: dryRun,
        processed,
        sent,
        skipped,
        failed,
        error_count: failed,
      },
      _error_code: null,
      _error_message: null,
    });
  } catch (_logErr) {
    // swallow — observability must never break cron success
  }

  return new Response(
    JSON.stringify({ success: true, dryRun, processed, sent, skipped, failed, details }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
