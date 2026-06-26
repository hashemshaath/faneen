import { Link } from "react-router-dom";
import { Hash, FileText, User, Briefcase, MapPin, ClipboardList, Calendar, RefreshCw, ArrowLeftCircle } from "lucide-react";
import type { WorkOrderRow } from "@/modules/workOrders";

/**
 * WORK ORDER DETAIL + MILESTONES — PHASE 1.
 *
 * Read-only operational summary. Surfaces the 12 required data points
 * required for Phase 1 (no payments, no escrow, no warranty, no final
 * handover, no contract lifecycle change). Pure presentation — no
 * Supabase calls.
 */
interface Props {
  wo: WorkOrderRow;
  isRTL: boolean;
}

export function WorkOrderOperationalSummary({ wo, isRTL }: Props) {
  const t = (ar: string, en: string) => (isRTL ? ar : en);

  const fmt = (iso: string | null): string => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString(isRTL ? "ar-SA-u-nu-latn" : "en-US", {
        year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  };

  const contractRef = wo.source_type === "contract" ? wo.source_ref_id : null;

  const rows: Array<{ icon: typeof Hash; label: string; value: React.ReactNode }> = [
    { icon: Hash, label: t("رقم أمر العمل", "Work Order #"), value: <span className="tech-content">{wo.ref_id}</span> },
    {
      icon: FileText,
      label: t("العقد المرتبط", "Linked contract"),
      value: contractRef ? (
        <Link to={`/r/${contractRef}`} className="tech-content text-primary hover:underline" aria-label={t("العودة للعقد", "Back to contract")}>
          {contractRef}
        </Link>
      ) : "—",
    },
    { icon: User, label: t("العميل", "Client"), value: wo.customer_name || "—" },
    { icon: Briefcase, label: t("مزود الخدمة", "Provider"), value: <span className="tech-content">{wo.business_id ?? "—"}</span> },
    { icon: MapPin, label: t("الموقع", "Site"), value: "—" },
    { icon: ClipboardList, label: t("نطاق العمل", "Scope of work"), value: <span dir="auto">{wo.title || "—"}</span> },
    { icon: Calendar, label: t("تاريخ الإنشاء", "Created at"), value: <span className="tech-content">{fmt(wo.created_at)}</span> },
    { icon: RefreshCw, label: t("آخر تحديث", "Last update"), value: <span className="tech-content">{fmt(wo.updated_at)}</span> },
  ];

  return (
    <section
      data-testid="work-order-operational-summary"
      aria-label={t("ملخص تشغيلي", "Operational summary")}
      className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-sm">{t("الملخص التشغيلي", "Operational Summary")}</h2>
        {contractRef && (
          <Link
            to={`/r/${contractRef}`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            aria-label={t("العودة للعقد", "Back to contract")}
          >
            <ArrowLeftCircle className="w-3.5 h-3.5" />
            {t("العودة للعقد", "Back to contract")}
          </Link>
        )}
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-2 rounded-xl border border-border/40 bg-background/40 p-2.5">
            <Icon className="w-3.5 h-3.5 mt-0.5 text-accent shrink-0" />
            <div className="min-w-0 flex-1">
              <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
              <dd className="text-xs text-foreground truncate">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default WorkOrderOperationalSummary;