/**
 * In-memory diagnostics buffer.
 * Captures console errors/warnings, unhandled errors, promise rejections,
 * and failed network requests (fetch + XHR). Exposed to developers via
 * the `/diagnostics` route and the `<ErrorBoundary>` fallback.
 *
 * Zero dependencies, zero impact on production traffic — purely client-side.
 */

export type DiagSource = "console" | "error" | "rejection" | "network" | "csp" | "extension";
export type DiagLevel = "error" | "warn" | "info";

export interface DiagEntry {
  id: string;
  ts: number;
  source: DiagSource;
  level: DiagLevel;
  message: string;
  detail?: string;
  url?: string;
  status?: number;
}

const MAX_ENTRIES = 200;
const buffer: DiagEntry[] = [];
const listeners = new Set<() => void>();
let installed = false;

// ─────────────────────────────────────────────────────────────────────────
// Extension noise classifier
//
// Browser extensions (Tag Assistant, ad blockers, screenshot tools, page
// translators, password managers, etc.) routinely inject scripts into every
// page and crash inside their own service-worker messaging. Their errors
// pollute the console and the `/diagnostics` view, masking real Qitaat bugs.
//
// We pattern-match these and reclassify them as `source: "extension"` /
// `level: "info"`, AND suppress their forwarding to the developer console.
// Anything that isn't recognized as extension noise is treated as a
// Qitaat-origin error, augmented with a stack trace, and forwarded normally.
// ─────────────────────────────────────────────────────────────────────────

const EXTENSION_PATTERNS: RegExp[] = [
  /Unchecked runtime\.lastError/i,
  /Could not establish connection\. Receiving end does not exist/i,
  /The message port closed before a response was received/i,
  /Extension context invalidated/i,
  /\bchrome-extension:\/\//i,
  /\bmoz-extension:\/\//i,
  /\bsafari-web-extension:\/\//i,
  /\bsafari-extension:\/\//i,
  /\bedge-extension:\/\//i,
  // Common injected helper filenames seen in the wild
  /\bshare-modal\.js\b/i,
  /\bcontentScript(\.bundle)?\.js\b/i,
  /\binpage\.js\b/i,
  /\boverlay_bundle\.js\b/i,
];

export function isExtensionNoise(...parts: Array<string | undefined | null>): boolean {
  const text = parts.filter(Boolean).join(" \n ");
  if (!text) return false;
  return EXTENSION_PATTERNS.some((re) => re.test(text));
}

function captureStack(skip = 2): string {
  const raw = new Error("diag-stack").stack || "";
  return raw.split("\n").slice(skip).join("\n");
}

/** Counter exposed for tests / Diagnostics page. */
const suppressed = { extension: 0 };
export function getSuppressedCounts() { return { ...suppressed }; }

function notify() {
  listeners.forEach((l) => {
    try { l(); } catch { /* ignore */ }
  });
}

function push(entry: Omit<DiagEntry, "id" | "ts">) {
  const e: DiagEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
  };
  buffer.push(e);
  if (buffer.length > MAX_ENTRIES) buffer.splice(0, buffer.length - MAX_ENTRIES);
  notify();
}

