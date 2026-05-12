import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, CheckCircle2, ArrowLeft, ArrowRight, Briefcase, DollarSign, Building2 } from 'lucide-react';
import type { SectorGuide } from '@/lib/sector-guides';
import type { SectorSlug } from '@/lib/sector-keywords';
import { getServiceForGuide, SECTOR_DEFAULT_SERVICE } from '@/lib/guide-links';

interface FeaturedProvider {
  username: string;
  name_ar: string;
  name_en: string | null;
}

interface Props {
  sectorName: string;
  sectorSlug: SectorSlug;
  guides: SectorGuide[];
  /** Top provider in this sector — surfaced as a "recommended workshop" link in each guide card. */
  featuredProvider?: FeaturedProvider | null;
}

/**
 * Buyer-guide cards rendered on /sectors/:slug. Each guide is a self-contained
 * HowTo block (3-5 steps) followed by *automatic internal links* to:
 *   - matching service pricing page (/services/:slug)
 *   - real project examples for the sector
 *   - a recommended verified provider in the sector (if available)
 *
 * HowTo JSON-LD is emitted by the parent page.
 */
export const SectorGuides: React.FC<Props> = ({ sectorName, sectorSlug, guides, featuredProvider }) => {
  const { isRTL, language } = useLanguage();
  if (!guides.length) return null;

  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section className="container px-4 pt-10" aria-labelledby="sector-guides-heading">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-primary" />
        <h2 id="sector-guides-heading" className="font-heading text-lg sm:text-xl font-bold">
          {isRTL ? `دليل المشتري — ${sectorName}` : `Buyer guide — ${sectorName}`}
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {guides.map((g) => {
          const serviceSlug = getServiceForGuide(g.slug) || SECTOR_DEFAULT_SERVICE[sectorSlug];
          const providerName = featuredProvider
            ? (language === 'ar' ? featuredProvider.name_ar : (featuredProvider.name_en || featuredProvider.name_ar))
            : null;

          return (
            <Card key={g.slug} id={g.slug} className="hover-lift h-full flex flex-col">
              <CardContent className="p-5 flex flex-col flex-1">
                <h3 className="font-heading font-bold text-foreground text-base leading-snug">
                  {isRTL ? g.title_ar : g.title_en}
                </h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {isRTL ? g.excerpt_ar : g.excerpt_en}
                </p>
                <ol className="mt-3 space-y-1.5 flex-1">
                  {(isRTL ? g.steps_ar : g.steps_en).map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground/85 leading-relaxed">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>

                {/* Automatic internal links — boost session depth + topical clustering */}
                <div className="mt-4 pt-3 border-t border-border/60 flex flex-col gap-1.5 text-xs">
                  <Link
                    to={`/services/${serviceSlug}`}
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>{isRTL ? 'قارن الأسعار والمواصفات' : 'Compare prices & specs'}</span>
                    <Arrow className="w-3 h-3 ms-auto" />
                  </Link>
                  <Link
                    to={`/projects?sector=${sectorSlug}`}
                    className="inline-flex items-center gap-1.5 text-info hover:underline"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>{isRTL ? `أمثلة أعمال ${sectorName}` : `${sectorName} project examples`}</span>
                    <Arrow className="w-3 h-3 ms-auto" />
                  </Link>
                  {featuredProvider && (
                    <Link
                      to={`/${featuredProvider.username}`}
                      className="inline-flex items-center gap-1.5 text-gold hover:underline"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span className="line-clamp-1">
                        {isRTL ? `ورشة موصى بها: ${providerName}` : `Recommended workshop: ${providerName}`}
                      </span>
                      <Arrow className="w-3 h-3 ms-auto shrink-0" />
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

export default SectorGuides;
