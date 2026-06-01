import { useBi } from '@/components/common/Bilingual';
import { Section, SectionHead, PrimaryCTA, SecondaryCTA, ROUTES } from './_shared';

const HowItWorksV2 = () => {
  const bi = useBi();
  const steps = [
    { n: '01', titleAr: 'حدد ما تحتاجه', titleEn: 'Define what you need',
      bodyAr: 'اختر القطاع، المدينة، ونوع الخدمة.', bodyEn: 'Pick a sector, city and service type.' },
    { n: '02', titleAr: 'أرسل تفاصيل الطلب', titleEn: 'Send your request',
      bodyAr: 'أضف وصف المشروع والصور أو المقاسات إن وجدت.', bodyEn: 'Add a project description, photos or measurements.' },
    { n: '03', titleAr: 'استقبل الخيارات وقارن', titleEn: 'Receive and compare',
      bodyAr: 'راجع الردود وتواصل مع المزود المناسب.', bodyEn: 'Review responses and contact the right provider.' },
  ];
  return (
    <Section id="how-it-works" ariaLabelledBy="how-heading">
      <SectionHead headingId="how-heading" title={bi('3 خطوات تكفي لتبدأ', 'Three steps to get started')} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {steps.map((s) => (
          <div key={s.n} className="relative rounded-2xl border border-border/60 bg-card p-6 sm:p-8 hover-lift">
            <div className="font-heading font-black text-5xl sm:text-6xl text-primary/15 leading-none mb-4 tech-content">
              {s.n}
            </div>
            <h3 className="font-heading font-semibold text-lg text-foreground mb-2">{bi(s.titleAr, s.titleEn)}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{bi(s.bodyAr, s.bodyEn)}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
        <PrimaryCTA to={ROUTES.quote} label={bi('اطلب عرض سعر', 'Request a quote')} />
        <SecondaryCTA to="/for-providers" label={bi('هل أنت مزود خدمة؟ سجّل منشأتك', 'Are you a provider? Register your business')} />
      </div>
    </Section>
  );
};

export { HowItWorksV2 };
export default HowItWorksV2;