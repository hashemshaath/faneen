/**
 * Visual showcase of curated private-sector examples (Saraya Aluminum,
 * Royal Kitchens, Crystal Glass) with cover images, full bilingual content
 * and a measurements/dimensions table. Each card has a "Use template"
 * action that prefills a new draft for the current provider.
 */
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  CheckCircle2, Sparkles, Award, Ruler, ChevronDown, ChevronUp, Wand2,
} from 'lucide-react';
import { ONBOARDING_SECTORS } from '@/data/onboarding-sectors';
import { PS_BRAND_TYPE_META } from './types';
import { PRIVATE_SECTOR_TEMPLATES, type PrivateSectorTemplate } from './templates';

interface Props {
  onUseTemplate: (tpl: PrivateSectorTemplate) => void;
}

export const PrivateSectorTemplatesShowcase: React.FC<Props> = ({ onUseTemplate }) => {
  const { isRTL } = useLanguage();
  const [openSpec, setOpenSpec] = useState<string | null>(PRIVATE_SECTOR_TEMPLATES[0]?.slug ?? null);

  return (
    <section aria-labelledby="ps-templates-heading" className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 id="ps-templates-heading" className="text-base font-bold">
          {isRTL ? 'قطاعات نموذجية جاهزة للاستخدام' : 'Curated example sectors'}
        </h2>
        <span className="text-xs text-muted-foreground">
          {isRTL ? '— انقر «استخدم النموذج» لتعبئة قطاع جديد بمحتوى احترافي.' : '— click "Use template" to start a new draft.'}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {PRIVATE_SECTOR_TEMPLATES.map((tpl) => {
          const parent = ONBOARDING_SECTORS.find((s) => s.id === tpl.parent_sector);
          const isOpen = openSpec === tpl.slug;
          return (
            <Card key={tpl.slug} className="overflow-hidden hover-lift border-border/60 flex flex-col">
              {/* Cover */}
              <div className="relative aspect-[16/10] overflow-hidden">
                <img src={tpl.cover} alt={isRTL ? tpl.name_ar : tpl.name_en}
                     loading="lazy" width={1280} height={720}
                     className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className={`absolute inset-0 bg-gradient-to-t ${tpl.accent}`} />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge className="bg-white/15 text-white border-white/30 backdrop-blur-sm">
                      {isRTL ? PS_BRAND_TYPE_META[tpl.brand_type].ar : PS_BRAND_TYPE_META[tpl.brand_type].en}
                    </Badge>
                    {parent && (
                      <Badge variant="outline" className="bg-white/10 text-white border-white/30 backdrop-blur-sm">
                        {isRTL ? parent.name_ar : parent.name_en}
                      </Badge>
                    )}
                    <span className="ms-auto text-xs text-white/80 tech-content">{tpl.established_year}</span>
                  </div>
                  <h3 className="text-xl font-extrabold leading-tight">
                    {isRTL ? tpl.name_ar : tpl.name_en}
                  </h3>
                </div>
              </div>

              <CardContent className="flex-1 flex flex-col gap-4 p-5">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {isRTL ? tpl.short_description_ar : tpl.short_description_en}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {tpl.highlights.slice(0, 4).map((h, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-success shrink-0" />
                      <span className="text-foreground/85">{isRTL ? h.ar : h.en}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Award className="h-3 w-3" /> {isRTL ? 'التخصصات' : 'Specializations'}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tpl.specializations.map((s, i) => (
                      <Badge key={i} variant="secondary" className="font-normal">
                        {isRTL ? s.ar : s.en}
                      </Badge>
                    ))}
                  </div>
                </div>

                {tpl.starting_price_sar !== undefined && (
                  <div className="rounded-xl bg-muted/40 border border-border/60 px-3 py-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{isRTL ? 'يبدأ من' : 'Starting at'}</span>
                    <span className="font-bold tech-content">
                      {tpl.starting_price_sar.toLocaleString()} {isRTL ? 'ر.س' : 'SAR'}
                    </span>
                  </div>
                )}

                {/* Dimensions toggle */}
                <button
                  type="button"
                  onClick={() => setOpenSpec(isOpen ? null : tpl.slug)}
                  className="flex items-center justify-between w-full rounded-xl border border-border/60 px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <Ruler className="h-4 w-4 text-primary" />
                    {isRTL ? tpl.dimensions.title_ar : tpl.dimensions.title_en}
                  </span>
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {isOpen && (
                  <div className="rounded-xl border border-border/60 overflow-hidden">
                    <div className="overflow-x-auto no-scrollbar">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/60 text-muted-foreground">
                          <tr>
                            <th className="text-start px-3 py-2 font-semibold">{isRTL ? 'الكود' : 'Code'}</th>
                            <th className="text-start px-3 py-2 font-semibold">{isRTL ? 'الوصف' : 'Item'}</th>
                            <th className="text-start px-3 py-2 font-semibold">{isRTL ? `العرض (${tpl.dimensions.unit})` : `Width (${tpl.dimensions.unit})`}</th>
                            <th className="text-start px-3 py-2 font-semibold">{isRTL ? `الارتفاع (${tpl.dimensions.unit})` : `Height (${tpl.dimensions.unit})`}</th>
                            <th className="text-start px-3 py-2 font-semibold">{isRTL ? `السماكة (${tpl.dimensions.unit})` : `Thk (${tpl.dimensions.unit})`}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {tpl.dimensions.rows.map((r) => (
                            <tr key={r.code} className="hover:bg-muted/30">
                              <td className="px-3 py-2 tech-content font-semibold">{r.code}</td>
                              <td className="px-3 py-2">{isRTL ? r.label_ar : r.label_en}</td>
                              <td className="px-3 py-2 tech-content">{r.width_mm}</td>
                              <td className="px-3 py-2 tech-content">{r.height_mm}</td>
                              <td className="px-3 py-2 tech-content">{r.thickness_mm ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tpl.certifications.map((c, i) => (
                    <Badge key={i} variant="outline" className="border-success/30 text-success bg-success/5">
                      {isRTL ? c.ar : c.en}
                    </Badge>
                  ))}
                </div>

                <Button className="mt-auto" size="app" onClick={() => onUseTemplate(tpl)}>
                  <Wand2 className="h-4 w-4" />
                  {isRTL ? 'استخدم هذا النموذج' : 'Use this template'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
};