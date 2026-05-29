import React from 'react';
import { Star, Quote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Props { isRTL: boolean }

interface Testimonial {
  name_ar: string; name_en: string;
  role_ar: string; role_en: string;
  business_ar: string; business_en: string;
  quote_ar: string; quote_en: string;
  tier: 'basic' | 'premium' | 'enterprise';
  sector_ar: string; sector_en: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    name_ar: 'م. خالد الرشيد', name_en: 'Eng. Khalid Al-Rashid',
    role_ar: 'المدير التنفيذي', role_en: 'CEO',
    business_ar: 'مصنع الرواد للألمنيوم', business_en: 'Roads Aluminum Factory',
    quote_ar: 'منذ اشتراكنا في باقة بريميوم زاد عدد الطلبات الواردة بنسبة 240% خلال 3 أشهر فقط. الشارة الموثّقة فرق حقيقي مع عملاء المشاريع الكبيرة.',
    quote_en: 'Since subscribing to Premium, incoming requests jumped 240% in just 3 months. The verified badge made a real difference with enterprise project clients.',
    tier: 'premium',
    sector_ar: 'ألمنيوم', sector_en: 'Aluminum',
    rating: 5,
  },
  {
    name_ar: 'أ. نورة الزهراني', name_en: 'Ms. Noura Al-Zahrani',
    role_ar: 'مديرة التشغيل', role_en: 'Operations Manager',
    business_ar: 'زجاج المدينة المعتمد', business_en: 'Almadinah Certified Glass',
    quote_ar: 'التحليلات وأدوات الذكاء الاصطناعي وفّرت علينا ساعات يومية في إعداد العروض. الفريق المخصص يجيب خلال ساعات وليس أيام.',
    quote_en: 'Analytics and AI tools save us hours daily on quote prep. The dedicated team replies in hours, not days.',
    tier: 'enterprise',
    sector_ar: 'زجاج', sector_en: 'Glass',
    rating: 5,
  },
  {
    name_ar: 'م. عبدالعزيز السبيعي', name_en: 'Eng. Abdulaziz Al-Subaie',
    role_ar: 'صاحب المنشأة', role_en: 'Founder',
    business_ar: 'أخشاب التميّز للديكور', business_en: 'Tamayuz Wood Decor',
    quote_ar: 'بدأت بالباقة الأساسية وانتقلت لبريميوم بعد شهرين فقط. المنصّة دفعتني للأمام بمعدل كان يحتاج سنوات بالطرق التقليدية.',
    quote_en: 'Started on Basic and upgraded to Premium after just two months. The platform moved me forward at a pace that would have taken years the old way.',
    tier: 'basic',
    sector_ar: 'أخشاب', sector_en: 'Wood',
    rating: 5,
  },
];

const tierAccent: Record<Testimonial['tier'], string> = {
  basic: 'border-info/30 text-info bg-info/10',
  premium: 'border-accent/40 text-accent bg-accent/10',
  enterprise: 'border-primary/40 text-primary bg-primary/10',
};

const tierLabel: Record<Testimonial['tier'], [string, string]> = {
  basic: ['أساسي', 'Basic'],
  premium: ['بريميوم', 'Premium'],
  enterprise: ['مؤسسات', 'Enterprise'],
};

export const MembershipTestimonials: React.FC<Props> = ({ isRTL }) => (
  <section className="max-w-6xl mx-auto mt-16 sm:mt-20" aria-labelledby="membership-testimonials-title">
    <div className="text-center mb-8 sm:mb-10">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium mb-3">
        <Star className="w-3.5 h-3.5 fill-warning" />
        {isRTL ? 'يثقون بنا' : 'Trusted by industry leaders'}
      </div>
      <h2 id="membership-testimonials-title" className="font-heading font-bold text-2xl sm:text-3xl text-foreground mb-2">
        {isRTL ? 'قصص نجاح من قطاع الصناعة' : 'Success stories from the industrial sector'}
      </h2>
      <p className="text-sm text-muted-foreground max-w-xl mx-auto">
        {isRTL
          ? 'منشآت حقيقية ترى نموًا حقيقيًا مع باقات قِطاعات'
          : 'Real industrial businesses seeing real growth with Qitaat plans'}
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {testimonials.map((t, i) => (
        <article
          key={i}
          className="relative rounded-2xl border border-border/60 bg-card p-5 sm:p-6 hover-lift hover:border-accent/30 transition-all flex flex-col"
        >
          <Quote className="w-7 h-7 text-accent/20 absolute top-4 end-4" aria-hidden="true" />

          <div className="flex items-center gap-1 mb-3">
            {[...Array(t.rating)].map((_, k) => (
              <Star key={k} className="w-3.5 h-3.5 fill-warning text-warning" aria-hidden="true" />
            ))}
          </div>

          <p className="text-sm text-foreground/85 leading-relaxed flex-1 mb-4" dir="auto">
            "{isRTL ? t.quote_ar : t.quote_en}"
          </p>

          <div className="pt-4 border-t border-border/40 flex items-start gap-3">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm',
              'bg-gradient-to-br from-accent/20 to-primary/20 text-accent',
            )}>
              {(isRTL ? t.name_ar : t.name_en).split(' ').slice(-1)[0].charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate" dir="auto">
                {isRTL ? t.name_ar : t.name_en}
              </p>
              <p className="text-[11px] text-muted-foreground truncate" dir="auto">
                {isRTL ? `${t.role_ar} · ${t.business_ar}` : `${t.role_en} · ${t.business_en}`}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <Badge variant="outline" className={cn('text-[10px] h-4 px-1.5', tierAccent[t.tier])}>
                  {isRTL ? tierLabel[t.tier][0] : tierLabel[t.tier][1]}
                </Badge>
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                  {isRTL ? t.sector_ar : t.sector_en}
                </Badge>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  </section>
);

export default MembershipTestimonials;