import React, { useMemo, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, ChevronDown } from 'lucide-react';
import {
  type FaqCategory,
  type SectorFaq,
  FAQ_CATEGORY_LABELS,
} from '@/lib/sector-faqs';

interface Props {
  sectorName: string;
  faqs: SectorFaq[];
  /** Optional selected city — used to localize the heading. */
  cityName?: string | null;
}

const CATEGORY_ORDER: FaqCategory[] = [
  'pricing',
  'selection',
  'installation',
  'warranty',
  'maintenance',
  'general',
];

/**
 * Per-sector FAQ section. Inline expand/collapse cards (no popups), with
 * category filter chips. The matching FAQPage JSON-LD is emitted by the
 * parent page so questions appear as Google Rich Snippets.
 */
export const SectorFAQ: React.FC<Props> = ({ sectorName, faqs, cityName }) => {
  const { isRTL } = useLanguage();
  const [activeCat, setActiveCat] = useState<FaqCategory | 'all'>('all');
  const [openSet, setOpenSet] = useState<Set<number>>(new Set([0]));

  const categoriesPresent = useMemo(() => {
    const present = new Set(faqs.map((f) => f.category));
    return CATEGORY_ORDER.filter((c) => present.has(c));
  }, [faqs]);

  const filtered = useMemo(
    () => (activeCat === 'all' ? faqs : faqs.filter((f) => f.category === activeCat)),
    [faqs, activeCat],
  );

  if (!faqs.length) return null;

  const toggle = (i: number) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <section className="container px-4 pt-10" aria-labelledby="sector-faq-heading">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="w-5 h-5 text-primary" />
        <h2 id="sector-faq-heading" className="font-heading text-lg sm:text-xl font-bold">
          {cityName
            ? (isRTL
                ? `أسئلة شائعة عن ${sectorName} في ${cityName}`
                : `${sectorName} FAQs in ${cityName}`)
            : (isRTL ? `أسئلة شائعة عن ${sectorName}` : `${sectorName} FAQs`)}
        </h2>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveCat('all')}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
          aria-pressed={activeCat === 'all'}
        >
          <Badge
            variant={activeCat === 'all' ? 'default' : 'secondary'}
            className="px-3 py-1.5 cursor-pointer"
          >
            {isRTL ? `الكل (${faqs.length})` : `All (${faqs.length})`}
          </Badge>
        </button>
        {categoriesPresent.map((cat) => {
          const count = faqs.filter((f) => f.category === cat).length;
          const label = FAQ_CATEGORY_LABELS[cat][isRTL ? 'ar' : 'en'];
          const active = activeCat === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCat(cat)}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
              aria-pressed={active}
            >
              <Badge
                variant={active ? 'default' : 'secondary'}
                className="px-3 py-1.5 cursor-pointer"
              >
                {label} ({count})
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Q&A list */}
      <div className="space-y-2.5" itemScope itemType="https://schema.org/FAQPage">
        {filtered.map((faq, i) => {
          const open = openSet.has(i);
          const q = isRTL ? faq.q_ar : faq.q_en;
          const a = isRTL ? faq.a_ar : faq.a_en;
          return (
            <Card
              key={`${faq.category}-${i}`}
              className="hover:border-primary/30 transition-colors"
              itemScope
              itemProp="mainEntity"
              itemType="https://schema.org/Question"
            >
              <CardContent className="p-0">
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className="w-full text-start p-4 flex items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                  aria-expanded={open}
                  aria-controls={`faq-answer-${i}`}
                >
                  <span className="flex-1 font-heading font-bold text-sm sm:text-base text-foreground" itemProp="name">
                    {q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                </button>
                {open && (
                  <div
                    id={`faq-answer-${i}`}
                    className="px-4 pb-4 -mt-1"
                    itemScope
                    itemProp="acceptedAnswer"
                    itemType="https://schema.org/Answer"
                  >
                    <div className="pt-2 border-t border-border/60">
                      <p className="text-sm text-muted-foreground leading-relaxed mt-2" itemProp="text">
                        {a}
                      </p>
                      <Badge variant="outline" className="mt-3 text-[10px]">
                        {FAQ_CATEGORY_LABELS[faq.category][isRTL ? 'ar' : 'en']}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

export default SectorFAQ;
