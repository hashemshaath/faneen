import React from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import type { SectorGuide } from '@/lib/sector-guides';

interface Props {
  sectorName: string;
  guides: SectorGuide[];
}

/**
 * Buyer-guide cards rendered on /sectors/:slug. Each guide is a self-contained
 * HowTo block (3-5 steps). HowTo JSON-LD is emitted by the parent page.
 */
export const SectorGuides: React.FC<Props> = ({ sectorName, guides }) => {
  const { isRTL } = useLanguage();
  if (!guides.length) return null;

  return (
    <section className="container px-4 pt-10" aria-labelledby="sector-guides-heading">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-primary" />
        <h2 id="sector-guides-heading" className="font-heading text-lg sm:text-xl font-bold">
          {isRTL ? `دليل المشتري — ${sectorName}` : `Buyer guide — ${sectorName}`}
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {guides.map((g) => (
          <Card key={g.slug} id={g.slug} className="hover-lift h-full">
            <CardContent className="p-5">
              <h3 className="font-heading font-bold text-foreground text-base leading-snug">
                {isRTL ? g.title_ar : g.title_en}
              </h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {isRTL ? g.excerpt_ar : g.excerpt_en}
              </p>
              <ol className="mt-3 space-y-1.5">
                {(isRTL ? g.steps_ar : g.steps_en).map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground/85 leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default SectorGuides;