function safeStringify(v: unknown): string {
  if (v == null) return String(v);
  if (typeof v === "string") return v;
  if (v instanceof Error) return v.stack || `${v.name}: ${v.message}`;
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

function formatArgs(args: unknown[]): { message: string; detail?: string } {
  const parts = args.map(safeStringify);
  return {
    message: parts[0]?.split("\n")[0]?.slice(0, 240) || "(empty)",
    detail: parts.join(" "),
  };
}

export function installDiagnostics() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // ── console.error / console.warn
  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);
  const wrapConsole = (level: DiagLevel, orig: (...a: unknown[]) => void) =>
    (...args: unknown[]) => {
      const { message, detail } = formatArgs(args);
      if (isExtensionNoise(message, detail)) {
        suppressed.extension++;
        push({ source: "extension", level: "info", message, detail });
        // Suppress: do NOT forward to the real console.
        return;
      }
      // Qitaat-origin (or unknown): augment with a stack trace if missing.
      const hasStack = !!detail && /\n\s+at\s+/.test(detail);
      const finalDetail = hasStack ? detail : `${detail ?? message}\n${captureStack(3)}`;
      push({ source: "console", level, message, detail: finalDetail });
      orig(...args);
    };
  console.error = wrapConsole("error", origError);
  console.warn = wrapConsole("warn", origWarn);

  // ── window.onerror
  window.addEventListener("error", (ev: ErrorEvent) => {
    const msg = ev.message || "Uncaught error";
    const stack = ev.error instanceof Error ? (ev.error.stack || ev.error.message) : safeStringify(ev.error);
    if (isExtensionNoise(msg, stack, ev.filename)) {
      suppressed.extension++;
      push({
        source: "extension",
        level: "info",
        message: msg.slice(0, 240),
        detail: [`filename: ${ev.filename || "(none)"}`, `line:col: ${ev.lineno || 0}:${ev.colno || 0}`, stack].filter(Boolean).join("\n"),
        url: ev.filename,
      });
      ev.preventDefault?.();
      return;
    }
    push({
      source: "error",
      level: "error",
      message: msg,
      detail: stack,
      url: ev.filename,
    });
  });

  // ── unhandledrejection
  window.addEventListener("unhandledrejection", (ev: PromiseRejectionEvent) => {
    const r = ev.reason;
    const message = r instanceof Error ? r.message : safeStringify(r).split("\n")[0].slice(0, 240);
    const detail = r instanceof Error ? (r.stack || r.message) : safeStringify(r);
    if (isExtensionNoise(message, detail)) {
      suppressed.extension++;
      push({ source: "extension", level: "info", message, detail });
      ev.preventDefault?.();
      return;
    }
    push({ source: "rejection", level: "error", message, detail });
  });

  // ── CSP violations (Content-Security-Policy reports)
  window.addEventListener("securitypolicyviolation", (ev: SecurityPolicyViolationEvent) => {
    const directive = ev.effectiveDirective || ev.violatedDirective || "unknown";
    const blocked = ev.blockedURI || "(inline)";
    push({
      source: "csp",
      level: "error",
      message: `CSP blocked ${directive} → ${blocked}`,
      detail: [
        `directive: ${directive}`,
        `blockedURI: ${blocked}`,
        `documentURI: ${ev.documentURI || ""}`,
        `sourceFile: ${ev.sourceFile || ""}`,
        `line:col: ${ev.lineNumber || 0}:${ev.columnNumber || 0}`,
        `sample: ${(ev.sample || "").slice(0, 240)}`,
        `disposition: ${ev.disposition || ""}`,
        new Error("CSP violation stack").stack || "",
      ].join("\n"),
      url: blocked,
    });
  });

  // (extension classifier is integrated into the primary error/console hooks above)

  // ── fetch instrumentation
  if (typeof window.fetch === "function") {
    const origFetch = window.fetch.bind(window);
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const reqUrl = typeof args[0] === "string"
        ? args[0]
        : args[0] instanceof URL
          ? args[0].toString()
          : (args[0] as Request).url;
      try {
        const res = await origFetch(...args);
        if (!res.ok) {
          push({
            source: "network",
            level: res.status >= 500 ? "error" : "warn",
            message: `${res.status} ${res.statusText} — ${reqUrl}`,
            url: reqUrl,
            status: res.status,
          });
        }
        return res;
      } catch (err) {
        push({
          source: "network",
          level: "error",
          message: `Network failure — ${reqUrl}`,
          detail: err instanceof Error ? (err.stack || err.message) : safeStringify(err),
          url: reqUrl,
        });
        throw err;
      }
    };
  }

  // ── XHR instrumentation
  if (typeof window.XMLHttpRequest === "function") {
    const OrigXHR = window.XMLHttpRequest;
    const origOpen = OrigXHR.prototype.open;
    const origSend = OrigXHR.prototype.send;
    OrigXHR.prototype.open = function (
      this: XMLHttpRequest & { __diagUrl?: string; __diagMethod?: string },
      method: string,
      url: string | URL,
      ...rest: unknown[]
    ) {
      this.__diagUrl = typeof url === "string" ? url : url.toString();
      this.__diagMethod = method;
       
      return origOpen.apply(this, [method, url, ...rest] as any);
    };
    OrigXHR.prototype.send = function (
      this: XMLHttpRequest & { __diagUrl?: string; __diagMethod?: string },
      ...args: unknown[]
    ) {
      this.addEventListener("loadend", () => {
        if (this.status === 0 || this.status >= 400) {
          push({
            source: "network",
            level: this.status >= 500 || this.status === 0 ? "error" : "warn",
            message: `${this.status || "ERR"} ${this.statusText || ""} — ${this.__diagUrl || ""}`.trim(),
            url: this.__diagUrl,
            status: this.status,
          });
        }
      });
       
      return origSend.apply(this, args as any);
    };
  }
}

export function getDiagEntries(): DiagEntry[] {
  return buffer.slice();
}

export function clearDiagEntries() {
  buffer.length = 0;
  notify();
}

export function subscribeDiag(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function logDiag(level: DiagLevel, message: string, detail?: string) {
  push({ source: "console", level, message, detail });
}

export function exportDiagnosticsText(): string {
  const meta = [
    `# Qitaat Diagnostics Report`,
    `Generated: ${new Date().toISOString()}`,
    `URL: ${typeof location !== "undefined" ? location.href : "n/a"}`,
    `User-Agent: ${typeof navigator !== "undefined" ? navigator.userAgent : "n/a"}`,
    `Viewport: ${typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "n/a"}`,
    `Entries: ${buffer.length}`,
    "",
  ].join("\n");

  const lines = buffer.map((e) => {
    const t = new Date(e.ts).toISOString();
    const head = `[${t}] [${e.source}/${e.level}] ${e.message}`;
    return e.detail && e.detail !== e.message ? `${head}\n${e.detail}` : head;
  });
  return `${meta}\n${lines.join("\n\n")}`;
}