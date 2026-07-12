/**
 * R3 — Sample track services. Thin, RLS-respecting Supabase calls.
 */
import { supabase } from '@/integrations/supabase/client';
import { createNotification } from '@/modules/notifications';
import type { RfqSamplePhoto, RfqSampleRow } from './types';

const BUCKET = 'rfq-sample-photos';

async function logEvent(
  quoteRequestId: string,
  type: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from('quote_request_events').insert({
      quote_request_id: quoteRequestId,
      event_type: type,
      actor_user_id: auth?.user?.id ?? null,
      metadata: metadata as unknown as never,
    });
  } catch {
    /* best-effort */
  }
}

async function safeNotify(
  userId: string | null | undefined,
  args: {
    type: string;
    titleAr: string;
    titleEn: string;
    bodyAr: string;
    bodyEn: string;
    referenceId?: string | null;
    referenceType?: string;
  },
): Promise<void> {
  if (!userId) return;
  try {
    await createNotification({
      user_id: userId,
      notification_type: args.type,
      title_ar: args.titleAr,
      title_en: args.titleEn,
      body_ar: args.bodyAr,
      body_en: args.bodyEn,
      reference_id: args.referenceId ?? null,
      reference_type: args.referenceType,
    });
  } catch {
    /* best-effort */
  }
}

