/**
 * BUSINESS-WORKFLOW-PRODUCTION-2 — Safe error mapping for stage moves.
 *
 * Maps RPC error payloads (PostgREST / Supabase) from
 * `transition_work_order_pipeline_stage` into bilingual, user-safe
 * messages. Never leaks SQL/error internals to the UI.
 */
export type TransitionErrorCode =
  | "forward_only"
  | "work_order_locked"
  | "cannot_skip_to_completed"
  | "not_authorized"
  | "unknown";

const KNOWN: ReadonlyArray<TransitionErrorCode> = [
  "forward_only",
  "work_order_locked",
  "cannot_skip_to_completed",
  "not_authorized",
];

export function classifyTransitionError(err: unknown): TransitionErrorCode {
  if (!err) return "unknown";
  const text = (() => {
    if (typeof err === "string") return err;
    if (err instanceof Error) return err.message;
    if (typeof err === "object") {
      const anyErr = err as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
      return [anyErr.message, anyErr.code, anyErr.details, anyErr.hint]
        .filter((v) => typeof v === "string")
        .join(" ");
    }
    return "";
  })().toLowerCase();
  for (const code of KNOWN) {
    if (text.includes(code)) return code;
  }
  return "unknown";
}

export function mapTransitionError(
  err: unknown,
  lang: "ar" | "en",
): string {
  const code = classifyTransitionError(err);
  const dict: Record<TransitionErrorCode, { ar: string; en: string }> = {
    forward_only: {
      ar: "لا يمكن التراجع — المراحل تتقدم للأمام فقط.",
      en: "Stages can only move forward.",
    },
    work_order_locked: {
      ar: "أمر العمل مغلق ولا يمكن تعديله.",
      en: "Work order is locked.",
    },
    cannot_skip_to_completed: {
      ar: "لا يمكن الانتقال إلى الاكتمال إلا من مرحلة التركيب.",
      en: "Completed can only be reached from the installation stage.",
    },
    not_authorized: {
      ar: "لا تملك صلاحية تنفيذ هذا الإجراء.",
      en: "You are not authorized for this action.",
    },
    unknown: {
      ar: "تعذّر نقل المرحلة.",
      en: "Failed to move stage.",
    },
  };
  return dict[code][lang];
}