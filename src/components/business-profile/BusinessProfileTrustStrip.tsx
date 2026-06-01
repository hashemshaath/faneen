import { CheckCircle2, FileCheck2, FolderOpen, ShieldCheck, Wrench } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface BusinessProfileTrustStripProps {
  isVerified: boolean;
  serviceCount: number;
  projectCount: number;
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
        {/* Marker for static audits to confirm the disclaimer is rendered. */}
        <span data-trust-disclaimer="qitaat-review-no-guarantee" className="sr-only">
          <CheckCircle2 className="h-0 w-0" aria-hidden="true" />
        </span>
      </div>
    </section>
  );
};

export default BusinessProfileTrustStrip;