/** List every sample recorded for an opportunity (RLS gates viewers). */
export async function listSamplesForOpportunity(
  opportunityId: string,
): Promise<RfqSampleRow[]> {
  const { data, error } = await supabase
    .from('rfq_samples')
    .select('*')
    .eq('quote_request_id', opportunityId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as RfqSampleRow[];
}

/** Active (non-rejected) sample for a specific bid, if any. */
export async function getActiveSampleForBid(
  opportunityId: string,
  bidId: string,
): Promise<RfqSampleRow | null> {
  const { data, error } = await supabase
    .from('rfq_samples')
    .select('*')
    .eq('quote_request_id', opportunityId)
    .eq('bid_id', bidId)
    .neq('status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as RfqSampleRow | null) ?? null;
}

/** Client requests a sample for the awarded bid. Also flips requires_sample=true. */
export async function requestSample(input: {
  opportunityId: string;
  bidId: string;
  providerBusinessId: string | null;
  requestedBy: string;
  providerUserId?: string | null;
}): Promise<RfqSampleRow> {
  const { data, error } = await supabase
    .from('rfq_samples')
    .insert({
      quote_request_id: input.opportunityId,
      bid_id: input.bidId,
      provider_business_id: input.providerBusinessId,
      requested_by: input.requestedBy,
      status: 'requested',
    })
    .select('*')
    .single();
  if (error) throw error;

  try {
    await supabase
      .from('quote_requests')
      .update({ requires_sample: true })
      .eq('id', input.opportunityId);
  } catch {
    /* best-effort */
  }

  await logEvent(input.opportunityId, 'sample.requested', {
    sample_id: data.id,
    bid_id: input.bidId,
  });
  await safeNotify(input.providerUserId ?? null, {
    type: 'rfq_sample_requested',
    titleAr: 'طلب عينة قبل التعاقد',
    titleEn: 'Sample requested before contracting',
    bodyAr: 'طلب العميل عينة من المنتج قبل تحويل العرض إلى عقد.',
    bodyEn: 'The client requested a product sample before signing the contract.',
    referenceId: data.id,
    referenceType: 'rfq_sample',
  });
  return data as RfqSampleRow;
}

/** Provider marks the sample as shipped with optional tracking + photos. */
export async function markShipped(input: {
  sampleId: string;
  opportunityId: string;
  trackingRef?: string | null;
  addedPhotos?: RfqSamplePhoto[];
  ownerUserId?: string | null;
}): Promise<RfqSampleRow> {
  // Merge photos client-side (RLS still applies).
  const { data: current } = await supabase
    .from('rfq_samples')
    .select('photos')
    .eq('id', input.sampleId)
    .maybeSingle();
  const existingPhotos = Array.isArray(current?.photos)
    ? (current!.photos as unknown as RfqSamplePhoto[])
    : [];
  const nextPhotos = [...existingPhotos, ...(input.addedPhotos ?? [])];

  const { data, error } = await supabase
    .from('rfq_samples')
    .update({
      status: 'shipped',
      shipped_at: new Date().toISOString(),
      tracking_ref: input.trackingRef ?? null,
      photos: nextPhotos as unknown as never,
    })
    .eq('id', input.sampleId)
    .select('*')
    .single();
  if (error) throw error;

  await logEvent(input.opportunityId, 'sample.shipped', {
    sample_id: input.sampleId,
    tracking_ref: input.trackingRef ?? null,
  });
  await safeNotify(input.ownerUserId ?? null, {
    type: 'rfq_sample_shipped',
    titleAr: 'تم شحن العينة',
    titleEn: 'Sample shipped',
    bodyAr: input.trackingRef
      ? `شحن المورّد العينة. رقم التتبع: ${input.trackingRef}`
      : 'شحن المورّد العينة إليك.',
    bodyEn: input.trackingRef
      ? `Provider shipped the sample. Tracking: ${input.trackingRef}`
      : 'The provider shipped the sample.',
    referenceId: input.sampleId,
    referenceType: 'rfq_sample',
  });
  return data as RfqSampleRow;
}

/** Client confirms receipt of the sample (moves to pending decision). */
export async function markReceived(input: {
  sampleId: string;
  opportunityId: string;
}): Promise<RfqSampleRow> {
  const { data, error } = await supabase
    .from('rfq_samples')
    .update({
      status: 'received',
      received_at: new Date().toISOString(),
    })
    .eq('id', input.sampleId)
    .select('*')
    .single();
  if (error) throw error;
  await logEvent(input.opportunityId, 'sample.received', {
    sample_id: input.sampleId,
  });
  return data as RfqSampleRow;
}

/** Client decides on the sample (approve / reject) with optional notes. */
export async function decideSample(input: {
  sampleId: string;
  opportunityId: string;
  approve: boolean;
  notes?: string | null;
  decisionBy: string;
  providerUserId?: string | null;
}): Promise<RfqSampleRow> {
  const nextStatus = input.approve ? 'approved' : 'rejected';
  const { data, error } = await supabase
    .from('rfq_samples')
    .update({
      status: nextStatus,
      decision_at: new Date().toISOString(),
      decision_by: input.decisionBy,
      decision_notes: input.notes?.trim() || null,
    })
    .eq('id', input.sampleId)
    .select('*')
    .single();
  if (error) throw error;

  await logEvent(
    input.opportunityId,
    input.approve ? 'sample.approved' : 'sample.rejected',
    { sample_id: input.sampleId, notes: input.notes?.trim() || null },
  );
  await safeNotify(input.providerUserId ?? null, {
    type: input.approve ? 'rfq_sample_approved' : 'rfq_sample_rejected',
    titleAr: input.approve ? 'تم اعتماد العينة' : 'تم رفض العينة',
    titleEn: input.approve ? 'Sample approved' : 'Sample rejected',
    bodyAr: input.approve
      ? 'اعتمد العميل العينة — يمكن الآن تحويل العرض إلى عقد.'
      : `رفض العميل العينة${input.notes ? ` — ${input.notes}` : ''}.`,
    bodyEn: input.approve
      ? 'The client approved the sample — the contract can now be created.'
      : `The client rejected the sample${input.notes ? ` — ${input.notes}` : ''}.`,
    referenceId: input.sampleId,
    referenceType: 'rfq_sample',
  });
  return data as RfqSampleRow;
}

/**
 * Upload a sample photo to the private `rfq-sample-photos` bucket under
 * `<sample_id>/<timestamp>-<name>`. Returns the storage path (call
 * getSampleSignedUrl to render).
 */
export async function uploadSamplePhoto(
  sampleId: string,
  file: File,
): Promise<RfqSamplePhoto> {
  const safeName = file.name.replace(/[^\w.\-]+/g, '_');
  const path = `${sampleId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data: auth } = await supabase.auth.getUser();
  return {
    path,
    uploaded_at: new Date().toISOString(),
    uploaded_by: auth?.user?.id ?? null,
    file_name: file.name,
  };
}

export async function getSampleSignedUrl(
  path: string,
  ttlSeconds = 300,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, ttlSeconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}