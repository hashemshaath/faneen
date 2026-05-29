import React, { useMemo, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Download, ShieldCheck, Star, MapPin, Building2, Sparkles } from 'lucide-react';
import { fmtNum } from '@/lib/format';

type B = {
  id: string;
  name_ar: string;
  name_en?: string | null;
  username?: string | null;
  rating_avg?: number | null;
  reviews_count?: number | null;
  is_verified?: boolean | null;
  city_id?: string | null;
  cities?: { name_ar?: string | null; name_en?: string | null } | null;
  categories?: { name_ar?: string | null; name_en?: string | null; slug?: string | null } | null;
  promotions?: Array<{ end_date?: string | null }> | null;
};

interface Props {
  businesses: B[];
  totalDirectory?: number;
}

/**
 * Compact insights bar over the currently filtered result set:
 * Results · Verified · Avg rating · Cities · With offers + Export CSV.
 * Numbers are always rendered LTR via formatNumber.
 */
export const SearchInsightsBar: React.FC<Props> = ({ businesses, totalDirectory }) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const stats = useMemo(() => {
    const count = businesses.length;
    const verified = businesses.filter((b) => b.is_verified).length;
    const cities = new Set(businesses.map((b) => b.city_id).filter(Boolean)).size;
    const withOffers = businesses.filter((b) => (b.promotions?.length ?? 0) > 0).length;
    const rated = businesses.filter((b) => Number(b.rating_avg) > 0);
    const avg = rated.length
      ? rated.reduce((s, b) => s + Number(b.rating_avg || 0), 0) / rated.length
      : 0;
    return { count, verified, cities, withOffers, avg };
  }, [businesses]);

  const handleExport = useCallback(() => {
    if (!businesses.length) return;
    const header = ['id', 'name_ar', 'name_en', 'username', 'rating_avg', 'reviews_count', 'is_verified', 'city', 'category'];
    const rows = businesses.map((b) => [
      b.id,
      b.name_ar ?? '',
      b.name_en ?? '',
      b.username ?? '',
      Number(b.rating_avg ?? 0).toFixed(2),
      String(b.reviews_count ?? 0),
      b.is_verified ? '1' : '0',
      (isRTL ? b.cities?.name_ar : b.cities?.name_en) ?? b.cities?.name_ar ?? '',
      (isRTL ? b.categories?.name_ar : b.categories?.name_en) ?? b.categories?.name_ar ?? '',
    ]);
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = '\uFEFF' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qitaat-search-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [businesses, isRTL]);

  if (!businesses.length) return null;

  const items = [
    {
      icon: Building2,
      label: isRTL ? 'النتائج' : 'Results',
      value: fmtNum(stats.count),
      hint: typeof totalDirectory === 'number' && totalDirectory > 0
        ? `/ ${fmtNum(totalDirectory)}`
        : undefined,
      tone: 'text-foreground',
    },
    {
      icon: ShieldCheck,
      label: isRTL ? 'موثّق' : 'Verified',
      value: fmtNum(stats.verified),
      tone: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      icon: Star,
      label: isRTL ? 'متوسّط التقييم' : 'Avg rating',
      value: stats.avg ? fmtNum(stats.avg, { maximumFractionDigits: 1, minimumFractionDigits: 1 }) : '—',
      tone: 'text-amber-600 dark:text-amber-400',
    },
    {
      icon: MapPin,
      label: isRTL ? 'مدن' : 'Cities',
      value: fmtNum(stats.cities),
      tone: 'text-sky-600 dark:text-sky-400',
    },
    {
      icon: Sparkles,
      label: isRTL ? 'لديها عروض' : 'With offers',
      value: fmtNum(stats.withOffers),
      tone: 'text-fuchsia-600 dark:text-fuchsia-400',
    },
  ];

  return (
    <div
      className="mb-4 rounded-2xl border border-border/60 bg-card/60 backdrop-blur px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar"
      role="region"
      aria-label={isRTL ? 'ملخّص نتائج البحث' : 'Search results summary'}
    >
      <ul className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        {items.map((it) => (
          <li
            key={it.label}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-background/60 border border-border/40 shrink-0"
          >
            <it.icon className={`h-4 w-4 ${it.tone}`} aria-hidden />
            <div className="flex items-baseline gap-1.5 tech-content">
              <span className={`text-sm font-semibold tabular-nums ${it.tone}`}>{it.value}</span>
              {it.hint && <span className="text-[11px] text-muted-foreground tabular-nums">{it.hint}</span>}
            </div>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">{it.label}</span>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 shrink-0"
        onClick={handleExport}
        aria-label={isRTL ? 'تصدير النتائج CSV' : 'Export results as CSV'}
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline ms-1">{isRTL ? 'تصدير CSV' : 'Export CSV'}</span>
      </Button>
    </div>
  );
};

export default SearchInsightsBar;