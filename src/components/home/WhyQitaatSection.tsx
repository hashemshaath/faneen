import { Phone, Clock, Layers, Percent, Lock, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface Item {
  icon: typeof Phone;
  title_ar: string;
  title_en: string;
  desc_ar: string;
  desc_en: string;
}

const items: Item[] = [
  {
    icon: Phone,
    title_ar: 'تواصل مباشر',
    title_en: 'Direct contact',
    desc_ar: 'بدون وسيط وبدون أي عمولة إضافية مع مزود الخدمة',
    desc_en: 'No middleman, no extra commission with the provider',
  },
  {
    icon: Clock,
    title_ar: 'توفير الوقت والمال',
    title_en: 'Save time & money',
    desc_ar: 'قارن بين الشركات واختر الأفضل بدون أي جهد إضافي',
    desc_en: 'Compare providers and pick the best one effortlessly',
  },
  {
    icon: Layers,
    title_ar: 'تعدد القطاعات',
    title_en: 'Multiple sectors',
    desc_ar: 'الألمنيوم، الزجاج، الخشب، الحديد، الخزائن — كلها تحت سقف واحد',
    desc_en: 'Aluminum, glass, wood, steel, cabinets — all under one roof',
  },
  {
    icon: Percent,
    title_ar: 'عروض حصرية',
    title_en: 'Exclusive offers',
    desc_ar: 'عروض خاصة لعملاء قِطاعات من مزودي الخدمة الموثقين',
    desc_en: 'Special deals for Qitaat customers from verified providers',
  },
  {
    icon: Lock,
    title_ar: 'الدفع الآمن',
    title_en: 'Secure payment',
    desc_ar: 'محفظة رقمية تضمن حق الطرفين وتسهل عملية الدفع',
    desc_en: 'Digital wallet protecting both parties and easing payments',
  },
  {
    icon: ShieldCheck,
    title_ar: 'بيئة موثوقة',
    title_en: 'Trusted environment',
    desc_ar: 'كل الشركات المسجلة في قِطاعات لديها سجلات تجارية نشطة',
    desc_en: 'Every business on Qitaat has an active commercial registration',
  },
];

interface Props {
  variant?: 'home' | 'about';
}

/**
 * "Why Qitaat?" — saqf-inspired 6-up benefits grid with circular icons
 * inside white cards. Reusable across home and About pages.
 */
export const WhyQitaatSection = ({ variant = 'home' }: Props) => {
  const { language, isRTL } = useLanguage();
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      className={
        variant === 'home'
          ? 'py-8 sm:py-16 bg-gradient-to-b from-background via-muted/20 to-background dark:from-background dark:via-card/15 dark:to-background relative overflow-hidden'
          : 'py-6 sm:py-12'
      }
      aria-labelledby="why-qitaat-heading"
    >
      <div className="container-app relative">
        <div className="text-center mb-10 sm:mb-14">
          <h2
            id="why-qitaat-heading"
            className="font-heading font-bold text-2xl sm:text-4xl text-foreground leading-tight mb-3"
          >
            {isRTL ? 'لماذا تتعامل عبر قِطاعات؟' : 'Why work through Qitaat?'}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-body max-w-xl mx-auto">
            {isRTL
              ? 'منصة موثوقة تربطك بأفضل الشركات في قطاعات الصناعة والمقاولات'
              : 'A trusted platform connecting you to the best industrial and contracting providers'}
          </p>
        </div>

        <div
          ref={ref}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4"
        >
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <article
                key={i}
                className={`group bg-card dark:bg-card/70 rounded-2xl border border-border/40 dark:border-border/20 p-4 sm:p-5 text-center hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-500 ${isVisible ? 'animate-card-slide-up' : ''}`}
                style={{ animationDelay: `${i * 70}ms`, animationFillMode: 'both' }}
              >
                <div className="mx-auto mb-3 sm:mb-4 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-success/10 dark:bg-success/15 flex items-center justify-center group-hover:bg-success/20 group-hover:scale-110 transition-all duration-300">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-success dark:text-success" strokeWidth={2} />
                </div>
                <h3 className="font-heading font-bold text-xs sm:text-sm text-foreground mb-1.5 sm:mb-2">
                  {language === 'ar' ? item.title_ar : item.title_en}
                </h3>
                <p className="font-body text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">
                  {language === 'ar' ? item.desc_ar : item.desc_en}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
