import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useMultiJsonLd } from '@/hooks/usePageMeta';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Layers, Search, Thermometer, Volume2, Shield,
  Eye, Ruler, Filter, Scale, X, SlidersHorizontal, Sparkles, Award,
  ArrowUpDown, RotateCcw, FileDown, FileText,
} from 'lucide-react';
import { fmtNum } from '@/lib/format';
import { exportProfilesCSV, exportProfilesPDF } from '@/lib/profile-systems-export';
import { toast } from 'sonner';

const categoryOptions = [
  { value: 'all', ar: 'الكل', en: 'All' },
  { value: 'aluminum', ar: 'الألمنيوم', en: 'Aluminum' },
  { value: 'kitchen', ar: 'المطابخ', en: 'Kitchens' },
  { value: 'iron', ar: 'الحديد', en: 'Iron' },
  { value: 'glass', ar: 'الزجاج', en: 'Glass' },
  { value: 'wood', ar: 'الخشب', en: 'Wood' },
  { value: 'upvc', ar: 'UPVC', en: 'UPVC' },
];

type SortKey = 'recommended' | 'views' | 'name' | 'thermal' | 'sound' | 'strength';
const sortOptions: { value: SortKey; ar: string; en: string }[] = [
  { value: 'recommended', ar: 'موصى به', en: 'Recommended' },
  { value: 'views', ar: 'الأكثر مشاهدة', en: 'Most viewed' },
  { value: 'name', ar: 'الاسم', en: 'Name' },
  { value: 'thermal', ar: 'العزل الحراري', en: 'Thermal rating' },
  { value: 'sound', ar: 'العزل الصوتي', en: 'Sound rating' },
  { value: 'strength', ar: 'التحمل', en: 'Strength' },
];

const recLevels = ['premium', 'recommended', 'standard'] as const;
type RecLevel = typeof recLevels[number];

interface ProfileSystemRow {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  category: string | null;
  profile_type: string | null;
  cover_image_url: string | null;
  logo_url: string | null;
  thermal_insulation_rating: number | null;
  sound_insulation_rating: number | null;
  strength_rating: number | null;
  max_height_mm: number | null;
  available_colors: string[] | null;
  recommendation_level: string | null;
  views_count: number | null;
  sort_order: number | null;
}

const recommendationLabels: Record<string, { ar: string; en: string; color: string }> = {
  premium: { ar: 'احترافي', en: 'Premium', color: 'bg-gold text-primary-foreground' },
  recommended: { ar: 'موصى به', en: 'Recommended', color: 'bg-success/10 text-success dark:text-success' },
  standard: { ar: 'قياسي', en: 'Standard', color: 'bg-muted text-muted-foreground' },
};

const RatingBar = ({ value, max = 10, label, icon: Icon }: { value: number; max?: number; label: string; icon: React.ElementType }) => {
  const pct = (value / max) * 100;
  const getColor = () => {
    if (pct >= 80) return 'from-success to-success';
    if (pct >= 60) return 'from-gold/70 to-gold';
    return 'from-warning to-urgent';
  };
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
      <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground w-12 sm:w-16 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${getColor()} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-heading font-bold text-muted-foreground w-6 sm:w-8 text-end tabular-nums tech-content">{value}</span>
    </div>
  );
};

