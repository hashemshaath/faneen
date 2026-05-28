import { useCallback, useEffect, useState } from "react";
import { Loader2, AlertCircle, Paperclip, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ReferenceTag } from "@/components/reference/ReferenceTag";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  listWorkOrderAttachments,
  insertWorkOrderAttachment,
  softDeleteWorkOrderAttachment,
  WORK_ORDER_ATTACHMENT_TYPES,
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

export function WorkOrderAttachmentsSection({ workOrderId, businessId, canManage }: Props) {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const [rows, setRows] = useState<WorkOrderAttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [fileName, setFileName] = useState("");
  const [filePath, setFilePath] = useState("");
  const [attachmentType, setAttachmentType] = useState<WorkOrderAttachmentType>("general");
  const [busy, setBusy] = useState(false);

  const tx = {
    title: isRTL ? "المرفقات" : "Attachments",
    empty: isRTL ? "لا توجد مرفقات." : "No attachments yet.",
    add: isRTL ? "إضافة مرفق" : "Add attachment",
    cancel: isRTL ? "إلغاء" : "Cancel",
    save: isRTL ? "حفظ" : "Save",
    fileName: isRTL ? "اسم الملف" : "File name",
    filePath: isRTL ? "مسار الملف" : "File path",
    type: isRTL ? "النوع" : "Type",
    errLoad: isRTL ? "تعذّر تحميل المرفقات." : "Failed to load attachments.",
    errSave: isRTL ? "تعذّر حفظ المرفق." : "Failed to save attachment.",
    errDelete: isRTL ? "تعذّر حذف المرفق." : "Failed to delete attachment.",
    confirm: isRTL ? "حذف هذا المرفق؟" : "Delete this attachment?",
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await listWorkOrderAttachments({ workOrderId });
    if (err) setError(tx.errLoad);
    setRows(data ?? []);
    setLoading(false);
  }, [workOrderId, tx.errLoad]);

  useEffect(() => { void load(); }, [load]);

  const onSave = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await insertWorkOrderAttachment({
      work_order_id: workOrderId,
      business_id: businessId,
      uploaded_by_user_id: user.id,
      file_path: filePath,
      file_name: fileName,
      attachment_type: attachmentType,
    });
    setBusy(false);
    if (err || !data) { setError(tx.errSave); return; }
    setRows((prev) => [data, ...prev]);
    setFileName("");
    setFilePath("");
    setAttachmentType("general");
    setAdding(false);
  }, [user, workOrderId, businessId, filePath, fileName, attachmentType, tx.errSave]);

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
          <Input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder={tx.fileName}
            aria-label={tx.fileName}
            dir="auto"
            className="rounded-lg h-9 text-xs"
            maxLength={255}
          />
          <Input
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            placeholder={tx.filePath}
            aria-label={tx.filePath}
            dir="ltr"
            className="rounded-lg h-9 text-xs tech-content"
            maxLength={500}
          />
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
            <Button type="button" variant="ghost" size="sm" className="rounded-lg" onClick={() => setAdding(false)}>
              {tx.cancel}
            </Button>
            <Button type="button" size="sm" className="rounded-lg" onClick={() => void onSave()} disabled={busy || !fileName.trim() || !filePath.trim()}>
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
                </div>
                <p className="text-xs text-foreground truncate" dir="auto">{r.file_name}</p>
              </div>
              {canManage && (
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive" onClick={() => void onDelete(r)} aria-label="delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}