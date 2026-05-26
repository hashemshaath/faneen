import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Search, MessageSquare, FileText, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: Search,
    titleAr: "ابحث عن مزود الخدمة",
    titleEn: "Find a Provider",
    descAr: "استخدم البحث المتقدم بالموقع، الأقسام، أو الخريطة للعثور على أفضل مزودي الخدمات",
    descEn: "Use advanced search by location, category, or map to find the best service providers",
    step: "01",
  },
  {
    icon: MessageSquare,
    titleAr: "تواصل واطلب عرض سعر",
    titleEn: "Get a Quote",
    descAr: "تواصل مباشرة مع المزود عبر نظام المراسلات واحصل على عرض سعر مفصّل",
    descEn: "Contact the provider directly through messaging and get a detailed quote",
    step: "02",
  },
  {
    icon: FileText,
    titleAr: "أبرم عقداً إلكترونياً",
    titleEn: "Sign a Contract",
    descAr: "وثّق الاتفاق بعقد إلكتروني يحمي حقوق الطرفين مع نظام أقساط مرن",
    descEn: "Document the agreement with an e-contract that protects both parties with flexible installments",
    step: "03",
  },
  {
    icon: CheckCircle2,
    titleAr: "استلم وقيّم",
    titleEn: "Receive & Review",
    descAr: "استلم العمل المنجز وشارك تجربتك بتقييم يساعد الآخرين في اختيارهم",
    descEn: "Receive the completed work and share your experience with a review to help others",
    step: "04",
  },
];

export const HowItWorksSection = () => {
  const { language, isRTL } = useLanguage();
  const { ref: visRef, isVisible } = useScrollAnimation();

  return (
    <section
      className="relative py-14 sm:py-24 overflow-hidden bg-gradient-to-b from-background via-muted/30 to-background dark:from-background dark:via-card/10 dark:to-background"
      aria-labelledby="how-it-works-heading"
    >
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 start-1/4 w-72 h-72 rounded-full bg-primary/[0.06] blur-3xl" />
        <div className="absolute -bottom-24 end-1/4 w-72 h-72 rounded-full bg-primary/[0.05] blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      </div>

      <div className="container-app relative">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-16 max-w-2xl mx-auto px-4">
          <span className="section-eyebrow font-body mb-4 inline-block">
            {isRTL ? "كيف يعمل" : "How It Works"}
          </span>
          <h2
            id="how-it-works-heading"
            className="font-heading font-bold text-[26px] leading-[1.2] sm:text-4xl md:text-5xl text-foreground"
          >
            {isRTL ? "أربع خطوات بسيطة" : "Four Simple Steps"}
          </h2>
          <p className="font-body text-muted-foreground mt-3 sm:mt-5 text-[14px] sm:text-base leading-relaxed">
            {isRTL
              ? "من البحث إلى التنفيذ، نجعل العملية سهلة وآمنة"
              : "From search to delivery, we make the process easy and secure"}
          </p>
        </div>

        <ol
          ref={visRef as unknown as React.RefObject<HTMLOListElement>}
          className="relative z-10 list-none grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 max-w-6xl mx-auto"
        >
          {steps.map((step, i) => {
            const StepIcon = step.icon;

            return (
              <li
                key={step.step}
                className={cn(
                  "relative h-full",
                  isVisible ? "animate-card-slide-up" : "opacity-0"
                )}
                style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}
              >
                <article className="group relative h-full overflow-hidden rounded-2xl bg-card border border-border/60 dark:border-border/30 p-5 sm:p-6 lg:pt-8 shadow-sm hover:shadow-xl hover:shadow-primary/[0.06] hover:border-primary/40 hover:-translate-y-1 transition-all duration-500">
                  {/* Oversized watermark step number */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute -top-4 font-heading font-black leading-none select-none pointer-events-none",
                      "text-[88px] sm:text-[96px]",
                      "text-primary/10 dark:text-primary/15 group-hover:text-primary/20 transition-colors duration-500",
                      "-end-2"
                    )}
                  >
                    {step.step}
                  </span>

                  {/* Top primary bar */}
                  <span
                    aria-hidden="true"
                    className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  />

                  {/* Header row: icon + small step pill */}
                  <div className="relative flex items-center justify-between mb-4">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-md scale-110 opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true" />
                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center group-hover:from-primary group-hover:to-primary/80 group-hover:border-primary transition-all duration-500">
                        <StepIcon
                          className="w-5 h-5 sm:w-6 sm:h-6 text-primary group-hover:text-primary-foreground transition-colors duration-500"
                          strokeWidth={2}
                        />
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-heading font-bold tracking-wider">
                      <span className="w-1 h-1 rounded-full bg-primary" aria-hidden="true" />
                      {isRTL ? `الخطوة ${step.step}` : `STEP ${step.step}`}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="relative font-heading font-bold text-[15px] sm:text-base text-foreground mb-2 leading-snug group-hover:text-primary transition-colors duration-300">
                    {language === "ar" ? step.titleAr : step.titleEn}
                  </h3>

                  {/* Description */}
                  <p className="relative font-body text-[13px] text-muted-foreground leading-[1.7]">
                    {language === "ar" ? step.descAr : step.descEn}
                  </p>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
};
