import { Users, HardHat, Compass, Building2 } from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';
import whoIndividuals from '@/assets/home/who-individuals.webp';
import whoContractors from '@/assets/home/who-contractors.webp';
import whoEngineers from '@/assets/home/who-engineers.webp';
import whoProviders from '@/assets/home/who-providers.webp';
import { Section, SectionCover, PrimaryCTA, SecondaryCTA, ROUTES } from './_shared';

const WhoIsItForSection = () => {
  const bi = useBi();
  const items = [
    { image: whoIndividuals, icon: Users, titleAr: 'الأفراد', titleEn: 'Individuals',
      bodyAr: 'لمن يحتاج تنفيذ أعمال ألمنيوم، زجاج، حديد، خشب أو ستانلس.',
      bodyEn: 'For anyone needing aluminum, glass, iron, wood or stainless work.' },
    { image: whoContractors, icon: HardHat, titleAr: 'المقاولون', titleEn: 'Contractors',
      bodyAr: 'لمن يبحث عن ورش، مصانع، ومزودي تنفيذ لمشاريعه.',
      bodyEn: 'For those sourcing workshops, factories and execution partners.' },
    { image: whoEngineers, icon: Compass, titleAr: 'المكاتب الهندسية', titleEn: 'Engineering offices',
      bodyAr: 'لمن يريد ربط التصميم بمزودي تنفيذ مناسبين.',
      bodyEn: 'To connect designs with the right execution partners.' },
    { image: whoProviders, icon: Building2, titleAr: 'مزودو الخدمة', titleEn: 'Service providers',
      bodyAr: 'للورش والمصانع والمعارض التي تريد ظهورًا أوضح وفرصًا أكثر.',
      bodyEn: 'For workshops, factories and showrooms seeking clearer visibility.' },
  ];
  return (
    <Section id="who" ariaLabelledBy="who-heading" className="bg-card/40">
      <SectionCover
        headingId="who-heading"
        tone="secondary"
        icon={Users}
        eyebrow={bi('لمن قطاعات', 'Who it’s for')}
        title={bi('مصممة لمن يبحث… ولمن يقدم الخدمة', 'Built for buyers — and for providers')}
        sub={bi(
          'سواء تبحث عن خدمة لمشروعك أو تقدمها، تجد ما يناسبك بطريقة منظمة.',
          'Whether you are looking for a service or providing it, find what fits — in an organized way.',
        )}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {items.map(({ image, icon: Icon, titleAr, titleEn, bodyAr, bodyEn }) => (
          <div
            key={titleEn}
            className="group relative rounded-2xl border border-border/60 bg-background hover-lift overflow-hidden"
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute bottom-3 start-3 w-10 h-10 rounded-xl bg-white/95 border border-white/40 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Icon className="w-5 h-5 text-secondary" />
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <h3 className="font-heading font-bold text-lg text-foreground mb-2 leading-snug">{bi(titleAr, titleEn)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{bi(bodyAr, bodyEn)}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
        <PrimaryCTA to={ROUTES.quote} label={bi('اطلب عرض سعر', 'Request a quote')} />
        <SecondaryCTA to={ROUTES.signupProvider} label={bi('أضف منشأتك', 'Add your business')} />
      </div>
    </Section>
  );
};

export { WhoIsItForSection };
export default WhoIsItForSection;