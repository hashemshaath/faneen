import { CheckCircle2, FileCheck2, FolderOpen, ShieldCheck, Wrench, BadgeCheck, ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

interface BusinessProfileTrustStripProps {
  isVerified: boolean;
  serviceCount: number;
  projectCount: number;
  businessId?: string;
  businessUsername?: string | null;
}

/**
 * UX-REDESIGN-4 — Compact, public-safe trust strip rendered between the
 * header card and the tab section. Uses only data already loaded on the
 * profile page; no fake counts, no unverified claims. Always carries the
 * Qitaat review-before-publish disclaimer.
 */
export const BusinessProfileTrustStrip = ({
  isVerified,
  serviceCount,
  projectCount,
  businessId,
  businessUsername,
}: BusinessProfileTrustStripProps) => {
  const { language, isRTL } = useLanguage();

  const items: Array<{ icon: typeof ShieldCheck; label: string; tone: "ok" | "muted" }> = [];

  if (isVerified) {
    items.push({
      icon: ShieldCheck,
      label: isRTL ? "جهة موثّقة" : "Verified provider",
      tone: "ok",
    });
  }
  if (serviceCount > 0) {
    items.push({
      icon: Wrench,
      label: isRTL ? "خدمات مصنّفة" : "Classified services",
      tone: "muted",
    });
  }
  if (projectCount > 0) {
    items.push({
      icon: FolderOpen,
      label: isRTL ? "أعمال منشورة" : "Published works",
      tone: "muted",
    });
  }
  items.push({
    icon: FileCheck2,
    label: isRTL ? "بيانات مراجعة قبل النشر" : "Reviewed before publishing",
    tone: "muted",
  });

  return (
    <section
      aria-label={isRTL ? "مؤشرات الثقة" : "Trust signals"}
      className="container relative z-10 mt-3 px-3 sm:mt-4 sm:px-4"
    >
      <div
        className="rounded-2xl border border-border/40 bg-card/60 px-3 py-2.5 shadow-sm dark:border-border/20 dark:bg-card/40 sm:px-4 sm:py-3"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground sm:gap-x-4 sm:text-xs">
          {items.map((item, idx) => {
            const Icon = item.icon;
            const isOk = item.tone === "ok";
            return (
              <li
                key={idx}
                className={`inline-flex items-center gap-1.5 ${
                  isOk ? "font-semibold text-success" : ""
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 ${isOk ? "text-success" : "text-accent"}`}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground sm:text-[11px]">
          {isRTL
            ? "نراجع بيانات الظهور قبل النشر، ولا نضمن نتائج التنفيذ."
            : "Listings are reviewed before publishing. Execution outcomes are not guaranteed."}
        </p>
        {businessUsername && projectCount > 0 && (
          <Link
            to={`/works/${businessUsername}`}
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline sm:text-xs"
            data-testid="business-works-link"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span>{isRTL ? "عرض كل الأعمال في صفحة المعرض" : "View all works in the showcase page"}</span>
            {isRTL ? <ArrowLeft className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
          </Link>
        )}
        {!isVerified && businessId && (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/30 bg-warning/5 px-3 py-2">
            <p className="text-[11px] leading-relaxed text-foreground/80 sm:text-xs">
              {isRTL
                ? "هل هذه جهتك؟ قم بتوثيق ملكيتها للحصول على شارة موثّق وإدارة بياناتها."
                : "Is this your business? Claim ownership to get the verified badge and manage its data."}
            </p>
            <Link
              to={`/claim/${businessId}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-md hover-lift sm:text-xs"
              data-testid="business-claim-cta"
            >
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isRTL ? "المطالبة بهذه الجهة" : "Claim this business"}</span>
              {isRTL ? <ArrowLeft className="h-3 w-3" aria-hidden="true" /> : <ArrowRight className="h-3 w-3" aria-hidden="true" />}
            </Link>
          </div>
        )}
        {/* Marker for static audits to confirm the disclaimer is rendered. */}
        <span data-trust-disclaimer="qitaat-review-no-guarantee" className="sr-only">
          <CheckCircle2 className="h-0 w-0" aria-hidden="true" />
        </span>
      </div>
    </section>
  );
};

export default BusinessProfileTrustStrip;