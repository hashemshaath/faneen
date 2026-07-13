/**
 * T5 — rental returns / pickup / damages service layer.
 *
 * All calls go through RLS. The customer acknowledgement/dispute path uses
 * the SECURITY DEFINER RPC `acknowledge_rental_return` so we can restrict
 * customer writes to only the ack fields without needing a column-level
 * UPDATE policy.
 */
import { supabase } from '@/integrations/supabase/client';
import { createNotificationFireAndForget } from '@/modules/notifications';
import type { ServiceResult } from '../types';
import { closeOrder, logOrderEvent } from './orders';

export type RentalReturnCondition = 'good' | 'damaged' | 'missing_parts';

export interface RentalReturnPhoto {
  path: string;              // storage path in `rental-return-photos`
  file_name?: string | null;
  uploaded_at?: string;
  uploaded_by?: string | null;
}

export interface RentalReturn {
  id: string;
  rental_order_id: string;
  returned_at: string;
  condition: RentalReturnCondition;
  damage_description: string | null;
  damage_amount: number;
  deposit_refunded: number | null;
  photos: RentalReturnPhoto[];
  provider_notes: string | null;
  customer_ack: boolean;
  customer_ack_at: string | null;
  customer_dispute_note: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const BUCKET = 'rental-return-photos';

export async function getReturnForOrder(
  rentalOrderId: string,
): Promise<ServiceResult<RentalReturn>> {
  const { data, error } = await supabase
    .from('rental_returns')
    .select('*')
    .eq('rental_order_id', rentalOrderId)
    .maybeSingle();
  return { data: (data as unknown as RentalReturn | null) ?? null, error: error as Error | null };
}

export interface CreateReturnInput {
  rental_order_id: string;
  condition: RentalReturnCondition;
  damage_description?: string | null;
  damage_amount?: number;
  deposit_refunded?: number | null;
  provider_notes?: string | null;
  /** Optional pre-uploaded photo metadata (path in `rental-return-photos`). */
  photos?: RentalReturnPhoto[];
}

/**
 * Provider records the return then closes the order.
 *
 * Flow:
 *   1. INSERT rental_returns (RLS: must be provider staff, created_by = auth.uid())
 *   2. Log `return.recorded` event on rental_order_events
 *   3. closeOrder() — flips status → 'closed', emits `rental.closed`
 *   4. Send a rich `rental_return_recorded` notification to the customer so
 *      the dashboard surfaces the damage/deposit summary directly.
 *      (rental.closed already fires; this second notification carries the
 *      condition + refund info that matters at close time.)
 */
export async function recordReturnAndClose(
  input: CreateReturnInput,
): Promise<ServiceResult<{ returnRow: RentalReturn; orderClosed: boolean }>> {
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData?.user?.id;
  if (!uid) return { data: null, error: new Error('unauthenticated') };

  const damage = Math.max(0, Number(input.damage_amount ?? 0));
  const refund = input.deposit_refunded == null ? null : Math.max(0, Number(input.deposit_refunded));

  const insertRow = {
    rental_order_id: input.rental_order_id,
    condition: input.condition,
    damage_description: input.damage_description ?? null,
    damage_amount: damage,
    deposit_refunded: refund,
    photos: (input.photos ?? []) as never,
    provider_notes: input.provider_notes ?? null,
    created_by: uid,
  } as never;

  const { data, error } = await supabase
    .from('rental_returns')
    .insert(insertRow)
    .select('*')
    .single();
  if (error || !data) return { data: null, error: (error as Error) ?? new Error('insert failed') };

  const returnRow = data as unknown as RentalReturn;

  // Log return.recorded (before closeOrder emits order.closed).
  await logOrderEvent(input.rental_order_id, 'return.recorded', {
    return_id: returnRow.id,
    condition: returnRow.condition,
    damage_amount: returnRow.damage_amount,
    deposit_refunded: returnRow.deposit_refunded,
  });

  // Close order (idempotent).
  const { error: closeErr, data: order } = await closeOrder(input.rental_order_id);
  if (closeErr) return { data: null, error: closeErr as Error };

  // Customer-facing summary notification.
  if (order?.customer_user_id) {
    const isClean = returnRow.condition === 'good';
    const conditionAr =
      returnRow.condition === 'good' ? 'سليمة' :
      returnRow.condition === 'damaged' ? 'متضررة' : 'نواقص';
    const conditionEn =
      returnRow.condition === 'good' ? 'good' :
      returnRow.condition === 'damaged' ? 'damaged' : 'missing parts';
    createNotificationFireAndForget(
      {
        user_id: order.customer_user_id,
        notification_type: 'rental_return_recorded',
        title_ar: `تم تسجيل إرجاع ${order.ref_id}`,
        title_en: `Return recorded for ${order.ref_id}`,
        body_ar: isClean
          ? `تم استلام المعدة بحالة ${conditionAr}. يرجى تأكيد الاستلام.`
          : `تم تسجيل الإرجاع بحالة ${conditionAr} — الرجاء المراجعة والتأكيد.`,
        body_en: isClean
          ? `Equipment returned in ${conditionEn} condition. Please confirm receipt.`
          : `Return recorded as ${conditionEn}. Please review and confirm.`,
        reference_type: 'rental_order',
        reference_id: order.ref_id,
        action_url: `/dashboard/my-rentals/${encodeURIComponent(order.ref_id)}`,
      },
      '[rentals.return.recorded]',
    );
  }

  return { data: { returnRow, orderClosed: true }, error: null };
}

/** Customer acknowledgement — success path via SECURITY DEFINER RPC. */
export async function customerAcknowledgeReturn(
  returnId: string,
): Promise<ServiceResult<RentalReturn>> {
  const { data, error } = await supabase.rpc('acknowledge_rental_return' as never, {
    p_return_id: returnId,
    p_dispute_note: null,
  } as never);
  return { data: (data as unknown as RentalReturn | null) ?? null, error: error as Error | null };
}

/**
 * Customer dispute — sets `customer_dispute_note` via the same RPC and
 * fans out notifications to provider staff owner + admin so someone can
 * mediate.
 */
export async function customerDisputeReturn(
  returnId: string,
  disputeNote: string,
  ctx: { rental_order_ref: string; provider_owner_user_id?: string | null; provider_business_ref?: string | null },
): Promise<ServiceResult<RentalReturn>> {
  const trimmed = (disputeNote || '').trim();
  if (trimmed.length < 3) return { data: null, error: new Error('dispute_note_required') };

  const { data, error } = await supabase.rpc('acknowledge_rental_return' as never, {
    p_return_id: returnId,
    p_dispute_note: trimmed,
  } as never);
  if (error) return { data: null, error: error as Error };

  const row = (data as unknown as RentalReturn | null) ?? null;

  // Notify the provider owner (best-effort).
  if (ctx.provider_owner_user_id) {
    createNotificationFireAndForget(
      {
        user_id: ctx.provider_owner_user_id,
        notification_type: 'rental_return_disputed',
        title_ar: `اعتراض على إرجاع ${ctx.rental_order_ref}`,
        title_en: `Return disputed on ${ctx.rental_order_ref}`,
        body_ar: trimmed,
        body_en: trimmed,
        reference_type: 'rental_order',
        reference_id: ctx.rental_order_ref,
        action_url: `/dashboard/rentals?order=${encodeURIComponent(ctx.rental_order_ref)}`,
      },
      '[rentals.return.disputed.provider]',
    );
  }

  // Notify admins so they can mediate.
  try {
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');
    (admins as Array<{ user_id: string }> | null)?.forEach((a) => {
      createNotificationFireAndForget(
        {
          user_id: a.user_id,
          notification_type: 'rental_return_disputed',
          title_ar: `اعتراض عميل على إرجاع ${ctx.rental_order_ref}`,
          title_en: `Customer dispute on return ${ctx.rental_order_ref}`,
          body_ar: trimmed,
          body_en: trimmed,
          reference_type: 'rental_order',
          reference_id: ctx.rental_order_ref,
          action_url: `/admin/rentals?order=${encodeURIComponent(ctx.rental_order_ref)}`,
        },
        '[rentals.return.disputed.admin]',
      );
    });
  } catch { /* best-effort */ }

  return { data: row, error: null };
}

/** Upload a photo to `rental-return-photos/<return_id>/…` */
export async function uploadReturnPhoto(
  returnId: string,
  file: File,
): Promise<ServiceResult<RentalReturnPhoto>> {
  const safe = file.name.replace(/[^\w.\-]+/g, '_');
  const path = `${returnId}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type,
  });
  if (error) return { data: null, error: error as Error };
  const { data: auth } = await supabase.auth.getUser();
  return {
    data: {
      path,
      file_name: file.name,
      uploaded_at: new Date().toISOString(),
      uploaded_by: auth?.user?.id ?? null,
    },
    error: null,
  };
}

/** Add photos to an existing return row (provider only via RLS). */
export async function appendReturnPhotos(
  returnId: string,
  newPhotos: RentalReturnPhoto[],
): Promise<ServiceResult<RentalReturn>> {
  const { data: current } = await supabase
    .from('rental_returns')
    .select('photos')
    .eq('id', returnId)
    .maybeSingle();
  const existing = ((current as unknown as { photos?: RentalReturnPhoto[] } | null)?.photos ?? []) as RentalReturnPhoto[];
  const merged = [...existing, ...newPhotos];
  const { data, error } = await supabase
    .from('rental_returns')
    .update({ photos: merged as never })
    .eq('id', returnId)
    .select('*')
    .single();
  return { data: (data as unknown as RentalReturn | null) ?? null, error: error as Error | null };
}

export async function getPhotoSignedUrl(path: string, ttlSeconds = 300): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, ttlSeconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export { BUCKET as RENTAL_RETURN_PHOTOS_BUCKET };