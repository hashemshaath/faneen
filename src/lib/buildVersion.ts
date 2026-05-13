/**
 * Build identity, injected at build time via Vite `define`.
 * Used to detect stale published bundles still cached in the browser.
 */
export const BUILD_ID: string = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';
export const BUILD_TIME: string = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString();

/** Extract hashed module-script srcs from an index.html string. */
export function extractScriptSrcs(html: string): string[] {
  const re = /<script[^>]+src="([^"]+)"/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out.sort();
}

/** Snapshot of the entry scripts currently loaded in this document. */
export function currentScriptSrcs(): string[] {
  if (typeof document === 'undefined') return [];
  return Array.from(document.querySelectorAll('script[src]'))
    .map((s) => (s as HTMLScriptElement).getAttribute('src') || '')
    .filter(Boolean)
    .sort();
}