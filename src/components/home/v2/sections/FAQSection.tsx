import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';
import { Section, SectionHead, SecondaryCTA } from './_shared';
import { FAQ_ITEMS_BI } from './faqItems';

const FAQSection = () => {
  const bi = useBi();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section id="faq" ariaLabelledBy="faq-heading">
      <SectionHead headingId="faq-heading" title={bi('أسئلة قد تساعدك قبل أن تبدأ', 'Questions that might help before you start')} />
      <div className="max-w-2xl mx-auto space-y-3">
        {FAQ_ITEMS_BI.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.qEn} className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-start hover:bg-secondary/5 transition-colors"
              >
                <span className="font-heading font-semibold text-sm sm:text-base text-foreground">
                  {bi(item.qAr, item.qEn)}
                </span>
                {isOpen ? <Minus className="w-4 h-4 text-primary shrink-0" /> : <Plus className="w-4 h-4 text-primary shrink-0" />}
              </button>
              {isOpen && (
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 -mt-1 text-sm text-muted-foreground leading-relaxed">
                  {bi(item.aAr, item.aEn)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="text-center mt-8">
        <SecondaryCTA to="/about#faq" label={bi('عرض كل الأسئلة', 'View all questions')} />
      </div>
    </Section>
  );
};

export { FAQSection };
export default FAQSection;