const ProfileSystems = () => {
  const { isRTL, language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { cat: catParam } = useParams<{ cat?: string }>();
  const routeCategory = useMemo(
    () => (catParam && categoryOptions.some((c) => c.value === catParam) ? catParam : null),
    [catParam],
  );
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [category, setCategory] = useState(routeCategory ?? searchParams.get('cat') ?? 'all');
  const [minThermal, setMinThermal] = useState(Number(searchParams.get('thermal') ?? 0));
  const [minSound, setMinSound] = useState(Number(searchParams.get('sound') ?? 0));
  const [minStrength, setMinStrength] = useState(Number(searchParams.get('strength') ?? 0));
  const [recFilter, setRecFilter] = useState<RecLevel[]>(
    (searchParams.get('rec')?.split(',').filter((v): v is RecLevel => recLevels.includes(v as RecLevel))) ?? []
  );
  const [sort, setSort] = useState<SortKey>(((searchParams.get('sort') as SortKey) ?? 'recommended'));
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | null>(null);

  // Keep state in sync when the user navigates between category routes.
  useEffect(() => {
    if (routeCategory && routeCategory !== category) setCategory(routeCategory);
  }, [routeCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCompare = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev);
  }, []);

  const goCompare = useCallback(() => {
    if (compareIds.length >= 2) {
      navigate(`/compare-profiles?ids=${compareIds.join(',')}`);
    }
  }, [compareIds, navigate]);

  const { data: profiles = [], isLoading } = useQuery<ProfileSystemRow[]>({
    queryKey: ['public-profile-systems'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profile_systems')
        .select('*')
        .eq('status', 'published')
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as ProfileSystemRow[];
    },
  });

  // Persist filters in URL (replace, so back stays usable).
  useEffect(() => {
    const next = new URLSearchParams();
    if (search.trim()) next.set('q', search.trim());
    // On a /category/:cat route, the category is in the path — don't duplicate in query.
    if (!routeCategory && category !== 'all') next.set('cat', category);
    if (minThermal > 0) next.set('thermal', String(minThermal));
    if (minSound > 0) next.set('sound', String(minSound));
    if (minStrength > 0) next.set('strength', String(minStrength));
    if (recFilter.length) next.set('rec', recFilter.join(','));
    if (sort !== 'recommended') next.set('sort', sort);
    setSearchParams(next, { replace: true });
  }, [search, category, minThermal, minSound, minStrength, recFilter, sort, setSearchParams, routeCategory]);

  // Live counts per category over the full published set (always-on stats strip).
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    profiles.forEach((p) => map.set(p.category ?? '', (map.get(p.category ?? '') ?? 0) + 1));
    return map;
  }, [profiles]);

  const toggleRec = useCallback((lvl: RecLevel) => {
    setRecFilter((prev) => prev.includes(lvl) ? prev.filter((x) => x !== lvl) : [...prev, lvl]);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = profiles.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (minThermal > 0 && (p.thermal_insulation_rating ?? 0) < minThermal) return false;
      if (minSound > 0 && (p.sound_insulation_rating ?? 0) < minSound) return false;
      if (minStrength > 0 && (p.strength_rating ?? 0) < minStrength) return false;
      if (recFilter.length && !recFilter.includes((p.recommendation_level ?? 'standard') as RecLevel)) return false;
      if (q) {
        const hit = (p.name_ar ?? '').toLowerCase().includes(q) || (p.name_en ?? '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
    const sorted = [...list];
    const dir = (n: number | null | undefined) => n ?? 0;
    switch (sort) {
      case 'views': sorted.sort((a, b) => dir(b.views_count) - dir(a.views_count)); break;
      case 'name': sorted.sort((a, b) => (language === 'ar' ? (a.name_ar || '').localeCompare(b.name_ar || '', 'ar') : (a.name_en || a.name_ar || '').localeCompare(b.name_en || b.name_ar || '', 'en'))); break;
      case 'thermal': sorted.sort((a, b) => dir(b.thermal_insulation_rating) - dir(a.thermal_insulation_rating)); break;
      case 'sound': sorted.sort((a, b) => dir(b.sound_insulation_rating) - dir(a.sound_insulation_rating)); break;
      case 'strength': sorted.sort((a, b) => dir(b.strength_rating) - dir(a.strength_rating)); break;
      default: /* recommended: keep sort_order from DB */ break;
    }
    return sorted;
  }, [profiles, category, minThermal, minSound, minStrength, recFilter, search, sort, language]);

  const activeFilters =
    (category !== 'all' ? 1 : 0) +
    (minThermal > 0 ? 1 : 0) +
    (minSound > 0 ? 1 : 0) +
    (minStrength > 0 ? 1 : 0) +
    recFilter.length +
    (sort !== 'recommended' ? 1 : 0);

  const resetAll = useCallback(() => {
    setSearch(''); if (!routeCategory) setCategory('all');
    setMinThermal(0); setMinSound(0); setMinStrength(0);
    setRecFilter([]); setSort('recommended');
  }, [routeCategory]);

  // Quick lookup for the floating compare bar thumbnails.
  const selectedProfiles = useMemo(
    () => compareIds.map((id) => profiles.find((p) => p.id === id)).filter((p): p is ProfileSystemRow => !!p),
    [compareIds, profiles]
  );

  // ── Auto-suggestions: profile names + matching categories + spec hints ──
  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || q.length < 1) return [] as Array<{ key: string; kind: 'profile' | 'category' | 'spec'; label: string; sub?: string; onSelect: () => void }>;
    const out: Array<{ key: string; kind: 'profile' | 'category' | 'spec'; label: string; sub?: string; onSelect: () => void }> = [];
    categoryOptions.filter((c) => c.value !== 'all').forEach((c) => {
      if (c.ar.toLowerCase().includes(q) || c.en.toLowerCase().includes(q) || c.value.includes(q)) {
        const n = categoryCounts.get(c.value) ?? 0;
        out.push({
          key: `cat-${c.value}`, kind: 'category',
          label: language === 'ar' ? c.ar : c.en,
          sub: `${fmtNum(n)} ${isRTL ? 'قطاع' : 'profiles'}`,
          onSelect: () => { setCategory(c.value); setSearch(''); setSearchFocused(false); },
        });
      }
    });
    profiles.forEach((p) => {
      const hay = `${p.name_ar ?? ''} ${p.name_en ?? ''}`.toLowerCase();
      if (hay.includes(q)) {
        const co = categoryOptions.find((c) => c.value === p.category);
        out.push({
          key: `p-${p.id}`, kind: 'profile',
          label: language === 'ar' ? (p.name_ar || p.name_en || '') : (p.name_en || p.name_ar || ''),
          sub: co ? (language === 'ar' ? co.ar : co.en) : (p.category ?? ''),
          onSelect: () => { setSearchFocused(false); navigate(`/profile-systems/${p.slug}`); },
        });
      }
    });
    // Spec/property hints: thermal / sound / strength
    const specHints: Array<{ kw: string[]; label: string; apply: () => void }> = [
      { kw: ['ther', 'حرار', 'عزل حراري'], label: isRTL ? 'عزل حراري ≥ 7' : 'Thermal ≥ 7', apply: () => setMinThermal(7) },
      { kw: ['sound', 'صوت', 'عزل صوتي'], label: isRTL ? 'عزل صوتي ≥ 7' : 'Sound ≥ 7', apply: () => setMinSound(7) },
      { kw: ['stren', 'تحمل', 'قوة'], label: isRTL ? 'تحمل ≥ 7' : 'Strength ≥ 7', apply: () => setMinStrength(7) },
      { kw: ['premium', 'احتر'], label: isRTL ? 'احترافي فقط' : 'Premium only', apply: () => setRecFilter(['premium']) },
    ];
    specHints.forEach((h, i) => {
      if (h.kw.some((k) => q.includes(k))) {
        out.push({
          key: `sp-${i}`, kind: 'spec', label: h.label,
          sub: isRTL ? 'تطبيق فلتر' : 'Apply filter',
          onSelect: () => { h.apply(); setSearch(''); setSearchFocused(false); },
        });
      }
    });
    return out.slice(0, 8);
  }, [search, profiles, categoryCounts, language, isRTL, navigate]);

  // ── Export handlers ──
  const handleCSV = useCallback(() => {
    if (filtered.length === 0) return;
    exportProfilesCSV(filtered, language === 'ar' ? 'ar' : 'en');
    toast.success(isRTL ? 'تم تنزيل ملف CSV' : 'CSV downloaded');
  }, [filtered, language, isRTL]);
  const handlePDF = useCallback(async () => {
    if (filtered.length === 0) return;
    try {
      setExporting('pdf');
      await exportProfilesPDF(filtered, language === 'ar' ? 'ar' : 'en');
      toast.success(isRTL ? 'تم تنزيل ملف PDF' : 'PDF downloaded');
    } catch (err) {
      toast.error(isRTL ? 'تعذّر إنشاء PDF' : 'Failed to generate PDF');
      console.error(err);
    } finally {
      setExporting(null);
    }
  }, [filtered, language, isRTL]);

  // ── SEO: per-category titles, descriptions and JSON-LD ──
  const activeCatMeta = useMemo(
    () => routeCategory ? categoryOptions.find((c) => c.value === routeCategory) ?? null : null,
    [routeCategory],
  );
  const seoTitle = activeCatMeta
    ? (isRTL
      ? `أنظمة قطاعات ${activeCatMeta.ar} — مواصفات وتقييمات | قِطاعات`
      : `${activeCatMeta.en} Profile Systems — Specs & Ratings | Qitaat`)
    : (isRTL ? 'دليل القطاعات والأنظمة — مواصفات ومقارنات | قِطاعات' : 'Profile Systems Guide — Specs & Comparison | Qitaat');
  const seoDesc = activeCatMeta
    ? (isRTL
      ? `استكشف أنظمة قطاعات ${activeCatMeta.ar} المتوفرة في السوق السعودي مع تقييمات العزل الحراري والصوتي والتحمل والمقارنة بين الأنظمة.`
      : `Explore ${activeCatMeta.en.toLowerCase()} profile systems with thermal, sound and strength ratings, available colors, and side-by-side comparison.`)
    : (isRTL ? 'تعرف على أنظمة قطاعات الألمنيوم والحديد والزجاج والخشب ومواصفاتها وتقييماتها وقارن بينها.' : 'Browse aluminum, iron, glass and wood profile systems with specifications, ratings and comparison.');
  const canonical = activeCatMeta
    ? `https://qitaat.com/profile-systems/category/${activeCatMeta.value}`
    : 'https://qitaat.com/profile-systems';

  usePageMeta({ title: seoTitle, description: seoDesc, canonical });

  const jsonLd = useMemo(() => {
    const blocks: Record<string, unknown>[] = [];
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: isRTL ? 'الرئيسية' : 'Home', item: 'https://qitaat.com/' },
        { '@type': 'ListItem', position: 2, name: isRTL ? 'أنظمة القطاعات' : 'Profile Systems', item: 'https://qitaat.com/profile-systems' },
        ...(activeCatMeta ? [{ '@type': 'ListItem', position: 3, name: isRTL ? activeCatMeta.ar : activeCatMeta.en, item: canonical }] : []),
      ],
    });
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: seoTitle,
      description: seoDesc,
      url: canonical,
      inLanguage: isRTL ? 'ar-SA' : 'en',
    });
    if (filtered.length) {
      blocks.push({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        numberOfItems: filtered.length,
        itemListElement: filtered.slice(0, 30).map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `https://qitaat.com/profile-systems/${p.slug}`,
          name: isRTL ? (p.name_ar || p.name_en || '') : (p.name_en || p.name_ar || ''),
        })),
      });
    }
    return blocks;
  }, [filtered, activeCatMeta, isRTL, seoTitle, seoDesc, canonical]);
  useMultiJsonLd(jsonLd);

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      {/* ═══ Hero with search ═══ */}
      <div className="bg-primary pt-20 sm:pt-24 pb-6 sm:pb-8">
        <div className="container mx-auto px-3 sm:px-4 max-w-6xl">
          <div className="text-center mb-4 sm:mb-6">
            <Layers className="w-8 h-8 sm:w-10 sm:h-10 text-accent mx-auto mb-2 sm:mb-3" />
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary-foreground mb-1 sm:mb-2">
              {isRTL ? 'دليل القطاعات والأنظمة' : 'Profile Systems Guide'}
            </h1>
            <p className="text-primary-foreground/60 font-body text-sm sm:text-base">
              {isRTL ? 'استكشف القطاعات بمواصفاتها الفنية وقارن بينها' : 'Explore profile systems with technical specifications and compare'}
            </p>
            <Link to="/compare-profiles" className="inline-block mt-2 sm:mt-3">
              <Button variant="hero" size="sm" className="gap-1 text-xs sm:text-sm h-8 sm:h-9">
                <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {isRTL ? 'مقارنة القطاعات' : 'Compare'}
              </Button>
            </Link>
          </div>

          {/* Search + filter toggle (mobile) */}
          <div className="flex gap-2 mb-2 sm:mb-0">
            <div className="relative flex-1">
              <Search className="absolute top-2.5 text-muted-foreground w-4 h-4" style={{ insetInlineStart: '12px' }} />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                placeholder={isRTL ? 'ابحث عن قطاع...' : 'Search profiles...'}
                className="ps-10 bg-card h-10 text-sm"
                aria-label={isRTL ? 'بحث في القطاعات' : 'Search profiles'}
                aria-autocomplete="list"
                aria-expanded={searchFocused && suggestions.length > 0}
                role="combobox"
              />
              {searchFocused && suggestions.length > 0 && (
                <div
                  className="absolute z-30 mt-1 inset-x-0 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1"
                  role="listbox"
                  aria-label={isRTL ? 'اقتراحات البحث' : 'Search suggestions'}
                >
                  {suggestions.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); s.onSelect(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-start hover:bg-muted transition-colors"
                      role="option"
                      aria-selected={false}
                    >
                      {s.kind === 'profile' ? <Layers className="w-3.5 h-3.5 text-accent shrink-0" /> :
                        s.kind === 'category' ? <Filter className="w-3.5 h-3.5 text-primary shrink-0" /> :
                        <SlidersHorizontal className="w-3.5 h-3.5 text-warning shrink-0" />}
                      <span className="flex-1 text-xs sm:text-sm text-foreground truncate">{s.label}</span>
                      {s.sub && <span className="text-[10px] sm:text-[11px] text-muted-foreground shrink-0">{s.sub}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Export actions */}
            <Button
              variant="outline"
              size="icon"
              className="bg-card h-10 w-10 shrink-0 hidden sm:inline-flex"
              onClick={handleCSV}
              disabled={filtered.length === 0}
              title={isRTL ? 'تنزيل CSV' : 'Download CSV'}
              aria-label={isRTL ? 'تنزيل النتائج كملف CSV' : 'Download results as CSV'}
            >
              <FileDown className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="bg-card h-10 w-10 shrink-0 hidden sm:inline-flex"
              onClick={handlePDF}
              disabled={filtered.length === 0 || exporting === 'pdf'}
              title={isRTL ? 'تنزيل PDF' : 'Download PDF'}
              aria-label={isRTL ? 'تنزيل النتائج كملف PDF' : 'Download results as PDF'}
            >
              <FileText className={`w-4 h-4 ${exporting === 'pdf' ? 'animate-pulse' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="sm:hidden bg-card h-10 w-10 shrink-0 relative"
              onClick={() => setShowFilters(!showFilters)}
              aria-label={isRTL ? 'الفلاتر' : 'Filters'}
              aria-expanded={showFilters}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {activeFilters > 0 && (
                <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[9px] flex items-center justify-center font-bold tabular-nums">{activeFilters}</span>
              )}
            </Button>
          </div>

          {/* Filters - collapsible on mobile */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 bg-primary-foreground/5 p-3 sm:p-4 rounded-xl mt-2 transition-all ${showFilters ? 'block' : 'hidden sm:grid'}`}>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-card h-10 text-sm"><Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 me-1 shrink-0" /><SelectValue /></SelectTrigger>
              <SelectContent>
                {categoryOptions.map(c => <SelectItem key={c.value} value={c.value}>{language === 'ar' ? c.ar : c.en}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="bg-card h-10 text-sm"><ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 me-1 shrink-0" /><SelectValue /></SelectTrigger>
              <SelectContent>
                {sortOptions.map(s => <SelectItem key={s.value} value={s.value}>{language === 'ar' ? s.ar : s.en}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5 bg-card rounded-md px-2 h-10">
              <Thermometer className="w-4 h-4 text-warning shrink-0" />
              <span className="text-[11px] text-muted-foreground whitespace-nowrap tabular-nums tech-content">≥ {fmtNum(minThermal)}</span>
              <Slider value={[minThermal]} onValueChange={v => setMinThermal(v[0])} max={10} step={1} className="flex-1" aria-label={isRTL ? 'حد العزل الحراري' : 'Min thermal'} />
            </div>
            <div className="flex items-center gap-1.5 bg-card rounded-md px-2 h-10">
              <Volume2 className="w-4 h-4 text-sky-500 shrink-0" />
              <span className="text-[11px] text-muted-foreground whitespace-nowrap tabular-nums tech-content">≥ {fmtNum(minSound)}</span>
              <Slider value={[minSound]} onValueChange={v => setMinSound(v[0])} max={10} step={1} className="flex-1" aria-label={isRTL ? 'حد العزل الصوتي' : 'Min sound'} />
            </div>
            <div className="flex items-center gap-1.5 bg-card rounded-md px-2 h-10">
              <Shield className="w-4 h-4 text-success shrink-0" />
              <span className="text-[11px] text-muted-foreground whitespace-nowrap tabular-nums tech-content">≥ {fmtNum(minStrength)}</span>
              <Slider value={[minStrength]} onValueChange={v => setMinStrength(v[0])} max={10} step={1} className="flex-1" aria-label={isRTL ? 'حد التحمل' : 'Min strength'} />
            </div>
            {/* Recommendation chips + reset */}
            <div className="flex flex-wrap items-center gap-1.5 lg:col-span-3" role="group" aria-label={isRTL ? 'مستوى التوصية' : 'Recommendation level'}>
              {recLevels.map((lvl) => {
                const meta = recommendationLabels[lvl];
                const active = recFilter.includes(lvl);
                const Icon = lvl === 'premium' ? Award : lvl === 'recommended' ? Sparkles : Layers;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => toggleRec(lvl)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[11px] font-medium transition-all border ${active ? `${meta.color} border-transparent shadow-sm` : 'bg-card/80 text-primary-foreground/80 border-primary-foreground/15 hover:bg-card'}`}
                  >
                    <Icon className="w-3 h-3" />
                    {language === 'ar' ? meta.ar : meta.en}
                  </button>
                );
              })}
              {activeFilters > 0 && (
                <button
                  type="button"
                  onClick={resetAll}
                  className="ms-auto inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[11px] font-medium text-primary-foreground/80 hover:text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/15 transition-colors"
                  aria-label={isRTL ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
                >
                  <RotateCcw className="w-3 h-3" />
                  {isRTL ? 'إعادة ضبط' : 'Reset'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Category chips (mobile horizontal scroll) ═══ */}
      <div className="border-b border-border/50 bg-card/50 sm:hidden">
        <div className="overflow-x-auto no-scrollbar px-3 py-2.5">
          <div className="flex gap-1.5 w-max">
            {categoryOptions.map(c => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  category === c.value
                    ? 'bg-accent text-accent-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {language === 'ar' ? c.ar : c.en}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Results ═══ */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-6xl">
        {/* Live insights strip — per-category counters with live totals. */}
        {profiles.length > 0 && (
          <div
            className="mb-3 sm:mb-4 flex items-center gap-2 overflow-x-auto no-scrollbar"
            role="region"
            aria-label={isRTL ? 'إحصائيات حسب الفئة' : 'Counts by category'}
          >
            {categoryOptions.filter(c => c.value !== 'all' || true).map((c) => {
              const n = c.value === 'all' ? profiles.length : (categoryCounts.get(c.value) ?? 0);
              if (c.value !== 'all' && n === 0) return null;
              const active = category === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[11px] font-medium border transition-all ${active ? 'bg-accent text-accent-foreground border-transparent shadow-sm' : 'bg-card text-muted-foreground border-border hover:text-foreground'}`}
                >
                  <span>{language === 'ar' ? c.ar : c.en}</span>
                  <span className={`tabular-nums tech-content text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-accent-foreground/15' : 'bg-muted'}`}>{fmtNum(n)}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            <span className="tabular-nums tech-content font-semibold text-foreground">{fmtNum(filtered.length)}</span>{' '}
            {isRTL ? `من ${fmtNum(profiles.length)} قطاع` : `of ${fmtNum(profiles.length)} profiles`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCSV}
              disabled={filtered.length === 0}
              className="sm:hidden text-[11px] inline-flex items-center gap-1 px-2 h-7 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-50"
              aria-label={isRTL ? 'تنزيل CSV' : 'Download CSV'}
            >
              <FileDown className="w-3 h-3" /> CSV
            </button>
            <button
              onClick={handlePDF}
              disabled={filtered.length === 0 || exporting === 'pdf'}
              className="sm:hidden text-[11px] inline-flex items-center gap-1 px-2 h-7 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-50"
              aria-label={isRTL ? 'تنزيل PDF' : 'Download PDF'}
            >
              <FileText className="w-3 h-3" /> PDF
            </button>
            {activeFilters > 0 && (
              <button onClick={resetAll} className="text-[11px] sm:text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                {isRTL ? 'مسح الفلاتر' : 'Clear filters'}
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 sm:py-20 text-muted-foreground">
            <Layers className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-30" />
            <p className="font-heading font-bold text-sm sm:text-base mb-1">
              {profiles.length === 0
                ? (isRTL ? 'لا توجد قطاعات منشورة بعد' : 'No published profiles yet')
                : (isRTL ? 'لا توجد قطاعات مطابقة' : 'No matching profiles')}
            </p>
            <p className="text-xs sm:text-sm">
              {profiles.length === 0
                ? (isRTL ? 'سيتمّ عرض القطاعات هنا فور نشرها من قبل الإدارة' : 'Profiles will appear here once published')
                : (isRTL ? 'جرّب تغيير معايير البحث' : 'Try adjusting your filters')}
            </p>
            {activeFilters > 0 && (
              <Button variant="outline" size="sm" className="mt-4" onClick={resetAll}>
                <RotateCcw className="w-3.5 h-3.5 me-1" />
                {isRTL ? 'إعادة ضبط' : 'Reset'}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {filtered.map((p) => {
              const rec = recommendationLabels[p.recommendation_level ?? 'standard'] || recommendationLabels.standard;
              const isSelected = compareIds.includes(p.id);
              return (
                <Link key={p.id} to={`/profile-systems/${p.slug}`}>
                  <Card className={`overflow-hidden border-border/50 transition-all group h-full active:scale-[0.98] sm:hover:border-gold/30 sm:hover:shadow-lg ${isSelected ? 'ring-2 ring-accent' : ''}`}>
                    {/* Image */}
                    <div className="aspect-[16/10] bg-muted relative">
                      {p.cover_image_url ? (
                        <img src={p.cover_image_url} alt={p.name_ar} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                          <Layers className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/20" />
                        </div>
                      )}
                      <Badge className={`absolute top-2 start-2 text-[9px] sm:text-[10px] ${rec.color}`}>
                        {language === 'ar' ? rec.ar : rec.en}
                      </Badge>
                      <Badge variant="outline" className="absolute top-2 end-2 text-[9px] sm:text-[10px] bg-background/80 backdrop-blur-sm">
                        {(() => {
                          const co = categoryOptions.find(c => c.value === p.category);
                          return co ? (language === 'ar' ? co.ar : co.en) : (p.category ?? '');
                        })()}
                      </Badge>
                    </div>

                    <CardContent className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                      {/* Title row */}
                      <div className="flex items-start gap-2">
                        {p.logo_url && <img src={p.logo_url} alt={language === 'ar' ? p.name_ar : (p.name_en || p.name_ar)} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain bg-muted p-1 shrink-0" />}
                        <div className="min-w-0">
                          <h3 className="font-heading font-bold text-sm sm:text-base group-hover:text-accent transition-colors truncate">
                            {language === 'ar' ? p.name_ar : (p.name_en || p.name_ar)}
                          </h3>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {p.profile_type === 'custom' ? (isRTL ? 'تصميم خاص' : 'Custom') : (isRTL ? 'قطاع سوق' : 'Market')}
                          </p>
                        </div>
                      </div>

                      {/* Rating bars */}
                      <div className="space-y-1 sm:space-y-1.5">
                        <RatingBar value={p.thermal_insulation_rating ?? 0} label={isRTL ? 'حراري' : 'Thermal'} icon={Thermometer} />
                        <RatingBar value={p.sound_insulation_rating ?? 0} label={isRTL ? 'صوتي' : 'Sound'} icon={Volume2} />
                        <RatingBar value={p.strength_rating ?? 0} label={isRTL ? 'التحمل' : 'Strength'} icon={Shield} />
                      </div>

                      {/* Meta tags */}
                      <div className="flex flex-wrap gap-1.5 text-[9px] sm:text-[10px] text-muted-foreground tech-content">
                        {p.max_height_mm && (
                          <span className="flex items-center gap-0.5 bg-muted px-1.5 sm:px-2 py-0.5 rounded-full">
                            <Ruler className="w-2.5 h-2.5 sm:w-3 sm:h-3" />{fmtNum(p.max_height_mm)}mm
                          </span>
                        )}
                        {(p.available_colors?.length ?? 0) > 0 && (
                          <span className="bg-muted px-1.5 sm:px-2 py-0.5 rounded-full">
                            {fmtNum(p.available_colors?.length ?? 0)} {isRTL ? 'لون' : 'colors'}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5 bg-muted px-1.5 sm:px-2 py-0.5 rounded-full">
                          <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3" />{fmtNum(p.views_count ?? 0)}
                        </span>
                      </div>

                      {/* Compare button */}
                      <Button
                        size="sm"
                        variant={isSelected ? 'default' : 'outline'}
                        className="w-full text-[10px] sm:text-xs h-8 sm:h-9"
                        onClick={(e) => toggleCompare(p.id, e)}
                        aria-pressed={isSelected}
                      >
                        <Scale className="w-3 h-3 me-1" />
                        {isSelected ? (isRTL ? 'تم الاختيار ✓' : 'Selected ✓') : (isRTL ? 'أضف للمقارنة' : 'Compare')}
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* Floating compare bar with thumbnails of selected profiles */}
        {compareIds.length >= 1 && (
          <div
            className="fixed bottom-4 sm:bottom-6 inset-x-3 sm:inset-x-auto sm:start-1/2 sm:-translate-x-1/2 z-50 bg-primary text-primary-foreground px-3 sm:px-5 py-2.5 rounded-2xl shadow-2xl flex items-center justify-between sm:justify-start gap-3 animate-in slide-in-from-bottom-4 border border-primary-foreground/10 backdrop-blur"
            role="region"
            aria-label={isRTL ? 'شريط المقارنة' : 'Compare bar'}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Scale className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <div className="flex -space-x-2 rtl:space-x-reverse">
                {selectedProfiles.slice(0, 4).map((p) => (
                  <div key={p.id} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full ring-2 ring-primary bg-muted overflow-hidden shrink-0">
                    {p.cover_image_url ? (
                      <img src={p.cover_image_url} alt={p.name_ar} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center"><Layers className="w-3 h-3 text-muted-foreground" /></div>
                    )}
                  </div>
                ))}
              </div>
              <span className="font-medium text-xs sm:text-sm tabular-nums tech-content whitespace-nowrap">
                {fmtNum(compareIds.length)}<span className="opacity-60">/4</span>
              </span>
            </div>
            <div className="flex items-center gap-2 ms-auto">
              <Button
                size="sm"
                variant="hero"
                onClick={goCompare}
                disabled={compareIds.length < 2}
                className="text-xs h-8 sm:h-9 disabled:opacity-50"
                title={compareIds.length < 2 ? (isRTL ? 'اختر قطاعَين على الأقل' : 'Select at least 2') : undefined}
              >
                {isRTL ? 'قارن الآن' : 'Compare'}
              </Button>
              <button onClick={() => setCompareIds([])} className="text-primary-foreground/60 hover:text-primary-foreground p-1" aria-label={isRTL ? 'مسح الاختيار' : 'Clear selection'}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default ProfileSystems;
