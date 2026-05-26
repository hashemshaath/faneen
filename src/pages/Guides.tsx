import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { BookOpen, Search, Clock, Wrench, Layers, Shield, Settings, Hammer } from 'lucide-react';

type GuideTopic = 'all' | 'installation' | 'material-selection' | 'maintenance' | 'specs' | 'safety';

const TOPICS: { value: GuideTopic; ar: string; en: string; icon: React.ElementType }[] = [
  { value: 'all', ar: 'الكل', en: 'All', icon: BookOpen },
  { value: 'installation', ar: 'التركيب', en: 'Installation', icon: Wrench },
  { value: 'material-selection', ar: 'اختيار المواد', en: 'Material Selection', icon: Layers },
  { value: 'maintenance', ar: 'الصيانة', en: 'Maintenance', icon: Settings },
  { value: 'specs', ar: 'المواصفات', en: 'Specs', icon: Hammer },
  { value: 'safety', ar: 'السلامة', en: 'Safety', icon: Shield },
];

const SECTORS = [
  { value: 'all', ar: 'كل القطاعات', en: 'All Sectors' },
  { value: 'aluminum', ar: 'الألمنيوم', en: 'Aluminum' },
  { value: 'glass', ar: 'الزجاج', en: 'Glass' },
  { value: 'wood', ar: 'الخشب', en: 'Wood' },
  { value: 'steel', ar: 'الحديد', en: 'Steel' },
  { value: 'cabinets', ar: 'الخزائن', en: 'Cabinets' },
];

interface GuidePost {
  id: string; slug: string;
  title_ar: string; title_en: string | null;
  excerpt_ar: string | null; excerpt_en: string | null;
  cover_image_url: string | null;
  tags: string[] | null;
  guide_topic: string | null;
  reading_time_minutes: number | null;
  published_at: string | null;
  faq: Array<{ q: string; a: string }> | null;
}

const Guides = () => {
  const { isRTL, language } = useLanguage();
  const [topic, setTopic] = useState<GuideTopic>('all');
  const [sector, setSector] = useState<string>('all');
  const [q, setQ] = useState('');

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['public-guides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id,slug,title_ar,title_en,excerpt_ar,excerpt_en,cover_image_url,tags,guide_topic,reading_time_minutes,published_at,faq')
        .eq('status', 'published')
        .eq('category', 'guides')
        .order('published_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as GuidePost[];
    },
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return posts.filter((p) => {
      if (topic !== 'all' && p.guide_topic !== topic) return false;
      if (sector !== 'all' && !(p.tags || []).includes(sector)) return false;
      if (needle) {
        const hay = `${p.title_ar} ${p.title_en || ''} ${p.excerpt_ar || ''} ${p.excerpt_en || ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [posts, topic, sector, q]);

  usePageMeta({
    title: isRTL ? 'مكتبة الأدلة الفنية | قِطاعات' : 'Technical Guides Library | Qitaat',
    description: isRTL
      ? 'أدلة فنية متخصصة لتركيب الألمنيوم والزجاج والحديد والخشب والخزائن، اختيار المواد، الصيانة والمواصفات.'
      : 'Expert installation, material selection, maintenance and specs guides for aluminum, glass, steel, wood and cabinets.',
    canonical: 'https://qitaat.com/guides',
  });

  useMultiJsonLd(useMemo(() => [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: isRTL ? 'مكتبة الأدلة الفنية' : 'Technical Guides Library',
      url: 'https://qitaat.com/guides',
      description: isRTL ? 'أدلة فنية للتركيب واختيار المواد والصيانة' : 'Technical guides for installation, material selection and maintenance',
      hasPart: filtered.slice(0, 25).map((p) => ({
        '@type': 'TechArticle',
        headline: isRTL ? p.title_ar : (p.title_en || p.title_ar),
        url: `https://qitaat.com/blog/${p.slug}`,
        ...(p.published_at ? { datePublished: p.published_at } : {}),
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'قِطاعات', item: 'https://qitaat.com' },
        { '@type': 'ListItem', position: 2, name: isRTL ? 'الأدلة' : 'Guides', item: 'https://qitaat.com/guides' },
      ],
    },
  ], [filtered, isRTL]));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 sm:py-12 max-w-6xl">
        {/* Hero */}
        <header className="mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            {isRTL ? 'مكتبة الأدلة الفنية' : 'Technical Library'}
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-2">
            {isRTL ? 'أدلة التركيب واختيار المواد' : 'Installation & Material Selection Guides'}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
            {isRTL
              ? 'أدلة فنية موثوقة بأسئلة شائعة لكل قطاع — الألمنيوم، الزجاج، الحديد، الخشب والخزائن.'
              : 'Trusted technical guides with FAQs for every sector — aluminum, glass, steel, wood and cabinets.'}
          </p>
        </header>

        {/* Search */}
        <div className="relative mb-5">
          <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isRTL ? 'ابحث في الأدلة...' : 'Search guides...'}
            className="h-12 rounded-xl ps-10"
            dir="auto"
          />
        </div>

        {/* Topic tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-3">
          {TOPICS.map((t) => {
            const Icon = t.icon;
            const active = topic === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setTopic(t.value)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full text-xs font-medium border transition-colors ${
                  active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {isRTL ? t.ar : t.en}
              </button>
            );
          })}
        </div>

        {/* Sector chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-6">
          {SECTORS.map((s) => {
            const active = sector === s.value;
            return (
              <button
                key={s.value}
                onClick={() => setSector(s.value)}
                className={`shrink-0 px-3 h-8 rounded-full text-[11px] font-medium border transition-colors ${
                  active ? 'bg-foreground text-background border-foreground' : 'bg-muted/40 border-border hover:bg-muted'
                }`}
              >
                {isRTL ? s.ar : s.en}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'لا توجد أدلة مطابقة بعد. جرّب فلتراً مختلفاً.' : 'No matching guides yet. Try another filter.'}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => {
              const title = language === 'ar' ? p.title_ar : (p.title_en || p.title_ar);
              const excerpt = language === 'ar' ? (p.excerpt_ar || '') : (p.excerpt_en || p.excerpt_ar || '');
              const topicMeta = TOPICS.find((t) => t.value === p.guide_topic);
              const faqCount = Array.isArray(p.faq) ? p.faq.length : 0;
              return (
                <Link
                  key={p.id}
                  to={`/blog/${p.slug}`}
                  className="group rounded-2xl overflow-hidden border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all hover-lift"
                >
                  {p.cover_image_url ? (
                    <div className="aspect-[16/10] overflow-hidden bg-muted">
                      <img
                        src={p.cover_image_url}
                        alt={title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/10] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-primary/40" />
                    </div>
                  )}
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {topicMeta && (
                        <Badge variant="outline" className="text-[10px] px-2 py-0 border-primary/30 text-primary">
                          <topicMeta.icon className="w-2.5 h-2.5 me-1" />
                          {isRTL ? topicMeta.ar : topicMeta.en}
                        </Badge>
                      )}
                      {(p.tags || []).slice(0, 1).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] px-2 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <h2 className="font-heading font-bold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {title}
                    </h2>
                    {excerpt && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{excerpt}</p>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
                      {p.reading_time_minutes ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {p.reading_time_minutes} {isRTL ? 'د' : 'min'}
                        </span>
                      ) : null}
                      {faqCount > 0 && (
                        <span className="inline-flex items-center gap-1">
                          ❓ {faqCount} {isRTL ? 'سؤال' : 'FAQ'}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Guides;
