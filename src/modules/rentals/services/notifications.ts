/**
 * RENTAL-MICROSERVICE-2 — notification wrapper for rental lifecycle events.
 *
 * Wraps `@/modules/notifications` so the rental microservice never inserts
 * into `public.notifications` directly. In-app only; email is delegated to
 * the existing transactional pipeline when supported.
 *
 * Metadata contract (matches the Reference-Resolver coverage doc):
 *   - rental_order_ref (RORD-NNNNNNN)
 *   - business_ref (USR-/BIZ-…)
 *   - days_remaining | days_overdue
 *   - NO raw UUIDs in title/body — refs only
 */
import { createNotificationFireAndForget } from '@/modules/notifications';

export type RentalEvent =
  | 'rental.started'
  | 'rental.expiring_soon'
  | 'rental.expired'
  | 'rental.overdue'
  | 'rental.extension_requested'
  | 'rental.extension_approved'
  | 'rental.closed';

export interface RentalNotifyArgs {
  /** Recipient. */
  user_id: string;
  event: RentalEvent;
  rental_order_ref: string;
  business_ref?: string;
  days_remaining?: number;
  days_overdue?: number;
}

const COPY: Record<RentalEvent, { title_ar: (a: RentalNotifyArgs) => string; title_en: (a: RentalNotifyArgs) => string; body_ar: (a: RentalNotifyArgs) => string; body_en: (a: RentalNotifyArgs) => string; type: string }> = {
  'rental.started': {
    type: 'rental_started',
    title_ar: (a) => `بدأ طلب التأجير ${a.rental_order_ref}`,
    title_en: (a) => `Rental ${a.rental_order_ref} started`,
    body_ar: () => 'يمكنك متابعة الطلب من لوحة التأجير.',
    body_en: () => 'Track the order from your rentals dashboard.',
  },
  'rental.expiring_soon': {
    type: 'rental_expiring_soon',
    title_ar: (a) => `${a.rental_order_ref} يقترب من الانتهاء`,
    title_en: (a) => `${a.rental_order_ref} expiring soon`,
    body_ar: (a) => `متبقي ${a.days_remaining ?? 0} يوم.`,
    body_en: (a) => `${a.days_remaining ?? 0} day(s) remaining.`,
  },
  'rental.expired': {
    type: 'rental_expired',
    title_ar: (a) => `${a.rental_order_ref} انتهى`,
    title_en: (a) => `${a.rental_order_ref} expired`,
    body_ar: () => 'يمكنك التمديد أو الإغلاق.',
    body_en: () => 'You can renew, extend, or close.',
  },
  'rental.overdue': {
    type: 'rental_overdue',
    title_ar: (a) => `${a.rental_order_ref} متأخر بـ ${a.days_overdue ?? 0} يوم`,
    title_en: (a) => `${a.rental_order_ref} overdue by ${a.days_overdue ?? 0} day(s)`,
    body_ar: () => 'قد يتم تطبيق شروط جزائية وفق الاتفاقية.',
    body_en: () => 'Late terms may apply per agreement.',
  },
  'rental.extension_requested': {
    type: 'rental_extension_requested',
    title_ar: (a) => `طلب تمديد على ${a.rental_order_ref}`,
    title_en: (a) => `Extension requested on ${a.rental_order_ref}`,
    body_ar: () => 'بانتظار الموافقة المتبادلة.',
    body_en: () => 'Awaiting mutual approval.',
  },
  'rental.extension_approved': {
    type: 'rental_extension_approved',
    title_ar: (a) => `تمت الموافقة على تمديد ${a.rental_order_ref}`,
    title_en: (a) => `Extension approved for ${a.rental_order_ref}`,
    body_ar: () => 'تم تحديث تاريخ الانتهاء.',
    body_en: () => 'End date updated.',
  },
  'rental.closed': {
    type: 'rental_closed',
    title_ar: (a) => `${a.rental_order_ref} مغلق`,
    title_en: (a) => `${a.rental_order_ref} closed`,
    body_ar: () => 'تم إغلاق الطلب بنجاح.',
    body_en: () => 'Order closed successfully.',
  },
};

/** Fire-and-forget rental notification dispatcher (in-app channel). */
export function notifyRental(args: RentalNotifyArgs): void {
  const spec = COPY[args.event];
  if (!spec || !args.user_id) return;
  createNotificationFireAndForget(
    {
      user_id: args.user_id,
      notification_type: spec.type,
      title_ar: spec.title_ar(args),
      title_en: spec.title_en(args),
      body_ar: spec.body_ar(args),
      body_en: spec.body_en(args),
      reference_type: 'rental_order',
      reference_id: args.rental_order_ref,
      action_url: `/dashboard/rentals?order=${encodeURIComponent(args.rental_order_ref)}`,
    },
    '[rentals.notify]',
  );
}

/** List of all rental event keys — used by ops audits and tests. */
export const RENTAL_EVENTS: RentalEvent[] = [
  'rental.started',
  'rental.expiring_soon',
  'rental.expired',
  'rental.overdue',
  'rental.extension_requested',
  'rental.extension_approved',
  'rental.closed',
];