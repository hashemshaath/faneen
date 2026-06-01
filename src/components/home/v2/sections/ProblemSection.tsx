import { useBi } from '@/components/common/Bilingual';
import probScattered from '@/assets/home/prob-scattered.webp';
import probUnclear from '@/assets/home/prob-unclear.webp';
import probCompare from '@/assets/home/prob-compare.webp';
import { Section, SectionHead } from './_shared';

const ProblemSection = () => {
  const bi = useBi();
  const cards = [
    { image: probScattered, titleAr: 'بحث متفرق', titleEn: 'Scattered search',
      bodyAr: 'تتنقل بين حسابات، أرقام، وتوصيات غير مكتملة.',
      bodyEn: 'You jump between accounts, numbers and incomplete tips.' },
    { image: probUnclear, titleAr: 'معلومات غير واضحة', titleEn: 'Unclear information',
      bodyAr: 'لا تعرف دائمًا نوع الخدمة، المدينة، أو الأعمال السابقة.',
      bodyEn: 'You rarely see the service type, city or past work upfront.' },
    { image: probCompare, titleAr: 'مقارنة صعبة', titleEn: 'Hard to compare',
      bodyAr: 'العروض والردود تأتي بطرق مختلفة، فتأخذ وقتًا أطول لاتخاذ القرار.',
      bodyEn: 'Quotes arrive in different formats, slowing your decision.' },
  ];
  return (
    <Section id="problem" ariaLabelledBy="problem-heading">
      <SectionHead
        headingId="problem-heading"
        title={bi('اختيار المزوّد المناسب يبدأ من هنا', 'Choosing the right provider starts here')}
        sub={bi(
          'عادةً يبدأ البحث بسؤال المعارف، أو تصفح خرائط جوجل، أو مراسلات واتساب متفرقة. النتيجة غالبًا: وقت أطول، معلومات أقل، ومقارنة أصعب.',
          'Most searches start with friends, Google Maps and scattered WhatsApp chats — and end with more time spent and less to compare.',
        )}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {cards.map((c) => (
          <div key={c.titleEn} className="group rounded-xl border border-border/60 bg-card overflow-hidden hover-lift">
            <div className="relative aspect-[16/10] overflow-hidden bg-muted">
              <img
                src={c.image}
                alt={bi(c.titleAr, c.titleEn)}
                width={1024}
                height={640}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent pointer-events-none" />
            </div>
            <div className="p-5 sm:p-6">
              <h3 className="font-heading font-semibold text-lg text-foreground mb-2">{bi(c.titleAr, c.titleEn)}</h3>
              <p className="font-body text-sm text-muted-foreground leading-relaxed">{bi(c.bodyAr, c.bodyEn)}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
};

export { ProblemSection };
export default ProblemSection;