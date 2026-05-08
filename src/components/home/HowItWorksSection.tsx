import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Search, MessageSquare, FileText, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";
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
  const DirArrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section
      className="relative py-14 sm:py-24 overflow-hidden bg-gradient-to-b from-background via-muted/30 to-background dark:from-background dark:via-card/10 dark:to-background"
      aria-labelledby="how-it-works-heading"
    >
      {/* Decorative ambient orbs */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 start-1/4 w-72 h-72 rounded-full bg-accent/[0.06] blur-3xl" />
        <div className="absolute -bottom-24 end-1/4 w-72 h-72 rounded-full bg-accent/[0.05] blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      </div>

      <div className="container-app relative">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-20 max-w-2xl mx-auto px-4">
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

        <div ref={visRef} className="relative max-w-6xl mx-auto">
          {/* Desktop horizontal connector with progress dots */}
          <div
            aria-hidden="true"
            className="hidden lg:block absolute top-8 inset-x-[12.5%] z-0"
          >
            <div className="h-px w-full border-t-2 border-dashed border-accent/25" />
          </div>

          {/* Mobile vertical timeline rail (aligned to badge center: 28px) */}
          <div
            aria-hidden="true"
            className="lg:hidden absolute top-2 bottom-2 w-[2px] bg-gradient-to-b from-accent/0 via-accent/25 to-accent/0 z-0"
            style={{ [isRTL ? "right" : "left"]: "27px" } as React.CSSProperties}
          />

          <ol className="relative z-10 list-none grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 lg:gap-7">
            {steps.map((step, i) => {
              const StepIcon = step.icon;
              const isLast = i === steps.length - 1;

              return (
                <li
                  key={step.step}
                  className={cn(
                    "relative",
                    isVisible ? "animate-card-slide-up" : "opacity-0"
                  )}
                  style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}
                >
                  {/* ============== MOBILE / TABLET (< lg) ============== */}
                  <div className="lg:hidden flex items-start gap-4">
                    {/* Numbered badge */}
                    <div className="relative flex-shrink-0">
                      <div className="absolute inset-0 rounded-full bg-accent/30 blur-md scale-110" aria-hidden="true" />
                      <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-accent to-accent/80 text-accent-foreground font-heading font-bold text-[15px] flex items-center justify-center shadow-lg shadow-accent/30 ring-[5px] ring-background">
                        {step.step}
                      </div>
                    </div>

                    {/* Card */}
                    <article className="flex-1 min-w-0 group">
                      <div className="relative p-5 rounded-2xl bg-card border border-border/60 dark:border-border/30 shadow-sm hover:shadow-md hover:border-accent/40 active:scale-[0.99] transition-all duration-300">
                        {/* Subtle directional pointer toward the rail */}
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute top-6 w-2.5 h-2.5 rotate-45 bg-card border-border/60 dark:border-border/30",
                            isRTL ? "-right-[5px] border-t border-r" : "-left-[5px] border-b border-l"
                          )}
                        />

                        <div className="flex items-center gap-3 mb-2.5">
                          <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/15 transition-colors">
                            <StepIcon className="w-[22px] h-[22px] text-accent" strokeWidth={2} />
                          </div>
                          <h3 className="font-heading font-bold text-[15px] text-foreground leading-snug">
                            {language === "ar" ? step.titleAr : step.titleEn}
                          </h3>
                        </div>
                        <p className="font-body text-[13px] text-muted-foreground leading-[1.7]">
                          {language === "ar" ? step.descAr : step.descEn}
                        </p>
                      </div>
                    </article>
                  </div>

                  {/* ============== DESKTOP (>= lg) ============== */}
                  <div className="hidden lg:flex flex-col items-center text-center">
                    {/* Badge */}
                    <div className="relative mb-6">
                      <div className="absolute inset-0 rounded-full bg-accent/30 blur-lg scale-110" aria-hidden="true" />
                      <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-accent to-accent/80 text-accent-foreground text-[17px] font-heading font-bold flex items-center justify-center shadow-xl shadow-accent/30 ring-[6px] ring-background">
                        {step.step}
                      </div>
                    </div>

                    {/* Card */}
                    <article className="relative w-full h-full group">
                      <div className="relative h-full p-7 rounded-2xl bg-card border border-border/50 dark:border-border/20 hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/[0.08] hover:-translate-y-2 transition-all duration-500 flex flex-col items-center">
                        {/* Top gradient accent line */}
                        <span
                          aria-hidden="true"
                          className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        />

                        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-5 group-hover:bg-accent/15 group-hover:scale-110 transition-all duration-500">
                          <StepIcon className="w-6 h-6 text-accent" strokeWidth={2} />
                        </div>

                        <h3 className="font-heading font-bold text-base text-foreground mb-2.5 group-hover:text-accent transition-colors leading-snug">
                          {language === "ar" ? step.titleAr : step.titleEn}
                        </h3>

                        <p className="font-body text-[13px] text-muted-foreground leading-[1.7] max-w-[230px]">
                          {language === "ar" ? step.descAr : step.descEn}
                        </p>
                      </div>

                      {/* Flow arrow between cards */}
                      {!isLast && (
                        <span
                          aria-hidden="true"
                          className="absolute top-[2px] -translate-y-full hidden lg:flex items-center justify-center w-7 h-7 rounded-full bg-background border border-accent/30 text-accent shadow-sm"
                          style={{ [isRTL ? "left" : "right"]: "-22px", top: "-40px" } as React.CSSProperties}
                        >
                          <DirArrow className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </article>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
};
