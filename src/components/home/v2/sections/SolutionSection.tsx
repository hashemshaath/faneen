import { Search, MapPin, Send, Scale, Sparkles } from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';
import solSearch from '@/assets/home/sol-search.webp';
import solCity from '@/assets/home/sol-city.webp';
import solRequest from '@/assets/home/sol-request.webp';
import solCompare from '@/assets/home/sol-compare.webp';
import { Section, SectionCover, PrimaryCTA, ROUTES } from './_shared';

const SolutionSection = () => {
  const bi = useBi();
  const items = [
    { image: solSearch, icon: Search, titleAr: 'ابحث حسب القطاع', titleEn: 'Search by sector',
      bodyAr: 'ألمنيوم، حديد، خشب، زجاج، ستانلس، وغيرها.', bodyEn: 'Aluminum, iron, wood, glass, stainless and more.' },
    { image: solCity, icon: MapPin, titleAr: 'اختر المدينة', titleEn: 'Choose your city',
      bodyAr: 'ابدأ من المزودين الأقرب أو الأنسب لموقع مشروعك.', bodyEn: 'Start with providers nearest or best suited to your project.' },
    { image: solRequest, icon: Send, titleAr: 'أرسل طلبًا واضحًا', titleEn: 'Send a clear request',
      bodyAr: 'أضف التفاصيل والصور والمقاسات إن وجدت.', bodyEn: 'Add details, images and measurements if you have them.' },
    { image: solCompare, icon: Scale, titleAr: 'قارن قبل القرار', titleEn: 'Compare before deciding',
      bodyAr: 'راجع الخيارات وتواصل مع المزود الأنسب.', bodyEn: 'Review options and contact the best fit.' },
  ];
  return (
    <Section id="solution" ariaLabelledBy="solution-heading" className="bg-gradient-to-b from-card/60 via-background to-background">
      <SectionCover
        headingId="solution-heading"
        tone="primary"
        icon={Sparkles}
        eyebrow={bi('كيف نساعدك', 'How we help')}
        title={bi('قطاعات تجعل البداية أوضح', 'Qitaat makes the start clearer')}
        sub={bi(
          'منصة واحدة تساعدك على البحث عن مزودي الخدمة، فهم خياراتك، وطلب عروض سعر بطريقة منظمة.',
          'One place to search for providers, understand your options, and request quotes in an organized way.',
        )}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {items.map(({ image, icon: Icon, titleAr, titleEn, bodyAr, bodyEn }, idx) => (
          <div
            key={titleEn}
            className="group relative rounded-2xl border border-border/60 bg-card hover-lift overflow-hidden"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-muted">
              <img
                src={image}
                alt={bi(titleAr, titleEn)}
                width={1024}
                height={640}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent pointer-events-none" />
              <span className="absolute top-3 end-3 text-[11px] font-semibold text-white/85 tech-content bg-black/30 backdrop-blur-md rounded-full px-2 py-0.5">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <div className="absolute bottom-3 start-3 w-10 h-10 rounded-xl bg-white/95 border border-white/40 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Icon className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <h3 className="font-heading font-bold text-lg text-foreground mb-2 leading-snug">{bi(titleAr, titleEn)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{bi(bodyAr, bodyEn)}</p>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>
      <div className="text-center mt-12">
        <PrimaryCTA to={ROUTES.quote} label={bi('ابدأ طلبك الآن', 'Start your request')} />
      </div>
    </Section>
  );
};

export { SolutionSection };
export default SolutionSection;