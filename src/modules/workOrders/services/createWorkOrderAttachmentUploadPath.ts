/**
 * BUSINESS-WORKFLOW-5A — Build a sanitized PRIVATE storage path for a
 * work-order attachment in the `work-order-files` bucket.
 *
 * Path shape:  `<businessId>/<workOrderId>/<YYYY>/<MM>/<random>.<ext>`
 *
 * Guarantees:
 *  - strips dangerous characters (..  / \ : ; ? # spaces NULs control)
 *  - lowercases the extension
 *  - never starts with a leading slash
 *  - never contains `..` segments, query strings, or hash fragments
 *  - random base name (never echoes user-supplied file name to storage)
 */

const EXT_MAX = 8;

function sanitizeIdSegment(value: string, fallback: string): string {
  const cleaned = (value ?? "")
    .toString()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 64);
  return cleaned.length > 0 ? cleaned : fallback;
}

function extractExtension(fileName: string): string {
  const raw = (fileName ?? "").toString().split(/[?#]/)[0] ?? "";
  const idx = raw.lastIndexOf(".");
  if (idx <= 0 || idx === raw.length - 1) return "bin";
  const ext = raw
    .slice(idx + 1)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, EXT_MAX);
  return ext.length > 0 ? ext : "bin";
}

function randomBase(): string {
  // Crypto when available; fall back to time + Math.random for non-DOM envs.
  const g = globalThis as { crypto?: { randomUUID?: () => string; getRandomValues?: (a: Uint8Array) => Uint8Array } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID().replace(/-/g, "");
  if (g.crypto?.getRandomValues) {
    const arr = new Uint8Array(16);
    g.crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export interface CreateWorkOrderAttachmentUploadPathInput {
  businessId: string;
  workOrderId: string;
  fileName: string;
  now?: Date;
}

export function createWorkOrderAttachmentUploadPath(
  input: CreateWorkOrderAttachmentUploadPathInput,
): string {
  const business = sanitizeIdSegment(input.businessId, "biz");
  const workOrder = sanitizeIdSegment(input.workOrderId, "wo");
  const ext = extractExtension(input.fileName);
  const now = input.now ?? new Date();
  const yyyy = String(now.getUTCFullYear()).padStart(4, "0");
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const base = randomBase();
  const path = `${business}/${workOrder}/${yyyy}/${mm}/${base}.${ext}`;
  // Defensive final scrub — never leak `..`, leading slash, query/hash.
  return path.replace(/^\/+/, "").replace(/\.\.+/g, "").split(/[?#]/)[0] ?? path;
}
