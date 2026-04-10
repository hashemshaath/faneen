import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Search, MessageSquare, FileText, CheckCircle2 } from "lucide-react";

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
    <section className="py-16 sm:py-28 bg-muted/30 dark:bg-card/20 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>
      <div className="container px-4 sm:px-6 relative">
        <div className="text-center mb-10 sm:mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-xs sm:text-sm font-body font-semibold mb-3 sm:mb-4">
            {isRTL ? 'كيف يعمل' : 'How It Works'}
          </span>
          <h2 className="font-heading font-bold text-2xl sm:text-3xl md:text-5xl text-foreground">
            {isRTL ? 'أربع خطوات بسيطة' : 'Four Simple Steps'}
          </h2>
          <p className="font-body text-muted-foreground mt-3 sm:mt-5 max-w-xl mx-auto text-xs sm:text-base">
            {isRTL ? 'من البحث إلى التنفيذ، نجعل العملية سهلة وآمنة' : 'From search to delivery, we make the process easy and secure'}
          </p>
        </div>

        <div ref={visRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <div
              key={step.step}
              className={`relative p-5 sm:p-6 rounded-2xl bg-card dark:bg-card/60 border border-border/50 dark:border-border/30 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 sm:hover:-translate-y-1 transition-all duration-500 group text-center ${isVisible ? 'animate-card-slide-up' : 'opacity-0'}`}
              style={{ animationDelay: `${i * 120}ms`, animationFillMode: 'both' }}
            >
              {/* Step number */}
              <div className="absolute -top-3 start-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center shadow-md">
                {step.step}
              </div>

              {/* Connector line (hidden on last) */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 end-0 translate-x-1/2 w-full h-px border-t border-dashed border-accent/30 z-0" />
              )}

              <div className="w-14 h-14 rounded-2xl bg-accent/10 dark:bg-accent/15 flex items-center justify-center mx-auto mb-4 group-hover:bg-accent/20 transition-colors">
                <step.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-foreground mb-2 group-hover:text-accent transition-colors">
                {language === 'ar' ? step.titleAr : step.titleEn}
              </h3>
              <p className="font-body text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {language === 'ar' ? step.descAr : step.descEn}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
