import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle, Paperclip, Trash2, Plus, Upload, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReferenceTag } from "@/components/reference/ReferenceTag";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  listWorkOrderAttachments,
  insertWorkOrderAttachment,
  softDeleteWorkOrderAttachment,
  createWorkOrderAttachmentUploadPath,
  validateWorkOrderAttachmentFile,
  uploadWorkOrderAttachmentFile,
  getWorkOrderAttachmentPreviewUrl,
  WORK_ORDER_ATTACHMENT_MAX_BYTES,
  WORK_ORDER_ATTACHMENT_TYPES,
  type WorkOrderAttachmentValidationCode,
  type WorkOrderAttachmentRow,
  type WorkOrderAttachmentType,
} from "@/modules/workOrders";

interface Props {
  workOrderId: string;
  businessId: string;
  canManage: boolean;
}

const TYPE_LABELS: Record<WorkOrderAttachmentType, { ar: string; en: string }> = {
  general: { ar: "عام", en: "General" },
  measurement_photo: { ar: "صورة قياس", en: "Measurement photo" },
  drawing: { ar: "مخطط", en: "Drawing" },
  quote_file: { ar: "ملف عرض سعر", en: "Quote file" },
  contract_file: { ar: "ملف عقد", en: "Contract file" },
  installation_photo: { ar: "صورة تركيب", en: "Installation photo" },
  handover_document: { ar: "مستند تسليم", en: "Handover document" },
};

function formatBytes(bytes: number | null | undefined, isRTL: boolean): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "—";
  const units = isRTL
    ? ["بايت", "ك.ب", "م.ب", "ج.ب"]
    : ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i += 1; }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function validationMessage(
  code: WorkOrderAttachmentValidationCode,
  isRTL: boolean,
): string {
  switch (code) {
    case "too_large":
      return isRTL
        ? "الملف يتجاوز الحد الأقصى ٥٠ ميجابايت."
        : "File exceeds the 50 MB limit.";
    case "forbidden_extension":
      return isRTL ? "نوع الملف غير مسموح به." : "This file type is not allowed.";
    case "mime_not_allowed":
      return isRTL ? "صيغة الملف غير مدعومة." : "Unsupported file format.";
    case "unknown_mime":
      return isRTL ? "تعذّر التعرّف على صيغة الملف." : "Unrecognized file format.";
    case "empty_file":
      return isRTL ? "الملف فارغ." : "File is empty.";
    case "missing_file":
      return isRTL ? "لم يتم اختيار ملف." : "No file selected.";
    default:
      return isRTL ? "فشل رفع الملف." : "Upload failed.";
  }
}

