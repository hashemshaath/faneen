/**
 * P2.1 — Best-effort email wiring for opportunity lifecycle events.
 *
 * These helpers wrap `sendTransactionalEmail` so callers can fire and
 * forget: every helper swallows its own errors and never throws into
 * the primary business action. Idempotency keys are deterministic per
 * (event, entity) so retries/UI double-clicks never produce duplicate
 * sends. Recipient resolution mirrors the pattern used by
 * `notify-supplier-lead` (business owner via
 * `getBusinessProviderContactForEmail`).
 */
import { supabase } from '@/integrations/supabase/client';
import { sendTransactionalEmail } from '@/modules/notifications/services/sendTransactionalEmail';
import { getBusinessProviderContactForEmail } from '@/modules/businesses/services/getBusinessProviderContactForEmail';
import { getProfileByUserId } from '@/modules/users/services/getProfileByUserId';

const SITE_BASE = 'https://qitaat.com';

interface QuoteRequestLite {
  id: string;
  ref_id: string | null;
  user_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
}

async function fetchOpportunity(opportunityId: string): Promise<QuoteRequestLite | null> {
  try {
    const { data } = await supabase
      .from('quote_requests')
      .select('id, ref_id, user_id, customer_email, customer_name')
      .eq('id', opportunityId)
      .maybeSingle();
    return (data as QuoteRequestLite | null) ?? null;
  } catch {
    return null;
  }
}

/** Resolve the client email from `customer_email` (already collected) then
 *  the RFQ owner's profile as fallback. */
async function resolveClientEmail(qr: QuoteRequestLite): Promise<string | null> {
  const direct = qr.customer_email?.trim();
  if (direct) return direct;
  if (!qr.user_id) return null;
  try {
    const { data } = await getProfileByUserId<{ email: string | null }>({
      userId: qr.user_id,
      select: 'email',
    });
    return data?.email?.trim() || null;
  } catch {
    return null;
  }
}

async function safeInvoke(
  templateName: string,
  recipientEmail: string,
  idempotencyKey: string,
  templateData: Record<string, unknown>,
): Promise<void> {
  try {
    const res = await sendTransactionalEmail({
      templateName,
      recipientEmail,
      idempotencyKey,
      templateData,
    });
    const err = (res as { error?: { message?: string } } | null)?.error;
    if (err) console.warn(`[opp-email] ${templateName} failed:`, err.message ?? 'unknown');
  } catch (e) {
    console.warn(`[opp-email] ${templateName} threw:`, e instanceof Error ? e.message : 'unknown');
  }
}

/** Client-side email after a provider submits a bid on an opportunity. */
export async function sendOpportunityBidSubmittedEmail(args: {
  opportunityId: string;
  bidId: string;
  providerBusinessId?: string | null;
  priceAmount?: number | null;
  currency?: string | null;
}): Promise<void> {
  try {
    const qr = await fetchOpportunity(args.opportunityId);
    if (!qr) return;
    const email = await resolveClientEmail(qr);
    if (!email) return;
    let providerName: string | undefined;
    if (args.providerBusinessId) {
      const { businessName } = await getBusinessProviderContactForEmail({
        businessId: args.providerBusinessId,
      });
      providerName = businessName;
    }
    const price = args.priceAmount != null && args.currency
      ? `${args.priceAmount.toLocaleString()} ${args.currency}`
      : undefined;
    await safeInvoke(
      'opportunity-bid-submitted-client',
      email,
      `opp-bid-submitted-${args.bidId}`,
      {
        ref: qr.ref_id ?? args.opportunityId,
        customerName: qr.customer_name ?? undefined,
        providerName,
        price,
        url: `${SITE_BASE}/dashboard/my-requests/${args.opportunityId}`,
      },
    );
  } catch {
    /* best-effort */
  }
}

