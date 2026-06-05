import { useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, Globe, ImageOff } from 'lucide-react';
import {
  buildSeoTitle,
  buildSeoDescription,
  TITLE_MAX,
  DESCRIPTION_MAX,
  type Lang,
  type PageKind,
} from '@/modules/seo/seoTitleBuilder';

interface SEOPreviewCardProps {
  kind: PageKind;
  /** Editor-supplied SEO title (override) per language. */
  customTitleAr?: string | null;
  customTitleEn?: string | null;
  /** Editor-supplied meta description (override) per language. */
  customDescriptionAr?: string | null;
  customDescriptionEn?: string | null;
  /** Auto-build fallbacks per language. */
  nameAr?: string | null;
  nameEn?: string | null;
  activityAr?: string | null;
  activityEn?: string | null;
  cityAr?: string | null;
  cityEn?: string | null;
  categoryAr?: string | null;
  categoryEn?: string | null;
  rawDescriptionAr?: string | null;
  rawDescriptionEn?: string | null;
  /** URL preview (e.g. https://qitaat.com/slug). */
  url?: string | null;
  ogImageUrl?: string | null;
  /** Optional: keyword to check for presence. */
  focusKeyword?: string | null;
}

type LenBand = 'empty' | 'short' | 'good' | 'long';

function lenBand(len: number, min: number, max: number): LenBand {
  if (len === 0) return 'empty';
  if (len < min) return 'short';
  if (len > max) return 'long';
  return 'good';
}

const BAND_BG: Record<LenBand, string> = {
  good: 'bg-success',
  short: 'bg-warning',
  long: 'bg-destructive',
  empty: 'bg-muted',
};
const BAND_TEXT: Record<LenBand, string> = {
  good: 'text-success',
  short: 'text-warning',
  long: 'text-destructive',
  empty: 'text-muted-foreground',
};

/**
 * Google-style SEO preview + length meters + warnings.
 * Renders BOTH languages (AR + EN) side-by-side using shared design tokens.
 */
export function SEOPreviewCard(props: SEOPreviewCardProps) {
  const { isRTL } = useLanguage();
  const {
    kind, customTitleAr, customTitleEn, customDescriptionAr, customDescriptionEn,
    nameAr, nameEn, activityAr, activityEn, cityAr, cityEn, categoryAr, categoryEn,
    rawDescriptionAr, rawDescriptionEn, url, ogImageUrl, focusKeyword,
  } = props;

  const ar = useMemo(() => buildSide('ar', kind, {
    customTitle: customTitleAr, customDescription: customDescriptionAr,
    name: nameAr, activity: activityAr, city: cityAr, category: categoryAr,
    rawDescription: rawDescriptionAr,
  }), [kind, customTitleAr, customDescriptionAr, nameAr, activityAr, cityAr, categoryAr, rawDescriptionAr]);

  const en = useMemo(() => buildSide('en', kind, {
    customTitle: customTitleEn, customDescription: customDescriptionEn,
    name: nameEn, activity: activityEn, city: cityEn, category: categoryEn,
    rawDescription: rawDescriptionEn,
  }), [kind, customTitleEn, customDescriptionEn, nameEn, activityEn, cityEn, categoryEn, rawDescriptionEn]);

  const warnings: string[] = [];
  if (!ogImageUrl) warnings.push(isRTL ? 'لا توجد صورة OG — قد تظهر معاينة فقيرة على وسائل التواصل.' : 'No OG image — social previews will be poor.');
  if (!url) warnings.push(isRTL ? 'رابط canonical غير محدد.' : 'Canonical URL is not set.');
  if (focusKeyword) {
    const fk = focusKeyword.toLowerCase();
    if (!ar.title.toLowerCase().includes(fk) && !en.title.toLowerCase().includes(fk)) {
      warnings.push(isRTL ? `الكلمة المفتاحية "${focusKeyword}" غير موجودة في العنوان.` : `Focus keyword "${focusKeyword}" missing from title.`);
    }
  }

  const renderSide = (lang: Lang, t: string, d: string) => {
    const tBand = lenBand(t.length, 30, TITLE_MAX);
    const dBand = lenBand(d.length, 70, DESCRIPTION_MAX);
    return (
      <div className="space-y-3" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Globe className="w-3.5 h-3.5" />
          <span className="uppercase tracking-wide">{lang === 'ar' ? 'العربية' : 'English'}</span>
        </div>
        <div className="rounded-xl border bg-card p-3 space-y-1">
          <div className="text-primary text-base leading-snug line-clamp-2">{t || '—'}</div>
          {url && <div className="text-success text-xs truncate tech-content">{url}</div>}
          <div className="text-muted-foreground text-sm leading-snug line-clamp-3">{d || '—'}</div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{lang === 'ar' ? 'العنوان' : 'Title'}</span>
            <span className={`tech-content ${BAND_TEXT[tBand]}`}>{t.length}/{TITLE_MAX}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full ${BAND_BG[tBand]}`} style={{ width: `${Math.min(100, (t.length / TITLE_MAX) * 100)}%` }} />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{lang === 'ar' ? 'الوصف' : 'Description'}</span>
            <span className={`tech-content ${BAND_TEXT[dBand]}`}>{d.length}/{DESCRIPTION_MAX}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full ${BAND_BG[dBand]}`} style={{ width: `${Math.min(100, (d.length / DESCRIPTION_MAX) * 100)}%` }} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{isRTL ? 'معاينة SEO' : 'SEO Preview'}</h3>
        {ogImageUrl ? (
          <div className="flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="w-3.5 h-3.5" /> OG
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ImageOff className="w-3.5 h-3.5" /> OG
          </div>
        )}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {renderSide('ar', ar.title, ar.desc)}
        {renderSide('en', en.title, en.desc)}
      </div>
      {warnings.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 space-y-1">
          {warnings.map((w) => (
            <div key={w} className="flex items-start gap-2 text-xs text-warning">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

interface SideInputs {
  customTitle?: string | null;
  customDescription?: string | null;
  name?: string | null;
  activity?: string | null;
  city?: string | null;
  category?: string | null;
  rawDescription?: string | null;
}

function buildSide(lang: Lang, kind: PageKind, i: SideInputs): { title: string; desc: string } {
  return {
    title: buildSeoTitle({ kind, lang, customTitle: i.customTitle, name: i.name, activity: i.activity, city: i.city, category: i.category }),
    desc: buildSeoDescription({ kind, lang, customDescription: i.customDescription, name: i.name, activity: i.activity, city: i.city, category: i.category, rawDescription: i.rawDescription }),
  };
}

export default SEOPreviewCard;