/**
 * BUSINESS-WORKFLOW-5A — Client-side validation guard for work-order
 * attachment uploads. Bucket remains private; this guard is the FIRST
 * gate before any storage call.
 */

export const WORK_ORDER_ATTACHMENT_MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export const WORK_ORDER_ATTACHMENT_ALLOWED_MIME: ReadonlyArray<string> = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

/** Extensions explicitly NEVER allowed — script/exec/markup surfaces. */
const FORBIDDEN_EXTENSIONS: ReadonlyArray<string> = [
  "svg", "html", "htm", "xhtml", "js", "mjs", "cjs", "jsx", "ts", "tsx",
  "exe", "dll", "bat", "cmd", "sh", "ps1", "vbs", "scr", "msi", "app",
  "jar", "apk", "ipa", "elf", "bin", "com", "pif",
];

/** Extension -> safe mime fallback when browser leaves type empty. */
const SAFE_EXT_TO_MIME: Readonly<Record<string, string>> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export type WorkOrderAttachmentValidationCode =
  | "ok"
  | "missing_file"
  | "empty_file"
  | "too_large"
  | "forbidden_extension"
  | "mime_not_allowed"
  | "unknown_mime";

export interface WorkOrderAttachmentValidationResult {
  ok: boolean;
  code: WorkOrderAttachmentValidationCode;
  /** Resolved (or fallback) mime type to record in metadata. */
  mime?: string;
  /** Lowercased extension extracted from the file name. */
  extension?: string;
}

interface FileLike {
  name?: string;
  size?: number;
  type?: string;
}

function extOf(name: string | undefined): string {
  if (!name) return "";
  const raw = name.split(/[?#]/)[0] ?? "";
  const idx = raw.lastIndexOf(".");
  if (idx <= 0 || idx === raw.length - 1) return "";
  return raw.slice(idx + 1).toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function validateWorkOrderAttachmentFile(
  file: FileLike | null | undefined,
): WorkOrderAttachmentValidationResult {
  if (!file) return { ok: false, code: "missing_file" };
  const size = typeof file.size === "number" ? file.size : 0;
  if (size <= 0) return { ok: false, code: "empty_file" };
  if (size > WORK_ORDER_ATTACHMENT_MAX_BYTES) return { ok: false, code: "too_large" };

  const extension = extOf(file.name);
  if (extension && FORBIDDEN_EXTENSIONS.includes(extension)) {
    return { ok: false, code: "forbidden_extension", extension };
  }

  const declared = (file.type ?? "").toLowerCase().trim();

  // Forbidden mime sniff: never accept svg/html/script regardless of extension.
  if (
    declared === "image/svg+xml" ||
    declared === "text/html" ||
    declared.startsWith("text/javascript") ||
    declared.startsWith("application/javascript") ||
    declared.startsWith("application/x-msdownload") ||
    declared.startsWith("application/x-sh")
  ) {
    return { ok: false, code: "mime_not_allowed", mime: declared, extension };
  }

  if (declared && WORK_ORDER_ATTACHMENT_ALLOWED_MIME.includes(declared)) {
    return { ok: true, code: "ok", mime: declared, extension };
  }

  // Empty / generic mime — fall back to extension mapping.
  if ((!declared || declared === "application/octet-stream") && extension && SAFE_EXT_TO_MIME[extension]) {
    return { ok: true, code: "ok", mime: SAFE_EXT_TO_MIME[extension], extension };
  }

  if (!declared) return { ok: false, code: "unknown_mime", extension };
  return { ok: false, code: "mime_not_allowed", mime: declared, extension };
}
