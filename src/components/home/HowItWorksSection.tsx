import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Search, MessageSquare, FileText, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: Search,
    titleAr: 'ابحث عن مزود الخدمة',
    titleEn: 'Find a Provider',
    descAr: 'استخدم البحث المتقدم بالموقع، الأقسام، أو الخريطة للعثور على أفضل مزودي الخدمات',
    descEn: 'Use advanced search by location, category, or map to find the best service providers',
    step: '01',
  },
  {
    icon: MessageSquare,
    titleAr: 'تواصل واطلب عرض سعر',
    titleEn: 'Get a Quote',
    descAr: 'تواصل مباشرة مع المزود عبر نظام المراسلات واحصل على عرض سعر مفصّل',
    descEn: 'Contact the provider directly through messaging and get a detailed quote',
    step: '02',
  },
  {
    icon: FileText,
    titleAr: 'أبرم عقداً إلكترونياً',
    titleEn: 'Sign a Contract',
    descAr: 'وثّق الاتفاق بعقد إلكتروني يحمي حقوق الطرفين مع نظام أقساط مرن',
    descEn: 'Document the agreement with an e-contract that protects both parties with flexible installments',
    step: '03',
  },
  {
    icon: CheckCircle2,
    titleAr: 'استلم وقيّم',
    titleEn: 'Receive & Review',
    descAr: 'استلم العمل المنجز وشارك تجربتك بتقييم يساعد الآخرين في اختيارهم',
    descEn: 'Receive the completed work and share your experience with a review to help others',
    step: '04',
  },
];

export const HowItWorksSection = () => {
  const { language, isRTL } = useLanguage();
  const { ref: visRef, isVisible } = useScrollAnimation();

  return (
    <section className="py-20 sm:py-32 bg-muted/20 dark:bg-card/10 relative overflow-hidden">
      {/* Subtle top/bottom dividers */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      </div>

      <div className="container px-4 sm:px-6 relative">
        {/* Header */}
        <div className="text-center mb-14 sm:mb-20">
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent/10 text-accent text-xs sm:text-sm font-body font-semibold mb-5">
            {isRTL ? 'كيف يعمل' : 'How It Works'}
          </span>
          <h2 className="font-heading font-bold text-2xl sm:text-4xl md:text-5xl text-foreground leading-tight">
            {isRTL ? 'أربع خطوات بسيطة' : 'Four Simple Steps'}
          </h2>
          <p className="font-body text-muted-foreground mt-4 sm:mt-6 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            {isRTL ? 'من البحث إلى التنفيذ، نجعل العملية سهلة وآمنة' : 'From search to delivery, we make the process easy and secure'}
          </p>
        </div>

        {/* Steps */}
        <div ref={visRef} className="relative max-w-6xl mx-auto">
          {/* Connector line (desktop only) */}
          <div className="hidden lg:block absolute top-[4.5rem] inset-x-[12%] h-0.5 z-0">
            <div className="w-full h-full border-t-2 border-dashed border-accent/20" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-5 relative z-10">
            {steps.map((step, i) => {
              const displaySteps = isRTL ? [...steps].reverse() : steps;
              const displayStep = displaySteps[i];
              const StepIcon = displayStep.icon;

              return (
                <div
                  key={displayStep.step}
                  className={cn(
                    'relative flex flex-col items-center text-center',
                    isVisible ? 'animate-card-slide-up' : 'opacity-0'
                  )}
                  style={{ animationDelay: `${i * 120}ms`, animationFillMode: 'both' }}
                >
                  {/* Step number badge */}
                  <div className="relative mb-5">
                    <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground text-sm font-heading font-bold flex items-center justify-center shadow-lg shadow-accent/25 ring-[3px] ring-background z-10 relative">
                      {displayStep.step}
                    </div>
                  </div>

                  {/* Card */}
                  <div className="w-full p-6 sm:p-7 rounded-2xl bg-card dark:bg-card/60 border border-border/40 dark:border-border/20 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/5 sm:hover:-translate-y-1.5 transition-all duration-500 group flex-1 flex flex-col items-center">
                    {/* Icon */}
                    <div className="w-14 h-14 rounded-2xl bg-accent/8 dark:bg-accent/12 flex items-center justify-center mb-5 group-hover:bg-accent/15 group-hover:scale-110 transition-all duration-300">
                      <StepIcon className="w-6 h-6 text-accent" />
                    </div>

                    {/* Title */}
                    <h3 className="font-heading font-bold text-sm sm:text-base text-foreground mb-2.5 group-hover:text-accent transition-colors leading-snug">
                      {language === 'ar' ? displayStep.titleAr : displayStep.titleEn}
                    </h3>

                    {/* Description */}
                    <p className="font-body text-xs sm:text-[13px] text-muted-foreground leading-relaxed max-w-[220px]">
                      {language === 'ar' ? displayStep.descAr : displayStep.descEn}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
