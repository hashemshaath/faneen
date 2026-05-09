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
  console.error = (...args: unknown[]) => {
    push({ source: "console", level: "error", ...formatArgs(args) });
    origError(...args);
  };
  console.warn = (...args: unknown[]) => {
    push({ source: "console", level: "warn", ...formatArgs(args) });
    origWarn(...args);
  };

  // ── window.onerror
  window.addEventListener("error", (ev: ErrorEvent) => {
    push({
      source: "error",
      level: "error",
      message: ev.message || "Uncaught error",
      detail: ev.error instanceof Error ? (ev.error.stack || ev.error.message) : safeStringify(ev.error),
      url: ev.filename,
    });
  });

  // ── unhandledrejection
  window.addEventListener("unhandledrejection", (ev: PromiseRejectionEvent) => {
    const r = ev.reason;
    push({
      source: "rejection",
      level: "error",
      message: r instanceof Error ? r.message : safeStringify(r).split("\n")[0].slice(0, 240),
      detail: r instanceof Error ? (r.stack || r.message) : safeStringify(r),
    });
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

  // ── chrome.runtime.lastError noise (browser extensions like Tag Assistant
  //    emit "Could not establish connection. Receiving end does not exist."
  //    via the global error event with no filename). We capture them so the
  //    /diagnostics view can show provenance, but classify them as "extension"
  //    so they don't get mixed up with real Qitaat runtime errors.
  window.addEventListener("error", (ev: ErrorEvent) => {
    const msg = ev.message || "";
    const isExt =
      /Could not establish connection\. Receiving end does not exist/i.test(msg) ||
      /Extension context invalidated/i.test(msg) ||
      (typeof ev.filename === "string" && /^chrome-extension:\/\//.test(ev.filename));
    if (!isExt) return;
    push({
      source: "extension",
      level: "warn",
      message: msg.slice(0, 240),
      detail: [
        `filename: ${ev.filename || "(none)"}`,
        `line:col: ${ev.lineno || 0}:${ev.colno || 0}`,
        ev.error instanceof Error ? (ev.error.stack || ev.error.message) : "",
      ].filter(Boolean).join("\n"),
      url: ev.filename,
    });
  });

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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