export function WorkOrderAttachmentsSection({ workOrderId, businessId, canManage }: Props) {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const [rows, setRows] = useState<WorkOrderAttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [attachmentType, setAttachmentType] = useState<WorkOrderAttachmentType>("general");
  const [busy, setBusy] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const tx = {
    title: isRTL ? "المرفقات" : "Attachments",
    empty: isRTL ? "لا توجد مرفقات." : "No attachments yet.",
    add: isRTL ? "إضافة مرفق" : "Add attachment",
    cancel: isRTL ? "إلغاء" : "Cancel",
    save: isRTL ? "رفع ملف" : "Upload file",
    pick: isRTL ? "اختيار ملف" : "Choose file",
    nofile: isRTL ? "لم يتم اختيار ملف" : "No file selected",
    view: isRTL ? "عرض الملف" : "View file",
    sizeLabel: isRTL ? "حجم الملف" : "File size",
    typeLabel: isRTL ? "نوع الملف" : "File type",
    type: isRTL ? "النوع" : "Type",
    errLoad: isRTL ? "تعذّر تحميل المرفقات." : "Failed to load attachments.",
    errSave: isRTL ? "فشل رفع الملف." : "Upload failed.",
    errPreview: isRTL ? "تعذّر فتح الملف." : "Could not open file.",
    errDelete: isRTL ? "تعذّر حذف المرفق." : "Failed to delete attachment.",
    confirm: isRTL ? "حذف هذا المرفق؟" : "Delete this attachment?",
    limit: isRTL
      ? "حتى ٥٠م.ب — صور، PDF، Word، Excel."
      : "Up to 50 MB — images, PDF, Word, Excel.",
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await listWorkOrderAttachments({ workOrderId });
    if (err) setError(tx.errLoad);
    setRows(data ?? []);
    setLoading(false);
  }, [workOrderId, tx.errLoad]);

  useEffect(() => { void load(); }, [load]);

  const resetAdding = useCallback(() => {
    setPendingFile(null);
    setAttachmentType("general");
    setAdding(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const onSave = useCallback(async () => {
    if (!user || !pendingFile) return;
    setError(null);
    const validation = validateWorkOrderAttachmentFile(pendingFile);
    if (!validation.ok) {
      setError(validationMessage(validation.code, isRTL));
      return;
    }
    setBusy(true);
    const path = createWorkOrderAttachmentUploadPath({
      businessId,
      workOrderId,
      fileName: pendingFile.name,
    });
    const { error: uploadErr } = await uploadWorkOrderAttachmentFile({
      path,
      file: pendingFile,
      contentType: validation.mime,
    });
    if (uploadErr) {
      setBusy(false);
      setError(tx.errSave);
      return;
    }
    const { data, error: insertErr } = await insertWorkOrderAttachment({
      work_order_id: workOrderId,
      business_id: businessId,
      uploaded_by_user_id: user.id,
      file_path: path,
      file_name: pendingFile.name,
      file_type: validation.mime ?? pendingFile.type ?? null,
      file_size: pendingFile.size,
      attachment_type: attachmentType,
    });
    setBusy(false);
    if (insertErr || !data) {
      setError(tx.errSave);
      return;
    }
    setRows((prev) => [data, ...prev]);
    resetAdding();
  }, [user, pendingFile, isRTL, workOrderId, businessId, attachmentType, tx.errSave, resetAdding]);

  const onPreview = useCallback(async (row: WorkOrderAttachmentRow) => {
    setError(null);
    setPreviewingId(row.id);
    const { data, error: err } = await getWorkOrderAttachmentPreviewUrl({
      attachmentId: row.id,
    });
    setPreviewingId(null);
    if (err || !data) { setError(tx.errPreview); return; }
    if (typeof window !== "undefined") {
      const w = window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      if (w) w.opener = null;
    }
  }, [tx.errPreview]);

  const onDelete = useCallback(async (row: WorkOrderAttachmentRow) => {
    if (!user) return;
    if (typeof window !== "undefined" && !window.confirm(tx.confirm)) return;
    const { error: err } = await softDeleteWorkOrderAttachment({
      attachmentId: row.id,
      actorUserId: user.id,
      businessId,
      workOrderId,
    });
    if (err) { setError(tx.errDelete); return; }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  }, [user, businessId, workOrderId, tx.confirm, tx.errDelete]);

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-3" aria-label={tx.title}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-accent" />
          <h2 className="font-semibold text-sm">{tx.title}</h2>
        </div>
        {canManage && !adding && (
          <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={() => setAdding(true)}>
            <Plus className="w-3.5 h-3.5 me-1" /> {tx.add}
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </div>
      )}

      {adding && (
        <div className="rounded-xl border border-border/40 bg-background/40 p-3 space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            aria-label={tx.pick}
            className="hidden"
            accept="image/jpeg,image/png,image/webp,application/pdf,.docx,.xlsx"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setPendingFile(f);
              setError(null);
              if (f) {
                const v = validateWorkOrderAttachmentFile(f);
                if (!v.ok) setError(validationMessage(v.code, isRTL));
              }
            }}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-lg h-9"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5 me-1" />
              {tx.pick}
            </Button>
            <div className="text-[11px] text-muted-foreground min-w-0 truncate" dir="auto">
              {pendingFile
                ? `${pendingFile.name} · ${formatBytes(pendingFile.size, isRTL)}`
                : tx.nofile}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">{tx.limit}</p>
          <select
            value={attachmentType}
            onChange={(e) => setAttachmentType(e.target.value as WorkOrderAttachmentType)}
            aria-label={tx.type}
            className="w-full rounded-lg h-9 text-xs bg-background border border-border px-2"
          >
            {WORK_ORDER_ATTACHMENT_TYPES.map((t) => (
              <option key={t} value={t}>{isRTL ? TYPE_LABELS[t].ar : TYPE_LABELS[t].en}</option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" className="rounded-lg" onClick={resetAdding}>
              {tx.cancel}
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-lg"
              onClick={() => void onSave()}
              disabled={busy || !pendingFile || (pendingFile?.size ?? 0) > WORK_ORDER_ATTACHMENT_MAX_BYTES}
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" /> : null}
              {tx.save}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">{tx.empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-2 rounded-xl border border-border/40 bg-background/40 p-2.5">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {r.ref_id && <ReferenceTag refId={r.ref_id} isRTL={isRTL} />}
                  <Badge variant="outline" className="text-[10px]">
                    {isRTL ? TYPE_LABELS[r.attachment_type].ar : TYPE_LABELS[r.attachment_type].en}
                  </Badge>
                  {r.file_type && (
                    <Badge variant="outline" className="text-[10px] tech-content" aria-label={tx.typeLabel}>
                      {r.file_type.split("/").pop()?.toUpperCase() ?? r.file_type}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground tech-content" aria-label={tx.sizeLabel}>
                    {formatBytes(r.file_size, isRTL)}
                  </span>
                  <span className="text-[10px] text-muted-foreground tech-content">
                    {new Date(r.created_at).toLocaleDateString(isRTL ? "ar" : "en")}
                  </span>
                </div>
                <p className="text-xs text-foreground truncate" dir="auto">{r.file_name}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-accent"
                  onClick={() => void onPreview(r)}
                  disabled={previewingId === r.id}
                  aria-label={tx.view}
                  title={tx.view}
                >
                  {previewingId === r.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <ExternalLink className="w-3.5 h-3.5" />}
                </Button>
                {canManage && (
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive" onClick={() => void onDelete(r)} aria-label="delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}