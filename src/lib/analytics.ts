// Lightweight, safe event tracker. No-op in production unless wired later.
export function trackEvent(name: string, payload?: Record<string, unknown>): void {
  try {
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[track]', name, payload ?? {});
    }
    // Future: forward to GA4 / Plausible / internal endpoint.
  } catch {
    /* never throw from analytics */
  }
}