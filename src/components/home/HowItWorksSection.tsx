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
        <div className="absolute -top-24 start-1/4 w-72 h-72 rounded-full bg-accent/[0.06] blur-3xl" />
        <div className="absolute -bottom-24 end-1/4 w-72 h-72 rounded-full bg-accent/[0.05] blur-3xl" />
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
          ref={visRef as unknown as React.Ref<HTMLOListElement>}
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
                <article className="group relative h-full overflow-hidden rounded-xl bg-card border border-border/60 dark:border-border/30 p-3 sm:p-4 shadow-sm hover:shadow-lg hover:shadow-accent/[0.06] hover:border-accent/40 hover:-translate-y-0.5 transition-all duration-500">
                  {/* Top accent bar */}
                  <span
                    aria-hidden="true"
                    className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  />

                  <div className="flex items-start gap-3">
                    {/* Icon + step number stack */}
                    <div className="relative shrink-0">
                      <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/20 flex items-center justify-center group-hover:from-accent group-hover:to-accent/80 group-hover:border-accent transition-all duration-500">
                        <StepIcon
                          className="w-5 h-5 text-accent group-hover:text-accent-foreground transition-colors duration-500"
                          strokeWidth={2}
                        />
                      </div>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute -top-1.5 w-5 h-5 rounded-full bg-background border border-accent/40 text-accent text-[10px] font-heading font-bold flex items-center justify-center shadow-sm",
                          isRTL ? "-left-1.5" : "-right-1.5"
                        )}
                      >
                        {step.step}
                      </span>
                    </div>

                    {/* Text */}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-heading font-bold text-[14px] sm:text-[15px] text-foreground mb-1 leading-snug group-hover:text-accent transition-colors duration-300">
                        {language === "ar" ? step.titleAr : step.titleEn}
                      </h3>
                      <p className="font-body text-[12px] sm:text-[13px] text-muted-foreground leading-[1.6]">
                        {language === "ar" ? step.descAr : step.descEn}
                      </p>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
};
