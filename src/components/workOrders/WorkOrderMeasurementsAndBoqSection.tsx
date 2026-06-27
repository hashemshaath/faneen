/**
 * WORK ORDER MEASUREMENT SHEET + BOQ DRAFT — PHASE 1
 *
 * Thin wrapper that frames the existing Measurement Sheet and BOQ Draft
 * surfaces with a single bilingual heading and an operational-draft notice.
 * No new DB / RLS / RPC. Read-only when `canManage` is false.
 */
import { ClipboardList, Info } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { WorkOrderMeasurementsSection } from "@/components/workOrders/WorkOrderMeasurementsSection";
import { WorkOrderBoqSection } from "@/components/workOrders/WorkOrderBoqSection";
import { WorkOrderMeasurementsBoqSummary } from "@/components/workOrders/WorkOrderMeasurementsBoqSummary";
import { WorkOrderBoqReviewPanel } from "@/components/workOrders/WorkOrderBoqReviewPanel";

interface Props {
  workOrderId: string;
  businessId: string;
  canManage: boolean;
  workOrderRefId?: string | null;
}

export function WorkOrderMeasurementsAndBoqSection({
  workOrderId,
  businessId,
  canManage,
  workOrderRefId,
}: Props) {
  const { isRTL } = useLanguage();

  const tx = {
    title: isRTL ? "القياسات والكميات" : "Measurements & Quantities",
    subtitle: isRTL
      ? "وثّق المعاينة والمقاسات ثم جهّز مسودة الكميات قبل الإنتاج."
      : "Document the site visit and measurements, then prepare the BOQ draft before production.",
    draftNotice: isRTL
      ? "هذه الكميات مسودة تشغيلية وليست فاتورة أو اعتمادًا نهائيًا."
      : "These quantities are an operational draft — NOT an invoice or final approval.",
    readOnlyHint: isRTL
      ? "العرض للعميل للقراءة فقط."
      : "Client view is read-only.",
  };

  return (
    <section
      className="space-y-3 sm:space-y-4"
      aria-label={tx.title}
      data-testid="wo-measurements-and-boq"
    >
      <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-accent" />
          <h2 className="font-semibold text-sm">{tx.title}</h2>
        </div>
        <p className="text-xs text-muted-foreground" dir="auto">{tx.subtitle}</p>
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5">
          <Info className="w-3.5 h-3.5 mt-0.5 text-amber-600 shrink-0" />
          <p className="text-[11px] text-amber-700 dark:text-amber-400" dir="auto">
            {tx.draftNotice}
            {!canManage ? ` · ${tx.readOnlyHint}` : ""}
          </p>
        </div>
      </div>

      <WorkOrderMeasurementsBoqSummary
        workOrderId={workOrderId}
        canManage={canManage}
      />

      <WorkOrderBoqReviewPanel
        workOrderId={workOrderId}
        canManage={canManage}
      />

      <WorkOrderMeasurementsSection
        workOrderId={workOrderId}
        businessId={businessId}
        canManage={canManage}
      />

      <WorkOrderBoqSection
        workOrderId={workOrderId}
        businessId={businessId}
        canManage={canManage}
        workOrderRefId={workOrderRefId ?? null}
      />
    </section>
  );
}

export default WorkOrderMeasurementsAndBoqSection;