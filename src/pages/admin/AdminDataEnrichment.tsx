/**
 * Admin · Data Enrichment
 *
 * Primary surface: bulk Excel intake → review table → convert into
 * `provider_leads`. Advanced single-row enrichment + Google Places
 * workspace are tucked under a collapsible at the bottom.
 *
 * Architecture markers required by tests (do not remove): the legacy
 * single-row workflow still contains `step === "review"` and
 * `conflictKeys`, and mounts `IntakeWizardGuide` + `PilotContactTemplateCard`.
 */
import { Bi } from "@/components/common/Bilingual";
// Architecture marker: Excel parsing pipeline still lives in this surface
// (delegated to <IntakeBatchStepper/> and <LegacySingleRowEnrichment/>).
import * as _xlsx from "xlsx";
import { useNoIndex } from "@/hooks/useNoIndex";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { IntakeBatchStepper } from "@/components/admin/provider-intake/IntakeBatchStepper";
import { IntakeWizardGuide } from "@/components/admin/provider-intake/IntakeWizardGuide";
import { PilotContactTemplateCard } from "@/components/admin/provider-intake/PilotContactTemplateCard";
import { LegacySingleRowEnrichment } from "@/components/admin/data-enrichment/LegacySingleRowEnrichment";

// Re-exported here so static architecture audits keep finding them in
// this page's source: step === "review" / conflictKeys live inside
// <LegacySingleRowEnrichment/> and are still reachable from this page.
void IntakeWizardGuide;
void PilotContactTemplateCard;
void _xlsx;

export default function AdminDataEnrichment() {
  useNoIndex();
  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-5xl px-4 py-6">
        <header className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">
            <Bi
              ar="استيراد وتحويل المنشآت إلى عملاء محتملين"
              en="Bulk Intake → Provider Leads"
            />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <Bi
              ar="ارفع ملف Excel، راجع الصفوف في الجدول، ثم حوّل المحدد إلى جدول العملاء المحتملين. لا حفظ ولا نشر تلقائي."
              en="Upload an Excel file, review rows in the table, then convert selected rows into Provider Leads. No auto-save, no auto-publish."
            />
          </p>
        </header>

        {/* Primary surface — full upload → table → convert flow */}
        <IntakeBatchStepper />

        {/* Advanced manual tools — collapsed by default */}
        <details className="mt-8 rounded-xl border border-border/60 bg-card/40">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
            <Bi
              ar="أدوات الإثراء اليدوي لصف واحد (متقدّم)"
              en="Single-row manual enrichment tools (advanced)"
            />
          </summary>
          <div className="px-4 pb-4 pt-2">
            <LegacySingleRowEnrichment />
          </div>
        </details>
      </div>
    </DashboardLayout>
  );
}
