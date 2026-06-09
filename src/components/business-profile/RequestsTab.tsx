import { CalendarClock, Inbox, Tag, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import { useBusinessPublicRfqs } from "./business-profile.visibility";

const StatusBadge = ({ status }: { status: string }) => {
  const { language } = useLanguage();
  const map: Record<string, { ar: string; en: string; cls: string }> = {
    open: { ar: "مفتوح", en: "Open", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    active: { ar: "نشط", en: "Active", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    closed: { ar: "مغلق", en: "Closed", cls: "bg-muted text-muted-foreground" },
  };
  const s = map[status] ?? map.open;
  return (
    <span className={`inline-flex h-6 items-center rounded-full px-2 text-[11px] font-medium ${s.cls}`}>
      {language === "ar" ? s.ar : s.en}
    </span>
  );
};

const fmtBudget = (
  min: number | null,
  max: number | null,
  currency: string,
  language: "ar" | "en",
): string | null => {
  if (min == null && max == null) return null;
  const fmt = (n: number) => new Intl.NumberFormat(language === "ar" ? "ar-SA-u-nu-latn" : "en-US").format(n);
  if (min != null && max != null) return `${fmt(min)} - ${fmt(max)} ${currency}`;
  return `${fmt((min ?? max) as number)} ${currency}`;
};

/**
 * Public-facing list of RFQs a business has posted as a beneficiary/buyer.
 * Sensitive fields (full description, attachments) are intentionally omitted
 * — providers click "view & quote" to open the secured RFQ page.
 */
export const RequestsAsBeneficiaryTab = ({ businessId }: { businessId: string }) => {
  const { language, isRTL } = useLanguage();
  const { data: rows, isLoading } = useBusinessPublicRfqs(businessId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div className="py-12 text-center sm:py-16">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/30 dark:bg-muted/15">
          <Inbox className="h-8 w-8 text-muted-foreground/30" />
        </div>
        <p className="text-sm text-muted-foreground">
          {language === "ar" ? "لا توجد طلبات مطروحة حالياً" : "No public requests posted yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" dir={isRTL ? "rtl" : "ltr"}>
      {rows.map((r) => {
        const budget = fmtBudget(r.budget_min, r.budget_max, r.currency || "SAR", language as "ar" | "en");
        return (
          <Link
            key={r.id}
            to={`/rfq/${r.id}`}
            className="group flex flex-col gap-3 rounded-2xl border border-border/40 bg-card/70 p-4 shadow-sm transition-all hover-lift hover:border-primary/40 dark:bg-card/40"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary">
                {r.title}
              </h3>
              <StatusBadge status={r.status} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-1">
                <Tag className="h-3 w-3" />
                {r.industry}
              </span>
              {budget && (
                <span className="tech-content inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-700 dark:text-emerald-300">
                  <Wallet className="h-3 w-3" />
                  {budget}
                </span>
              )}
              {r.deadline && (
                <span className="tech-content inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300">
                  <CalendarClock className="h-3 w-3" />
                  {new Date(r.deadline).toLocaleDateString(language === "ar" ? "ar-SA-u-nu-latn" : "en-US")}
                </span>
              )}
            </div>
            {r.ref_id && (
              <p className="tech-content text-[10px] text-muted-foreground/70">#{r.ref_id}</p>
            )}
          </Link>
        );
      })}
    </div>
  );
};

export default RequestsAsBeneficiaryTab;