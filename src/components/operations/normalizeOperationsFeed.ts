/**
 * BUSINESS-CORE-12 — Unified Operations Feed normalizer.
 *
 * Pure helper. Converts `business_audit_log` rows (read via the
 * `listBusinessActivityTimeline` wrapper) into a presentational shape:
 *   - bilingual label (no UUIDs)
 *   - primary reference badge (WO-/TASK-/CNT-/QTE-/LED-/BKG-)
 *   - optional source reference (cross-link via /r/{ref})
 *   - icon key + tone for the UI
 *   - grouped by calendar day
 *
 * Unknown / unsupported actions are tagged as `generic` so we never silently
 * drop history, but we also never expose raw UUIDs as references.
 */
import type { BusinessActivityEvent } from "@/modules/businesses/notes";

/** Official ref pattern: PREFIX-IDENTIFIER (no UUIDs). */
export const OFFICIAL_REF = /^[A-Z]{2,6}-[A-Z0-9]+$/;

export type OperationsFeedIconKey =
  | "created"
  | "updated"
  | "stage"
  | "task"
  | "comment"
  | "source"
  | "generic";

export type OperationsFeedTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "accent";

export interface OperationsFeedItem {
  id: string;
  created_at: string;
  /** ISO date `YYYY-MM-DD` (UTC-based grouping key). */
  day: string;
  action: string;
  icon: OperationsFeedIconKey;
  tone: OperationsFeedTone;
  label: { ar: string; en: string };
  /** Primary entity reference (e.g. WO-… or TASK-…). Never a UUID. */
  primaryRef: string | null;
  /** Optional source cross-link (CNT-/QTE-/LED-/BKG-). */
  sourceRef: string | null;
}

export interface OperationsFeedDayGroup {
  day: string; // YYYY-MM-DD
  items: OperationsFeedItem[];
}

interface ActionDescriptor {
  icon: OperationsFeedIconKey;
  tone: OperationsFeedTone;
  label: { ar: string; en: string };
}

const ACTIONS: Record<string, ActionDescriptor> = {
  "work_order.created": {
    icon: "created", tone: "success",
    label: { ar: "تم إنشاء أمر العمل", en: "Work order created" },
  },
  "work_order.updated": {
    icon: "updated", tone: "info",
    label: { ar: "تم تحديث أمر العمل", en: "Work order updated" },
  },
  "work_order.stage_updated": {
    icon: "stage", tone: "info",
    label: { ar: "تم تحديث مرحلة العمل", en: "Stage updated" },
  },
  "work_order.task_created": {
    icon: "task", tone: "accent",
    label: { ar: "تمت إضافة مهمة", en: "Task created" },
  },
  "work_order.task_completed": {
    icon: "task", tone: "success",
    label: { ar: "اكتملت المهمة", en: "Task completed" },
  },
  "work_order.comment_added": {
    icon: "comment", tone: "neutral",
    label: { ar: "تمت إضافة تعليق", en: "Comment added" },
  },
  "work_order.created_from_contract": {
    icon: "source", tone: "accent",
    label: { ar: "أُنشئ من عقد", en: "Created from contract" },
  },
  "work_order.created_from_quote": {
    icon: "source", tone: "accent",
    label: { ar: "أُنشئ من عرض سعر", en: "Created from quote" },
  },
  "work_order.created_from_lead": {
    icon: "source", tone: "accent",
    label: { ar: "أُنشئ من طلب خدمة", en: "Created from lead" },
  },
  "work_order.created_from_booking": {
    icon: "source", tone: "accent",
    label: { ar: "أُنشئ من حجز موعد", en: "Created from booking" },
  },
};

/** Sanitize a candidate ref string — only return it if it matches the official pattern. */
function safeRef(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toUpperCase();
  return OFFICIAL_REF.test(v) ? v : null;
}

/** Pull the work-order ref. For task events the metadata.ref_id is the task ref. */
function pickPrimaryRef(action: string, metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  // Task-scoped actions use TASK-… as the primary ref
  if (action === "work_order.task_created" || action === "work_order.task_completed") {
    return safeRef(metadata.ref_id) ?? safeRef(metadata.task_ref_id);
  }
  return safeRef(metadata.ref_id);
}

function pickSourceRef(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  return (
    safeRef(metadata.contract_ref_id) ??
    safeRef(metadata.quote_ref_id) ??
    safeRef(metadata.lead_ref_id) ??
    safeRef(metadata.booking_ref_id) ??
    null
  );
}

function dayKey(iso: string): string {
  // Group by local calendar day (YYYY-MM-DD)
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return iso.slice(0, 10);
  }
}

export function normalizeOperationsEvent(
  event: BusinessActivityEvent,
): OperationsFeedItem {
  const desc = ACTIONS[event.action];
  const metadata = event.metadata ?? null;
  if (desc) {
    return {
      id: event.id,
      created_at: event.created_at,
      day: dayKey(event.created_at),
      action: event.action,
      icon: desc.icon,
      tone: desc.tone,
      label: desc.label,
      primaryRef: pickPrimaryRef(event.action, metadata),
      sourceRef: pickSourceRef(metadata),
    };
  }
  // Unknown action — generic, no UUID exposure
  return {
    id: event.id,
    created_at: event.created_at,
    day: dayKey(event.created_at),
    action: event.action,
    icon: "generic",
    tone: "neutral",
    label: { ar: "نشاط", en: "Activity" },
    primaryRef: pickPrimaryRef(event.action, metadata),
    sourceRef: pickSourceRef(metadata),
  };
}

export function normalizeOperationsFeed(
  events: BusinessActivityEvent[] | null | undefined,
): OperationsFeedItem[] {
  if (!events?.length) return [];
  return events.map(normalizeOperationsEvent);
}

export function groupOperationsFeedByDay(
  items: OperationsFeedItem[],
): OperationsFeedDayGroup[] {
  const buckets = new Map<string, OperationsFeedItem[]>();
  for (const it of items) {
    const arr = buckets.get(it.day) ?? [];
    arr.push(it);
    buckets.set(it.day, arr);
  }
  // Newest day first; items already arrive newest-first from the wrapper
  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([day, items]) => ({ day, items }));
}

/** Convenience: full pipeline. */
export function buildOperationsFeed(
  events: BusinessActivityEvent[] | null | undefined,
): OperationsFeedDayGroup[] {
  return groupOperationsFeedByDay(normalizeOperationsFeed(events));
}