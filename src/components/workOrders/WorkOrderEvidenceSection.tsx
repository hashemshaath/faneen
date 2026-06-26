import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle, FileCheck2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  listWorkOrderAttachments,
  getWorkOrderAttachmentPreviewUrl,
  type WorkOrderAttachmentRow,
  type WorkOrderAttachmentType,
} from "@/modules/workOrders";

/**
 * BUSINESS-WORKFLOW-EVIDENCE-PHASE1 — Read-mostly "Site Visit / Measurement
 * Documents" surface. Reuses existing work_order_attachments rows (RLS-guarded
 * by is_work_order_member) and groups them by operational stage derived from
 * attachment_type. NEVER calls getPublicUrl — opens via short-lived signed URLs
 * minted by getWorkOrderAttachmentPreviewUrl. No uploads, no deletes, no
 * lifecycle mutations.
 */
interface Props {
  workOrderId: string;
  isClientView?: boolean;
}

type StageKey =
  | "site_visit"
  | "measurements"
  | "production_preparation"
  | "installation"
  | "initial_handover";

const STAGE_FOR_TYPE: Record<WorkOrderAttachmentType, StageKey> = {
  general: "site_visit",
  measurement_photo: "measurements",
  drawing: "production_preparation",
  quote_file: "site_visit",
  contract_file: "site_visit",
  installation_photo: "installation",
  handover_document: "initial_handover",
};

const STAGE_LABELS: Record<StageKey, { ar: string; en: string }> = {
  site_visit: { ar: "المعاينة", en: "Site visit" },
  measurements: { ar: "القياسات", en: "Measurements" },
  production_preparation: { ar: "تحضير التنفيذ", en: "Production preparation" },
  installation: { ar: "التركيب", en: "Installation" },
  initial_handover: { ar: "التسليم المبدئي", en: "Initial handover" },
};

const TYPE_LABELS: Record<WorkOrderAttachmentType, { ar: string; en: string }> = {
  general: { ar: "ملاحظة عامة", en: "General" },
  measurement_photo: { ar: "صورة قياس", en: "Measurement photo" },
  drawing: { ar: "مخطط", en: "Drawing" },
  quote_file: { ar: "ملف عرض سعر", en: "Quote file" },
  contract_file: { ar: "ملف عقد", en: "Contract file" },
  installation_photo: { ar: "صورة تركيب", en: "Installation photo" },
  handover_document: { ar: "مستند تسليم", en: "Handover document" },
};

export function WorkOrderEvidenceSection({ workOrderId, isClientView = false }: Props) {
  const { isRTL } = useLanguage();
  const [rows, setRows] = useState<WorkOrderAttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const tx = {
    title: isRTL ? "أدلة المعاينة والقياسات" : "Site visit & measurement evidence",
    empty: isRTL ? "لا توجد أدلة مرفقة حتى الآن" : "No evidence attached yet",
    addHint: isRTL
      ? "يمكن إضافة الأدلة من قسم المرفقات أعلاه."
      : "Evidence can be added from the attachments section above.",
    clientReadOnly: isRTL ? "للعرض فقط" : "Read-only",
    open: isRTL ? "فتح" : "Open",
    errLoad: isRTL ? "تعذّر تحميل الأدلة." : "Failed to load evidence.",
    errOpen: isRTL ? "تعذّر فتح الملف." : "Could not open file.",
    by: isRTL ? "أضافه" : "Added by",
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await listWorkOrderAttachments({ workOrderId });
    if (err) setError(tx.errLoad);
    setRows(data ?? []);
    setLoading(false);
  }, [workOrderId, tx.errLoad]);

  useEffect(() => { void load(); }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<StageKey, WorkOrderAttachmentRow[]>();
    for (const r of rows) {
      const stage = STAGE_FOR_TYPE[r.attachment_type] ?? "site_visit";
      const arr = map.get(stage) ?? [];
      arr.push(r);
      map.set(stage, arr);
    }
    return map;
  }, [rows]);

  const onOpen = useCallback(async (row: WorkOrderAttachmentRow) => {
    setError(null);
    setOpeningId(row.id);
    const { data, error: err } = await getWorkOrderAttachmentPreviewUrl({ attachmentId: row.id });
    setOpeningId(null);
    if (err || !data) { setError(tx.errOpen); return; }
    if (typeof window !== "undefined") {
      const w = window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      if (w) w.opener = null;
    }
  }, [tx.errOpen]);

  return (
    <section
      className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-3"
      aria-label={tx.title}
      data-testid="work-order-evidence-section"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-4 h-4 text-accent" />
          <h2 className="font-semibold text-sm">{tx.title}</h2>
        </div>
        {isClientView && (
          <Badge variant="outline" className="text-[10px]">{tx.clientReadOnly}</Badge>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-xs text-muted-foreground space-y-1">
          <p>{tx.empty}</p>
          {!isClientView && <p className="text-[11px]">{tx.addHint}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {(Object.keys(STAGE_LABELS) as StageKey[]).map((stage) => {
            const items = grouped.get(stage);
            if (!items || items.length === 0) return null;
            return (
              <div key={stage} className="rounded-xl border border-border/40 bg-background/40 p-3">
                <div className="text-xs font-semibold mb-2">
                  {isRTL ? STAGE_LABELS[stage].ar : STAGE_LABELS[stage].en}
                  <span className="ms-2 text-muted-foreground font-normal">({items.length})</span>
                </div>
                <ul className="space-y-2">
                  {items.map((r) => {
                    const t = TYPE_LABELS[r.attachment_type];
                    return (
                      <li
                        key={r.id}
                        className="flex items-center justify-between gap-2 text-xs"
                        data-testid="work-order-evidence-row"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium" dir="auto">{r.file_name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {isRTL ? t.ar : t.en} · {new Date(r.created_at).toLocaleDateString(isRTL ? "ar" : "en")}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-lg h-8"
                          onClick={() => void onOpen(r)}
                          disabled={openingId === r.id}
                        >
                          {openingId === r.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <ExternalLink className="w-3.5 h-3.5" />}
                          <span className="ms-1">{tx.open}</span>
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default WorkOrderEvidenceSection;