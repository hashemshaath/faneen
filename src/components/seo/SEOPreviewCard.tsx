import { useMemo } from 'react';
import { useBi } from '@/components/common/Bilingual';
import { Card } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, Globe, ImageOff } from 'lucide-react';
import {
  buildSeoTitle,
  buildSeoDescription,
  TITLE_MAX,
  DESCRIPTION_MAX,
  type PageKind,
} from '@/modules/seo/seoTitleBuilder';

interface SEOPreviewCardProps {
  kind: PageKind;
  /** Editor-supplied SEO title (override). */
  customTitle?: string | null;
  /** Editor-supplied meta description (override). */
  customDescription?: string | null;
  /** Auto-build fallbacks. */
  name?: string | null;
  activity?: string | null;
  city?: string | null;
  category?: string | null;
  rawDescription?: string | null;
  /** URL preview (e.g. https://qitaat.com/slug). */
  url?: string | null;
  ogImageUrl?: string | null;
  /** Optional: keyword to check for presence. */
  focusKeyword?: string | null;
}

function lenBand(len: number, min: number, max: number) {
  if (len === 0) return 'empty';
  if (len < min) return 'short';
  if (len > max) return 'long';
  return 'good';
}

function bandColor(b: string) {
  switch (b) {
    case 'good': return 'bg-emerald-500';
    case 'short': return 'bg-amber-500';
    case 'long': return 'bg-red-500';
    default: return 'bg-muted';
  }
}

/**
 * Google-style SEO preview + length meters + warnings.
 * Renders BOTH languages (AR + EN) side-by-side using shared design tokens.
 */
export function SEOPreviewCard(props: SEOPreviewCardProps) {
  const { isRTL } = useBi();
  const {
    kind, customTitle, customDescription, name, activity, city, category,
    rawDescription, url, ogImageUrl, focusKeyword,
  } = props;

  const ar = useMemo(() => ({
    title: buildSeoTitle({ kind, lang: 'ar', customTitle, name, activity, city, category }),
    desc: buildSeoDescription({ kind, lang: 'ar', customDescription, name, activity, city, category, rawDescription }),
  }), [kind, customTitle, customDescription, name, activity, city, category, rawDescription]);

  const en = useMemo(() => ({
    title: buildSeoTitle({ kind, lang: 'en', customTitle, name, activity, city, category }),
    desc: buildSeoDescription({ kind, lang: 'en', customDescription, name, activity, city, category, rawDescription }),
  }), [kind, customTitle, customDescription, name, activity, city, category, rawDescription]);

  const warnings: string[] = [];
  if (!ogImageUrl) warnings.push(isRTL ? 'لا توجد صورة OG — قد تظهر معاينة فقيرة على وسائل التواصل.' : 'No OG image — social previews will be poor.');
  if (!url) warnings.push(isRTL ? 'رابط canonical غير محدد.' : 'Canonical URL is not set.');
  if (focusKeyword) {
    const fk = focusKeyword.toLowerCase();
    if (!ar.title.toLowerCase().includes(fk) && !en.title.toLowerCase().includes(fk)) {
      warnings.push(isRTL ? `الكلمة المفتاحية "${focusKeyword}" غير موجودة في العنوان.` : `Focus keyword "${focusKeyword}" missing from title.`);
    }
  }

  const renderSide = (lang: 'ar' | 'en', t: string, d: string) => {
    const tBand = lenBand(t.length, 30, TITLE_MAX);
    const dBand = lenBand(d.length, 70, DESCRIPTION_MAX);
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    return (
      <div className="space-y-3" dir={dir}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Globe className="w-3.5 h-3.5" />
          <span className="uppercase tracking-wide">{lang === 'ar' ? 'العربية' : 'English'}</span>
        </div>
        <div className="rounded-xl border bg-card p-3 space-y-1">
          <div className="text-[#1a0dab] text-base leading-snug line-clamp-2">{t || '—'}</div>
          {url && <div className="text-[#006621] text-xs truncate tech-content">{url}</div>}
          <div className="text-[#4d5156] text-sm leading-snug line-clamp-3">{d || '—'}</div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{lang === 'ar' ? 'العنوان' : 'Title'}</span>
            <span className={`tech-content ${tBand === 'long' ? 'text-red-600' : tBand === 'good' ? 'text-emerald-600' : 'text-amber-600'}`}>{t.length}/{TITLE_MAX}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full ${bandColor(tBand)}`} style={{ width: `${Math.min(100, (t.length / TITLE_MAX) * 100)}%` }} />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{lang === 'ar' ? 'الوصف' : 'Description'}</span>
            <span className={`tech-content ${dBand === 'long' ? 'text-red-600' : dBand === 'good' ? 'text-emerald-600' : 'text-amber-600'}`}>{d.length}/{DESCRIPTION_MAX}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full ${bandColor(dBand)}`} style={{ width: `${Math.min(100, (d.length / DESCRIPTION_MAX) * 100)}%` }} />
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
          <div className="flex items-center gap-1 text-xs text-emerald-600">
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
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default SEOPreviewCard;