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
    <section className="py-12 sm:py-20 bg-muted/20 dark:bg-card/10 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      </div>

      <div className="container-app relative">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-16">
          <span className="section-eyebrow font-body mb-4 inline-block">
            {isRTL ? 'كيف يعمل' : 'How It Works'}
          </span>
          <h2 className="font-heading font-bold text-2xl sm:text-4xl md:text-5xl text-foreground leading-tight">
            {isRTL ? 'أربع خطوات بسيطة' : 'Four Simple Steps'}
          </h2>
          <p className="font-body text-muted-foreground mt-3 sm:mt-5 max-w-xl mx-auto text-sm sm:text-base leading-relaxed px-4">
            {isRTL ? 'من البحث إلى التنفيذ، نجعل العملية سهلة وآمنة' : 'From search to delivery, we make the process easy and secure'}
          </p>
        </div>

        <div ref={visRef} className="relative max-w-6xl mx-auto">
          {/* Desktop horizontal connector */}
          <div className="hidden lg:block absolute top-7 inset-x-[12%] h-px z-0">
            <div className="w-full h-full border-t-2 border-dashed border-accent/25" />
          </div>

          {/* Mobile vertical timeline rail */}
          <div
            className="lg:hidden absolute top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-accent/30 to-transparent z-0"
            style={{ [isRTL ? 'right' : 'left']: '1.75rem' } as React.CSSProperties}
            aria-hidden="true"
          />

          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 relative z-10 list-none">
            {steps.map((step, i) => {
              const StepIcon = step.icon;

              return (
                <li
                  key={step.step}
                  className={cn(
                    'relative',
                    isVisible ? 'animate-card-slide-up' : 'opacity-0'
                  )}
                  style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
                >
                  {/* Mobile layout: timeline row */}
                  <div className="lg:hidden flex items-stretch gap-4">
                    {/* Step badge column */}
                    <div className="relative flex-shrink-0 flex flex-col items-center">
                      <div className="relative w-14 h-14 rounded-full bg-accent text-accent-foreground font-heading font-bold text-base flex items-center justify-center shadow-lg shadow-accent/30 ring-4 ring-background z-10">
                        {step.step}
                      </div>
                    </div>

                    {/* Card */}
                    <div className="flex-1 min-w-0 p-5 rounded-2xl bg-card dark:bg-card/60 border border-border/50 dark:border-border/20 shadow-sm active:scale-[0.99] transition-all duration-300">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <StepIcon className="w-5 h-5 text-accent" />
                        </div>
                        <h3 className="font-heading font-bold text-base text-foreground leading-snug">
                          {language === 'ar' ? step.titleAr : step.titleEn}
                        </h3>
                      </div>
                      <p className="font-body text-[13px] text-muted-foreground leading-relaxed">
                        {language === 'ar' ? step.descAr : step.descEn}
                      </p>
                    </div>
                  </div>

                  {/* Desktop / tablet layout: vertical card */}
                  <div className="hidden lg:flex flex-col items-center text-center">
                    <div className="relative mb-5">
                      <div className="w-14 h-14 rounded-full bg-accent text-accent-foreground text-base font-heading font-bold flex items-center justify-center shadow-lg shadow-accent/30 ring-4 ring-background z-10 relative">
                        {step.step}
                      </div>
                    </div>

                    <div className="w-full p-7 rounded-2xl bg-card dark:bg-card/60 border border-border/40 dark:border-border/20 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-1.5 transition-all duration-500 group flex-1 flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-5 group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300">
                        <StepIcon className="w-6 h-6 text-accent" />
                      </div>
                      <h3 className="font-heading font-bold text-base text-foreground mb-2.5 group-hover:text-accent transition-colors leading-snug">
                        {language === 'ar' ? step.titleAr : step.titleEn}
                      </h3>
                      <p className="font-body text-[13px] text-muted-foreground leading-relaxed max-w-[220px]">
                        {language === 'ar' ? step.descAr : step.descEn}
                      </p>
                    </div>
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
