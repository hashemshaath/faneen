/**
 * BUSINESS-WORKFLOW-5A — Private upload + signed preview pipeline.
 *
 * Combines runtime unit tests for the pure helpers with source-level
 * invariants that protect the storage/security contract (private bucket,
 * no raw file_path render, no public URLs, no signed URLs persisted).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  createWorkOrderAttachmentUploadPath,
  validateWorkOrderAttachmentFile,
  WORK_ORDER_ATTACHMENT_MAX_BYTES,
  WORK_ORDER_ATTACHMENT_ALLOWED_MIME,
  WORK_ORDER_ATTACHMENTS_BUCKET,
  WORK_ORDER_ATTACHMENT_SIGNED_URL_MAX_SECONDS,
} from "@/modules/workOrders";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

function makeFile(name: string, size: number, type: string) {
  return { name, size, type };
}

/* ─────────── Part A — createWorkOrderAttachmentUploadPath ─────────── */
describe("createWorkOrderAttachmentUploadPath", () => {
  const base = { businessId: "biz-123", workOrderId: "wo-456", now: new Date(Date.UTC(2026, 4, 28)) };

  it("returns segmented path with sanitized ids + year/month", () => {
    const p = createWorkOrderAttachmentUploadPath({ ...base, fileName: "plan.PDF" });
    expect(p).toMatch(/^biz-123\/wo-456\/2026\/05\/[a-z0-9]+\.pdf$/);
  });

  it("never starts with a leading slash and never contains '..'", () => {
    const p = createWorkOrderAttachmentUploadPath({ ...base, fileName: "../../etc/passwd" });
    expect(p.startsWith("/")).toBe(false);
    expect(p.includes("..")).toBe(false);
  });

  it("strips query/hash fragments from the file name", () => {
    const p = createWorkOrderAttachmentUploadPath({ ...base, fileName: "drawing.png?token=evil#x" });
    expect(p.includes("?")).toBe(false);
    expect(p.includes("#")).toBe(false);
    expect(p.endsWith(".png")).toBe(true);
  });

  it("lowercases extension and produces a random base name", () => {
    const a = createWorkOrderAttachmentUploadPath({ ...base, fileName: "A.JPG" });
    const b = createWorkOrderAttachmentUploadPath({ ...base, fileName: "A.JPG" });
    expect(a).not.toBe(b);
    expect(a.endsWith(".jpg")).toBe(true);
  });

  it("sanitizes dangerous characters in business/workOrder ids", () => {
    const p = createWorkOrderAttachmentUploadPath({
      businessId: "../evil id",
      workOrderId: "wo\\?#",
      fileName: "x.png",
      now: base.now,
    });
    expect(p.startsWith("/")).toBe(false);
    expect(p.split("/").length).toBeGreaterThanOrEqual(5);
  });
});

