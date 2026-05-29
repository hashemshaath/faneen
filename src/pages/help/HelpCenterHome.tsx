import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search, BookOpen, MessageSquare, Lightbulb, ArrowRight, LifeBuoy,
  Clock, TrendingUp, Loader2, X, Bookmark, Library, Tag, Sparkles, FileText,
} from 'lucide-react';
import {
  listHelpCategories,
  listPopularArticles,
  searchHelpArticles,
  logHelpSearch,
  listPublishedArticles,
  readRecentlyViewedSlugs,
  readHelpBookmarks,
  type HelpArticle,
  type HelpCategory,
  type HelpAudience,
} from '@/modules/helpCenter';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { fmtNum, fmtDate } from '@/lib/format';

const pickTitle = (a: HelpArticle | HelpCategory, lang: 'ar' | 'en') => (lang === 'ar' ? a.title_ar : a.title_en);
const pickDesc = (c: HelpCategory, lang: 'ar' | 'en') => (lang === 'ar' ? c.description_ar : c.description_en) ?? '';

const HelpCenterHome: React.FC = () => {
  const { isRTL, language } = useLanguage();
  usePageMeta({
    title: isRTL ? 'مركز المساعدة | قِطاعات' : 'Help Center | Qitaat',
    description: isRTL ? 'دليلك للبدء، الإجابات السريعة، وإعداد التقارير.' : 'Your guide for getting started, quick answers, and reports.',
    canonical: 'https://qitaat.com/help',
  });
  const [q, setQ] = useState('');
  const [audience, setAudience] = useState<HelpAudience | 'all'>('all');
  const [trendTab, setTrendTab] = useState<'popular' | 'recent' | 'helpful'>('popular');
  const [browseAllOpen, setBrowseAllOpen] = useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const { data: cats = [] } = useQuery({ queryKey: ['help', 'categories'], queryFn: listHelpCategories });
  const { data: popular = [] } = useQuery({ queryKey: ['help', 'popular'], queryFn: () => listPopularArticles(6) });
  const { data: results = [], isFetching: searching } = useQuery({
    queryKey: ['help', 'search', q],
    queryFn: () => searchHelpArticles({ q, limit: 12 }),
    enabled: q.trim().length > 1,
  });
  const { data: allArticles = [] } = useQuery({
    queryKey: ['help', 'all-published-home'],
    queryFn: () => listPublishedArticles({ limit: 500 }),
    staleTime: 5 * 60_000,
  });

  const recentSlugs = useMemo(() => readRecentlyViewedSlugs(), []);
  const recentArticles = useMemo(
    () =>
      recentSlugs
        .map((s) => allArticles.find((a) => a.slug === s))
        .filter((a): a is HelpArticle => Boolean(a))
        .slice(0, 4),
    [recentSlugs, allArticles],
  );

  const bookmarkSlugs = useMemo(() => readHelpBookmarks(), []);
  const bookmarkedArticles = useMemo(
    () =>
      bookmarkSlugs
        .map((s) => allArticles.find((a) => a.slug === s))
        .filter((a): a is HelpArticle => Boolean(a))
        .slice(0, 6),
    [bookmarkSlugs, allArticles],
  );

  // Per-category article counts (audience-filtered)
  const audienceFilteredArticles = useMemo(
    () => (audience === 'all'
      ? allArticles
      : allArticles.filter((a) => a.audience === audience || a.audience === 'general')),
    [allArticles, audience],
  );
  const countsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    audienceFilteredArticles.forEach((a) => {
      if (!a.category_id) return;
      map.set(a.category_id, (map.get(a.category_id) ?? 0) + 1);
    });
    return map;
  }, [audienceFilteredArticles]);

  // Freshness: latest update across articles
  const latestUpdate = useMemo(() => {
    if (allArticles.length === 0) return null;
    return allArticles.reduce((max, a) => (a.updated_at > max ? a.updated_at : max), allArticles[0].updated_at);
  }, [allArticles]);
  const formattedLatest = useMemo(
    () => (latestUpdate ? fmtDate(latestUpdate, isRTL, { day: '2-digit', month: 'short', year: 'numeric' }) : ''),
    [latestUpdate, isRTL],
  );

  // Keyword cloud (top 18 keywords by frequency, audience-aware)
  const topKeywords = useMemo(() => {
    const counts = new Map<string, number>();
    audienceFilteredArticles.forEach((a) => {
      (a.keywords ?? []).forEach((k) => {
        const key = String(k).trim().toLowerCase();
        if (!key || key.length < 2) return;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 18)
      .map(([k, n]) => ({ k, n }));
  }, [audienceFilteredArticles]);

  useMultiJsonLd([
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: isRTL ? 'الرئيسية' : 'Home', item: 'https://qitaat.com/' },
        { '@type': 'ListItem', position: 2, name: isRTL ? 'مركز المساعدة' : 'Help Center', item: 'https://qitaat.com/help' },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: isRTL ? 'مركز مساعدة قِطاعات' : 'Qitaat Help Center',
      url: 'https://qitaat.com/help',
      inLanguage: language === 'ar' ? 'ar' : 'en',
      hasPart: cats.slice(0, 50).map((c) => ({
        '@type': 'WebPage',
        name: language === 'ar' ? c.title_ar : c.title_en,
        url: `https://qitaat.com/help/category/${c.slug}`,
      })),
    },
  ]);

  // Best-effort search analytics (debounced via stable query result reference)
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const t = window.setTimeout(() => { void logHelpSearch({ query: term, results_count: results.length }); }, 600);
    return () => window.clearTimeout(t);
  }, [q, results.length]);

  // Keyboard shortcut: "/" focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filteredCats = useMemo(
    () => (audience === 'all' ? cats : cats.filter((c) => c.audience === audience || c.audience === 'general')),
    [cats, audience],
  );
  const trendingArticles = useMemo(() => {
    const base = audienceFilteredArticles;
    if (trendTab === 'recent') {
      return [...base].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 6);
    }
    if (trendTab === 'helpful') {
      return [...base]
        .map((a) => {
          const votes = (a.helpful_count ?? 0) + (a.not_helpful_count ?? 0);
          const ratio = votes > 0 ? (a.helpful_count ?? 0) / votes : 0;
          return { a, score: ratio * 100 + Math.log1p(a.views_count ?? 0) };
        })
        .sort((x, y) => y.score - x.score)
        .slice(0, 6)
        .map((x) => x.a);
    }
    // popular (server-ranked by views, then audience-filter)
    const popFiltered = audience === 'all'
      ? popular
      : popular.filter((a) => a.audience === audience || a.audience === 'general');
    return popFiltered.slice(0, 6);
  }, [trendTab, audienceFilteredArticles, popular, audience]);

  // Stats
  const stats = useMemo(() => ({
    categories: filteredCats.length,
    articles: audienceFilteredArticles.length,
    totalViews: audienceFilteredArticles.reduce((sum, a) => sum + (a.views_count ?? 0), 0),
  }), [filteredCats.length, audienceFilteredArticles]);

  // Only include "admin" chip if admin-audience content actually exists
  const hasAdminContent = useMemo(
    () => allArticles.some((a) => a.audience === 'admin') || cats.some((c) => c.audience === 'admin'),
    [allArticles, cats],
  );
  const audienceChips: Array<{ key: HelpAudience | 'all'; label_ar: string; label_en: string }> = [
    { key: 'all', label_ar: 'الكل', label_en: 'All' },
    { key: 'provider', label_ar: 'مزوّدو الخدمات', label_en: 'Providers' },
    { key: 'customer', label_ar: 'العملاء', label_en: 'Customers' },
    { key: 'general', label_ar: 'عام', label_en: 'General' },
    ...(hasAdminContent ? [{ key: 'admin' as const, label_ar: 'المشرفون', label_en: 'Admins' }] : []),
  ];

  // Articles grouped by category for the "Browse all" index
  const articlesByCategory = useMemo(() => {
    const groups: Array<{ cat: HelpCategory; items: HelpArticle[] }> = [];
    filteredCats.forEach((c) => {
      const items = audienceFilteredArticles
        .filter((a) => a.category_id === c.id)
        .sort((a, b) => (language === 'ar' ? a.title_ar.localeCompare(b.title_ar, 'ar') : a.title_en.localeCompare(b.title_en)));
      if (items.length > 0) groups.push({ cat: c, items });
    });
    return groups;
  }, [filteredCats, audienceFilteredArticles, language]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="bg-primary text-primary-foreground pt-28 pb-16">
          <div className="container max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/10 mb-5">
              <LifeBuoy className="w-4 h-4 text-accent" />
              <span className="text-xs font-medium">{isRTL ? 'مركز المساعدة' : 'Help Center'}</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-heading font-black mb-4">
              {isRTL ? 'كيف يمكننا مساعدتك؟' : 'How can we help you?'}
            </h1>
            <p className="text-primary-foreground/70 mb-6 text-sm sm:text-base">
              {isRTL ? 'ابحث عن أي موضوع، تصفّح الأقسام، أو راسلنا مباشرة.' : 'Search any topic, browse categories, or contact us directly.'}
            </p>
            <div className="relative">
              <Search className="absolute top-3.5 start-4 w-5 h-5 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchRef}
                dir="auto"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={isRTL ? 'ابحث في مركز المساعدة…' : 'Search the help center…'}
                className="h-12 ps-12 pe-24 rounded-xl text-foreground"
                aria-label={isRTL ? 'بحث في مركز المساعدة' : 'Search help center'}
              />
              <div className="absolute top-1/2 -translate-y-1/2 end-3 flex items-center gap-1.5">
                {searching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                {q && (
                  <button
                    type="button"
                    onClick={() => setQ('')}
                    className="p-1 rounded-md hover:bg-muted text-muted-foreground"
                    aria-label={isRTL ? 'مسح البحث' : 'Clear search'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <kbd className="hidden sm:inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded border border-border bg-muted text-[10px] font-mono text-muted-foreground">
                  /
                </kbd>
              </div>
            </div>
            {q.trim().length > 1 && (
              <div className="mt-4 text-start bg-background text-foreground rounded-xl p-3 border border-border shadow-md max-h-96 overflow-auto">
                {searching && results.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-3 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {isRTL ? 'جارٍ البحث…' : 'Searching…'}
                  </div>
                ) : results.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-3">
                    {isRTL ? `لا توجد نتائج لـ "${q}". جرّب كلمات مختلفة أو ` : `No results for "${q}". Try other keywords or `}
                    <Link to="/help/report-issue" className="text-primary hover:underline">
                      {isRTL ? 'الإبلاغ عن مشكلة' : 'report an issue'}
                    </Link>.
                  </div>
                ) : (
                  <>
                    <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                      {isRTL ? `${results.length} نتيجة` : `${results.length} results`}
                    </div>
                    {results.map((a) => (
                    <Link key={a.id} to={`/help/article/${a.slug}`} className="block p-2 rounded hover:bg-muted">
                      <div className="font-medium">{pickTitle(a, language)}</div>
                      <div className="text-xs text-muted-foreground">{language === 'ar' ? a.summary_ar : a.summary_en}</div>
                    </Link>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Audience filter chips */}
        <section className="container pt-8">
          <div className="flex flex-wrap items-center gap-2 justify-center">
            <span className="text-xs text-muted-foreground me-2">{isRTL ? 'تصفّح حسب:' : 'Browse by:'}</span>
            {audienceChips.map((chip) => {
              const active = audience === chip.key;
              return (
                <button
                  key={chip.key}
                  onClick={() => setAudience(chip.key)}
                  className={`px-3 h-8 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:bg-muted'
                  }`}
                >
                  {isRTL ? chip.label_ar : chip.label_en}
                </button>
              );
            })}
          </div>
        </section>

        {/* Stats strip */}
        <section className="container pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="rounded-xl hover-lift"><CardContent className="p-5">
              <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2 font-semibold">{isRTL ? 'الأقسام' : 'Categories'}</div>
              <div className="num-display text-4xl md:text-5xl text-foreground">{fmtNum(stats.categories)}</div>
            </CardContent></Card>
            <Card className="rounded-xl hover-lift"><CardContent className="p-5">
              <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2 font-semibold">{isRTL ? 'المقالات' : 'Articles'}</div>
              <div className="num-display text-4xl md:text-5xl text-foreground">{fmtNum(stats.articles)}</div>
            </CardContent></Card>
            <Card className="rounded-xl hover-lift"><CardContent className="p-5">
              <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2 font-semibold">{isRTL ? 'إجمالي المشاهدات' : 'Total views'}</div>
              <div className="num-display text-4xl md:text-5xl text-primary">{fmtNum(stats.totalViews)}</div>
            </CardContent></Card>
            <Card className="rounded-xl hover-lift"><CardContent className="p-5">
              <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2 font-semibold">{isRTL ? 'آخر تحديث' : 'Last updated'}</div>
              <div className="num-tabular text-base font-semibold mt-3">{formattedLatest || '—'}</div>
            </CardContent></Card>
          </div>
        </section>

        {/* Bookmarks */}
        {bookmarkedArticles.length > 0 && (
          <section className="container pt-10">
            <div className="flex items-center gap-2 mb-4">
              <Bookmark className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {isRTL ? 'محفوظاتك' : 'Your bookmarks'}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {bookmarkedArticles.map((a) => (
                <Link key={a.id} to={`/help/article/${a.slug}`} className="hover-lift">
                  <Card className="rounded-xl h-full"><CardContent className="p-4 flex items-start gap-3">
                    <Bookmark className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="text-sm font-semibold line-clamp-2">{pickTitle(a, language)}</div>
                  </CardContent></Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {recentArticles.length > 0 && (
          <section className="container pt-10">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {isRTL ? 'تابعت قراءته مؤخّرًا' : 'Recently viewed'}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {recentArticles.map((a) => (
                <Link key={a.id} to={`/help/article/${a.slug}`} className="hover-lift">
                  <Card className="rounded-xl h-full">
                    <CardContent className="p-4">
                      <div className="text-sm font-semibold line-clamp-2">{pickTitle(a, language)}</div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="container py-12">
          <h2 className="text-2xl font-heading font-bold mb-6">
            {isRTL ? 'الأقسام' : 'Categories'}
            <span className="text-sm font-normal text-muted-foreground ms-2">({filteredCats.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCats.map((c) => (
              <Link key={c.id} to={`/help/category/${c.slug}`} className="hover-lift">
                <Card className="h-full rounded-xl">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{pickTitle(c, language)}</CardTitle>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">{c.audience}</Badge>
                        <Badge variant="outline" className="text-[10px] tech-content">
                          {countsByCategory.get(c.id) ?? 0}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{pickDesc(c, language)}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {filteredCats.length === 0 && (
              <div className="col-span-full text-center text-sm text-muted-foreground py-8">
                {isRTL ? 'لا توجد أقسام مطابقة. جرّب تصفية أخرى.' : 'No matching categories. Try a different filter.'}
              </div>
            )}
          </div>
        </section>

        <section className="container py-12">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              {isRTL ? 'مختارات' : 'Highlights'}
            </h2>
            <div className="inline-flex rounded-xl border border-border bg-background p-1 text-xs">
              {([
                { key: 'popular', ar: 'الأكثر مشاهدة', en: 'Most viewed' },
                { key: 'recent', ar: 'الأحدث', en: 'Most recent' },
                { key: 'helpful', ar: 'الأكثر إفادة', en: 'Most helpful' },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTrendTab(t.key)}
                  className={`px-3 h-8 rounded-lg font-medium transition-colors ${
                    trendTab === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {isRTL ? t.ar : t.en}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendingArticles.map((a) => (
              <Link key={a.id} to={`/help/article/${a.slug}`} className="hover-lift">
                <Card className="rounded-xl h-full">
                  <CardContent className="p-5">
                    <BookOpen className="w-5 h-5 text-primary mb-3" />
                    <div className="font-semibold mb-1">{pickTitle(a, language)}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{language === 'ar' ? a.summary_ar : a.summary_en}</div>
                    <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
                      <span><span className="num-tabular">{fmtNum(a.views_count ?? 0)}</span> {isRTL ? 'مشاهدة' : 'views'}</span>
                      {(a.helpful_count ?? 0) + (a.not_helpful_count ?? 0) > 0 && (
                        <span className="num-tabular">
                          {Math.round(((a.helpful_count ?? 0) / ((a.helpful_count ?? 0) + (a.not_helpful_count ?? 0))) * 100)}% 👍
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {trendingArticles.length === 0 && (
              <div className="col-span-full text-center text-sm text-muted-foreground py-8">
                {isRTL ? 'لا يوجد محتوى مطابق لهذا التصفية.' : 'No content matches this filter.'}
              </div>
            )}
          </div>
        </section>

        {/* Topic cloud */}
        {topKeywords.length > 0 && (
          <section className="container py-8">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {isRTL ? 'مواضيع شائعة' : 'Popular topics'}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {topKeywords.map(({ k, n }) => (
                <button
                  key={k}
                  onClick={() => setQ(k)}
                  className="px-3 h-8 rounded-full text-xs border border-border bg-background hover:bg-muted transition-colors"
                  aria-label={`${isRTL ? 'بحث عن' : 'Search'} ${k}`}
                >
                  <span className="me-1">{k}</span>
                  <span className="text-[10px] text-muted-foreground tech-content">({n})</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Browse all index */}
        {articlesByCategory.length > 0 && (
          <section className="container py-8">
            <button
              type="button"
              onClick={() => setBrowseAllOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-3 p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted transition-colors"
              aria-expanded={browseAllOpen}
            >
              <span className="flex items-center gap-2 font-semibold">
                <Library className="w-4 h-4 text-primary" />
                {isRTL ? 'تصفّح كل المقالات' : 'Browse all articles'}
                <Badge variant="outline" className="ms-1 text-[10px] tech-content">
                  {audienceFilteredArticles.length}
                </Badge>
              </span>
              <span className="text-xs text-muted-foreground">
                {browseAllOpen ? (isRTL ? 'إخفاء' : 'Hide') : (isRTL ? 'عرض' : 'Show')}
              </span>
            </button>
            {browseAllOpen && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {articlesByCategory.map(({ cat, items }) => (
                  <Card key={cat.id} className="rounded-xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <Link to={`/help/category/${cat.slug}`} className="hover:underline">
                          {pickTitle(cat, language)}
                        </Link>
                        <Badge variant="outline" className="text-[10px] tech-content">{items.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1.5">
                        {items.slice(0, 12).map((a) => (
                          <li key={a.id}>
                            <Link
                              to={`/help/article/${a.slug}`}
                              className="text-sm hover:text-primary hover:underline flex items-start gap-2"
                            >
                              <FileText className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                              <span className="line-clamp-1">{pickTitle(a, language)}</span>
                            </Link>
                          </li>
                        ))}
                        {items.length > 12 && (
                          <li>
                            <Link
                              to={`/help/category/${cat.slug}`}
                              className="text-xs text-primary hover:underline"
                            >
                              {isRTL ? `عرض الكل (${items.length}) ←` : `View all (${items.length}) →`}
                            </Link>
                          </li>
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="container py-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/help/report-issue" className="hover-lift">
            <Card className="rounded-xl h-full">
              <CardContent className="p-6 flex items-start gap-4">
                <MessageSquare className="w-6 h-6 text-primary" />
                <div className="flex-1">
                  <div className="font-semibold mb-1">{isRTL ? 'الإبلاغ عن مشكلة' : 'Report an issue'}</div>
                  <div className="text-sm text-muted-foreground">{isRTL ? 'أخبرنا بأي خلل تواجهه.' : 'Tell us about any bug you encounter.'}</div>
                </div>
                <ArrowRight className="w-5 h-5" />
              </CardContent>
            </Card>
          </Link>
          <Link to="/help/feature-request" className="hover-lift">
            <Card className="rounded-xl h-full">
              <CardContent className="p-6 flex items-start gap-4">
                <Lightbulb className="w-6 h-6 text-primary" />
                <div className="flex-1">
                  <div className="font-semibold mb-1">{isRTL ? 'اقتراح ميزة' : 'Request a feature'}</div>
                  <div className="text-sm text-muted-foreground">{isRTL ? 'ما الذي تتمنى رؤيته في قطاعات؟' : 'What would you love to see in Qitaat?'}</div>
                </div>
                <ArrowRight className="w-5 h-5" />
              </CardContent>
            </Card>
          </Link>
        </section>

        <section className="container pb-16 text-center">
          <Card className="rounded-xl bg-muted/40">
            <CardContent className="p-6">
              <div className="font-semibold mb-1">{isRTL ? 'تحتاج للتحدث معنا؟' : 'Need to talk to us?'}</div>
              <div className="text-sm text-muted-foreground mb-4">{isRTL ? 'فريقنا جاهز لمساعدتك.' : 'Our team is ready to help.'}</div>
              <Link to="/contact"><Button>{isRTL ? 'تواصل مع الدعم' : 'Contact Support'}</Button></Link>
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default HelpCenterHome;