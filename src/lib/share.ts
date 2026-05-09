/**
 * Safe share helper.
 *
 * Wraps `navigator.share` so callers never throw on:
 *   - missing DOM element / SSR / non-browser environments
 *   - browsers without the Web Share API
 *   - user cancellation (AbortError)
 *   - permission errors inside iframes
 *
 * Falls back to copying the URL to the clipboard when sharing is unavailable.
 * Returns a structured outcome instead of throwing — UI code can branch on
 * the result without try/catch noise.
 */

export type ShareOutcome =
  | { ok: true; method: "share" | "clipboard" }
  | { ok: false; reason: "cancelled" | "unsupported" | "no-target" | "error"; error?: unknown };

export interface SafeShareInput {
  title?: string;
  text?: string;
  url?: string;
  /** Optional element used to anchor a share UI; if provided and detached, share is skipped. */
  target?: Element | null;
}

export async function safeShare(input: SafeShareInput): Promise<ShareOutcome> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { ok: false, reason: "unsupported" };
  }

  // Guard against callers that pass a ref to a DOM node that has unmounted.
  if (input.target !== undefined && (input.target === null || !input.target.isConnected)) {
    return { ok: false, reason: "no-target" };
  }

  const url = input.url ?? (typeof location !== "undefined" ? location.href : undefined);
  const payload: ShareData = {};
  if (input.title) payload.title = input.title;
  if (input.text) payload.text = input.text;
  if (url) payload.url = url;

  const canShare = typeof navigator.share === "function";
  if (canShare) {
    try {
      await navigator.share(payload);
      return { ok: true, method: "share" };
    } catch (err) {
      if (err instanceof DOMException && (err.name === "AbortError" || err.name === "NotAllowedError")) {
        // User cancelled or sandboxed iframe blocked the dialog — fall through to clipboard.
        if (err.name === "AbortError") return { ok: false, reason: "cancelled" };
      }
      // Otherwise fall through to clipboard fallback below.
    }
  }

  // Clipboard fallback.
  try {
    if (url && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return { ok: true, method: "clipboard" };
    }
  } catch (err) {
    return { ok: false, reason: "error", error: err };
  }

  return { ok: false, reason: "unsupported" };
}