/* ─────────── Part B — validateWorkOrderAttachmentFile ─────────── */
describe("validateWorkOrderAttachmentFile", () => {
  it("accepts jpg/png/webp/pdf/docx/xlsx", () => {
    const samples = [
      ["a.jpg", "image/jpeg"],
      ["b.png", "image/png"],
      ["c.webp", "image/webp"],
      ["d.pdf", "application/pdf"],
      ["e.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      ["f.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ] as const;
    for (const [name, mime] of samples) {
      const r = validateWorkOrderAttachmentFile(makeFile(name, 1024, mime));
      expect(r.ok, `${name} should pass`).toBe(true);
      expect(r.mime).toBe(mime);
    }
  });

  it("rejects forbidden extensions even with allowed mime", () => {
    for (const name of ["x.html", "x.svg", "x.js", "x.exe", "x.bat", "x.sh"]) {
      const r = validateWorkOrderAttachmentFile(makeFile(name, 100, "application/pdf"));
      expect(r.ok, name).toBe(false);
      expect(r.code).toBe("forbidden_extension");
    }
  });

  it("rejects sniffed SVG/HTML/script mimes regardless of extension", () => {
    for (const mime of ["image/svg+xml", "text/html", "application/javascript", "text/javascript"]) {
      const r = validateWorkOrderAttachmentFile(makeFile("ok.png", 100, mime));
      expect(r.ok, mime).toBe(false);
      expect(r.code).toBe("mime_not_allowed");
    }
  });

  it("falls back to extension mapping when mime is empty/octet-stream", () => {
    const r = validateWorkOrderAttachmentFile(makeFile("plan.pdf", 100, ""));
    expect(r.ok).toBe(true);
    expect(r.mime).toBe("application/pdf");
  });

  it("rejects files larger than 50 MB", () => {
    const r = validateWorkOrderAttachmentFile(
      makeFile("big.pdf", WORK_ORDER_ATTACHMENT_MAX_BYTES + 1, "application/pdf"),
    );
    expect(r.ok).toBe(false);
    expect(r.code).toBe("too_large");
  });

  it("rejects empty and missing files", () => {
    expect(validateWorkOrderAttachmentFile(null).code).toBe("missing_file");
    expect(validateWorkOrderAttachmentFile(makeFile("a.pdf", 0, "application/pdf")).code).toBe("empty_file");
  });

  it("allow-list is sealed and matches expected mimes", () => {
    expect(WORK_ORDER_ATTACHMENT_ALLOWED_MIME).toContain("application/pdf");
    expect(WORK_ORDER_ATTACHMENT_ALLOWED_MIME).not.toContain("image/svg+xml");
    expect(WORK_ORDER_ATTACHMENT_ALLOWED_MIME).not.toContain("text/html");
  });
});

/* ─────────── Part C — Storage / signed URL contract (source-level) ─────── */
describe("upload + signed URL service contract", () => {
  const uploadSrc = read("src/modules/workOrders/services/uploadWorkOrderAttachmentFile.ts");
  const signedSrc = read("src/modules/workOrders/services/createWorkOrderAttachmentSignedUrl.ts");
  const previewSrc = read("src/modules/workOrders/services/getWorkOrderAttachmentPreviewUrl.ts");

  it("bucket constant is exactly 'work-order-files'", () => {
    expect(WORK_ORDER_ATTACHMENTS_BUCKET).toBe("work-order-files");
  });

  it("upload uses ONLY the work-order-files bucket", () => {
    expect(uploadSrc).toMatch(/WORK_ORDER_ATTACHMENTS_BUCKET/);
    expect(uploadSrc).not.toMatch(/from\(\s*['"](?!work-order-files)[^'"]+['"]\s*\)/);
  });

  it("signed URL expiry is hard-capped at 300 seconds", () => {
    expect(WORK_ORDER_ATTACHMENT_SIGNED_URL_MAX_SECONDS).toBe(300);
    expect(signedSrc).toMatch(/Math\.min\([^)]*WORK_ORDER_ATTACHMENT_SIGNED_URL_MAX_SECONDS/);
  });

  it("signed URL is never persisted (no insert/update with signedUrl)", () => {
    for (const src of [signedSrc, previewSrc]) {
      expect(src).not.toMatch(/\.insert\([^)]*signedUrl/i);
      expect(src).not.toMatch(/\.update\([^)]*signedUrl/i);
      expect(src).not.toMatch(/recordWorkOrderAudit/);
    }
  });

  it("preview wrapper loads metadata through the public table (RLS-guarded)", () => {
    expect(previewSrc).toMatch(/from\(['"]work_order_attachments['"]\)/);
    expect(previewSrc).toMatch(/createWorkOrderAttachmentSignedUrl/);
  });

  it("upload service rejects unsafe paths defensively", () => {
    expect(uploadSrc).toMatch(/startsWith\(['"]\/['"]\)/);
    expect(uploadSrc).toMatch(/includes\(['"]\.\.['"]\)/);
  });
});

/* ─────────── Part D — UI invariants ─────────── */
describe("WorkOrderAttachmentsSection UI invariants", () => {
  const ui = read("src/components/workOrders/WorkOrderAttachmentsSection.tsx");

  it("uses a native file input + upload wrapper", () => {
    expect(ui).toMatch(/type="file"/);
    expect(ui).toMatch(/uploadWorkOrderAttachmentFile/);
    expect(ui).toMatch(/createWorkOrderAttachmentUploadPath/);
    expect(ui).toMatch(/validateWorkOrderAttachmentFile/);
  });

  it("metadata insert occurs ONLY after the upload wrapper", () => {
    const uploadIdx = ui.indexOf("uploadWorkOrderAttachmentFile(");
    const insertIdx = ui.indexOf("insertWorkOrderAttachment(");
    expect(uploadIdx).toBeGreaterThan(-1);
    expect(insertIdx).toBeGreaterThan(-1);
    expect(uploadIdx).toBeLessThan(insertIdx);
    expect(ui).toMatch(/if \(uploadErr\)[\s\S]{0,80}return/);
  });

  it("preview goes through getWorkOrderAttachmentPreviewUrl with noopener", () => {
    expect(ui).toMatch(/getWorkOrderAttachmentPreviewUrl/);
    expect(ui).toMatch(/window\.open\([^)]*"noopener,noreferrer"/);
  });

  it("never renders r.file_path or a public URL", () => {
    expect(ui).not.toMatch(/\{r\.file_path\}/);
    expect(ui).not.toMatch(/getPublicUrl/);
    expect(ui).not.toMatch(/\{[^}]*signedUrl[^}]*\}/);
  });

  it("file_path text input was removed", () => {
    expect(ui).not.toMatch(/placeholder=\{tx\.filePath\}/);
    expect(ui).not.toMatch(/setFilePath\(/);
  });

  it("displays file size and file type metadata", () => {
    expect(ui).toMatch(/formatBytes\(r\.file_size/);
    expect(ui).toMatch(/r\.file_type/);
  });

  it("provides bilingual upload/view/failure copy", () => {
    expect(ui).toMatch(/رفع ملف/);
    expect(ui).toMatch(/Upload file/);
    expect(ui).toMatch(/عرض الملف/);
    expect(ui).toMatch(/View file/);
    expect(ui).toMatch(/فشل رفع الملف/);
    expect(ui).toMatch(/Upload failed/);
    expect(ui).toMatch(/حجم الملف/);
    expect(ui).toMatch(/File size/);
    expect(ui).toMatch(/نوع الملف/);
    expect(ui).toMatch(/File type/);
  });
});

/* ─────────── Part E — Security posture (storage / out-of-scope) ─────── */
describe("BUSINESS-WORKFLOW-5A security posture", () => {
  const MIGRATIONS_DIR = join(ROOT, "supabase/migrations");
  it("work-order-files bucket migration still declares the bucket PRIVATE", () => {
    expect(existsSync(MIGRATIONS_DIR)).toBe(true);
    const target = "20260528194813_fd8e70c6-9683-416c-bccd-75c9d6a9b2da.sql";
    const sql = read(join("supabase/migrations", target));
    expect(sql).toMatch(/storage\.buckets[\s\S]+'work-order-files'[\s\S]+false/);
    expect(sql).not.toMatch(/'work-order-files'[^,)]*,\s*true\s*\)/);
  });

  it("no work-order upload helper grants anon access or builds public URLs", () => {
    const files = [
      "src/modules/workOrders/services/uploadWorkOrderAttachmentFile.ts",
      "src/modules/workOrders/services/createWorkOrderAttachmentSignedUrl.ts",
      "src/modules/workOrders/services/getWorkOrderAttachmentPreviewUrl.ts",
      "src/components/workOrders/WorkOrderAttachmentsSection.tsx",
    ];
    for (const f of files) {
      const src = read(f);
      expect(src, f).not.toMatch(/getPublicUrl/);
      expect(src, f).not.toMatch(/grant[\s\S]*anon/i);
    }
  });

  it("no realtime / notifications / edge-function wiring added for attachments", () => {
    const files = [
      "src/modules/workOrders/services/uploadWorkOrderAttachmentFile.ts",
      "src/modules/workOrders/services/createWorkOrderAttachmentSignedUrl.ts",
      "src/modules/workOrders/services/getWorkOrderAttachmentPreviewUrl.ts",
      "src/modules/workOrders/services/createWorkOrderAttachmentUploadPath.ts",
      "src/modules/workOrders/services/validateWorkOrderAttachmentFile.ts",
      "src/components/workOrders/WorkOrderAttachmentsSection.tsx",
    ];
    for (const f of files) {
      const src = read(f);
      expect(src, f).not.toMatch(/supabase\.channel\(/);
      expect(src, f).not.toMatch(/postgres_changes/);
      expect(src, f).not.toMatch(/functions\.invoke\(/);
      expect(src, f).not.toMatch(/insert\([\s\S]{0,200}notifications/);
    }
  });

  it("no payment/auth/contract files touched by the upload helpers", () => {
    const files = [
      "src/modules/workOrders/services/uploadWorkOrderAttachmentFile.ts",
      "src/modules/workOrders/services/createWorkOrderAttachmentSignedUrl.ts",
      "src/modules/workOrders/services/getWorkOrderAttachmentPreviewUrl.ts",
      "src/modules/workOrders/services/createWorkOrderAttachmentUploadPath.ts",
      "src/modules/workOrders/services/validateWorkOrderAttachmentFile.ts",
    ];
    for (const f of files) {
      const src = read(f);
      expect(src, f).not.toMatch(/\bcontracts\b/);
      expect(src, f).not.toMatch(/\bquotes\b/);
      expect(src, f).not.toMatch(/\bpayments\b/);
      expect(src, f).not.toMatch(/from\(['"]auth\./);
    }
  });
});