/** Winner + loser emails triggered when an award is confirmed. */
export async function sendOpportunityAwardEmails(args: {
  opportunityId: string;
  winningBidId: string;
}): Promise<void> {
  try {
    const qr = await fetchOpportunity(args.opportunityId);
    if (!qr) return;
    const { data: bid } = await supabase
      .from('opportunity_bids')
      .select('id, submitted_by, provider_business_id')
      .eq('id', args.winningBidId)
      .maybeSingle();
    if (!bid) return;
    const winnerBusinessId = (bid as { provider_business_id?: string | null }).provider_business_id ?? null;
    if (winnerBusinessId) {
      const { providerEmail, businessName } = await getBusinessProviderContactForEmail({
        businessId: winnerBusinessId,
        contractProviderUserId: (bid as { submitted_by?: string | null }).submitted_by ?? null,
      });
      if (providerEmail) {
        await safeInvoke(
          'opportunity-bid-awarded-provider',
          providerEmail,
          `opp-awarded-${args.winningBidId}`,
          {
            ref: qr.ref_id ?? args.opportunityId,
            businessName,
            url: `${SITE_BASE}/dashboard/opportunities/${args.opportunityId}`,
          },
        );
      }
    }
  } catch {
    /* best-effort */
  }
}

/** Notify a single losing bidder. Called inside notifyLosingBiddersAfterAward. */
export async function sendOpportunityLossEmail(args: {
  opportunityId: string;
  losingBidId: string;
  providerBusinessId?: string | null;
  submittedBy?: string | null;
  refId?: string | null;
}): Promise<void> {
  try {
    if (!args.providerBusinessId && !args.submittedBy) return;
    let providerEmail: string | undefined;
    let businessName: string | undefined;
    if (args.providerBusinessId) {
      const c = await getBusinessProviderContactForEmail({
        businessId: args.providerBusinessId,
        contractProviderUserId: args.submittedBy ?? null,
      });
      providerEmail = c.providerEmail;
      businessName = c.businessName;
    } else if (args.submittedBy) {
      const { data } = await getProfileByUserId<{ email: string | null }>({
        userId: args.submittedBy,
        select: 'email',
      });
      providerEmail = data?.email ?? undefined;
    }
    if (!providerEmail) return;
    await safeInvoke(
      'opportunity-bid-not-awarded-provider',
      providerEmail,
      `opp-award-lost-${args.losingBidId}`,
      {
        ref: args.refId ?? args.opportunityId,
        businessName,
        url: `${SITE_BASE}/dashboard/opportunities/${args.opportunityId}`,
      },
    );
  } catch {
    /* best-effort */
  }
}

/** Both-party emails after the awarded bid converts to a draft contract. */
export async function sendOpportunityContractCreatedEmails(args: {
  opportunityId: string;
  contractId: string;
  contractRef?: string | null;
}): Promise<void> {
  try {
    const qr = await fetchOpportunity(args.opportunityId);
    if (!qr) return;
    // Winning bid + provider.
    const { data: qrRow } = await supabase
      .from('quote_requests')
      .select('awarded_bid_id')
      .eq('id', args.opportunityId)
      .maybeSingle();
    const awardedBidId = (qrRow as { awarded_bid_id?: string | null } | null)?.awarded_bid_id ?? null;
    let providerEmail: string | undefined;
    let businessName: string | undefined;
    if (awardedBidId) {
      const { data: bid } = await supabase
        .from('opportunity_bids')
        .select('submitted_by, provider_business_id')
        .eq('id', awardedBidId)
        .maybeSingle();
      const bizId = (bid as { provider_business_id?: string | null } | null)?.provider_business_id ?? null;
      if (bizId) {
        const c = await getBusinessProviderContactForEmail({
          businessId: bizId,
          contractProviderUserId:
            (bid as { submitted_by?: string | null } | null)?.submitted_by ?? null,
        });
        providerEmail = c.providerEmail;
        businessName = c.businessName;
      }
    }
    const contractRef = args.contractRef ?? null;
    const clientEmail = await resolveClientEmail(qr);
    if (clientEmail) {
      await safeInvoke(
        'opportunity-contract-created-client',
        clientEmail,
        `opp-contract-created-client-${args.contractId}`,
        {
          ref: qr.ref_id ?? args.opportunityId,
          contractRef,
          customerName: qr.customer_name ?? undefined,
          url: `${SITE_BASE}/dashboard/contracts/${args.contractId}/review`,
        },
      );
    }
    if (providerEmail) {
      await safeInvoke(
        'opportunity-contract-created-provider',
        providerEmail,
        `opp-contract-created-provider-${args.contractId}`,
        {
          ref: qr.ref_id ?? args.opportunityId,
          contractRef,
          businessName,
          url: `${SITE_BASE}/dashboard/contracts/${args.contractId}/review`,
        },
      );
    }
  } catch {
    /* best-effort */
  }
}