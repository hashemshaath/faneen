/**
 * BUSINESS-CORE-4 — Bilingual labels for work_orders.source_type values.
 *
 * Source linkage is presentational only at this phase — we surface where a
 * work order originated (lead, quote, contract, manual). No navigation,
 * no joins; the row's `source_id` is shown via <ReferenceBadge> when it
 * resolves to a known ref prefix later.
 */
import type { BiLabel } from "./statusHelpers";

export const WORK_ORDER_SOURCE_LABELS: Record<string, BiLabel> = {
  manual:   { ar: "يدوي",            en: "Manual" },
  lead:     { ar: "طلب خدمة",        en: "Lead" },
  quote:    { ar: "عرض سعر",         en: "Quote" },
  contract: { ar: "عقد",             en: "Contract" },
  booking:  { ar: "حجز موعد",        en: "Booking" },
};

export function getWorkOrderSourceLabel(
  sourceType: string | null | undefined,
  isRTL: boolean,
): string {
  if (!sourceType) return isRTL ? "يدوي" : "Manual";
  const entry = WORK_ORDER_SOURCE_LABELS[sourceType];
  if (!entry) return sourceType;
  return isRTL ? entry.ar : entry.en;
}