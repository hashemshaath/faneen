import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, BookOpen, ChevronRight, Tag } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import {
  knowledgeRegistry,
  publicCategories,
  filterKnowledge,
  searchKnowledge,
  type KnowledgeItem,
  type KnowledgeCategory,
} from '@/modules/knowledge';

/**
 * KNOWLEDGE CONTENT SEED — Phase 2 public surface.
 *
 * Unified Help / FAQ / Knowledge page sourced exclusively from the master
 * `knowledgeRegistry`. Internal categories never appear here — they are
 * filtered out by `publicCategories()`. No hardcoded copy in this file.
 */
const pickTitle = (it: KnowledgeItem | KnowledgeCategory, lang: 'ar' | 'en'): string => {
  if (lang === 'en' && it.title.en) return it.title.en;
  return it.title.ar;
};
const pickBody = (it: KnowledgeItem, lang: 'ar' | 'en'): string => {
  if (lang === 'en' && it.body.en) return it.body.en;
  return it.body.ar;
};
const pickSummary = (it: KnowledgeItem, lang: 'ar' | 'en'): string => {
  if (!it.summary) return '';
  if (lang === 'en' && it.summary.en) return it.summary.en;
  return it.summary.ar;
};

const KnowledgeCenter: React.FC = () => {
  const { isRTL, language } = useLanguage();
  const [params, setParams] = useSearchParams();
  const cats = publicCategories();
  const activeCategory = params.get('cat') ?? '';
  const [q, setQ] = useState(params.get('q') ?? '');

  usePageMeta({
    title: isRTL ? 'مركز المعرفة — قطاعات' : 'Knowledge Center — Qitaat',
    description: isRTL
      ? 'إجابات منظمة لأسئلة العملاء والمزودين وأصحاب الأعمال على منصة قطاعات.'
      : 'Organised answers for customers, providers, and businesses on Qitaat.',
    canonical: 'https://qitaat.com/knowledge',
  });

  const visiblePool = useMemo(
    () => filterKnowledge({ audience: 'visitor', status: 'published' }),
    [],
  );

  const results = useMemo(() => {
    const term = q.trim();
    if (term.length > 1) {
      // Search across all visitor-visible items, then narrow by category if set.
      const found = searchKnowledge(term, 'visitor', language === 'en' ? 'en' : 'ar', {
        status: 'published',
      });
      return activeCategory ? found.filter((i) => i.categoryId === activeCategory) : found;
    }
    return activeCategory
      ? visiblePool.filter((i) => i.categoryId === activeCategory)
      : visiblePool;
  }, [q, activeCategory, visiblePool, language]);

  useMultiJsonLd([
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: isRTL ? 'الرئيسية' : 'Home', item: 'https://qitaat.com/' },
        { '@type': 'ListItem', position: 2, name: isRTL ? 'مركز المعرفة' : 'Knowledge Center', item: 'https://qitaat.com/knowledge' },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: knowledgeRegistry
        .filter((it) => it.type === 'faq' && it.status === 'published' && it.usableByAssistant)
        .slice(0, 50)
        .map((it) => ({
          '@type': 'Question',
          name: pickTitle(it, language === 'en' ? 'en' : 'ar'),
          acceptedAnswer: {
            '@type': 'Answer',
            text: pickBody(it, language === 'en' ? 'en' : 'ar'),
          },
        })),
    },
  ]);

  const setCategory = (id: string): void => {
    const next = new URLSearchParams(params);
    if (id) next.set('cat', id); else next.delete('cat');
    setParams(next, { replace: true });
  };

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-20 sm:pt-24">
        {/* Hero */}
        <section className="bg-primary text-primary-foreground py-12 sm:py-16">
          <div className="container-app max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/10 mb-5">
              <BookOpen className="w-4 h-4" />
              <span className="text-xs font-medium">
                {isRTL ? 'مركز المعرفة' : 'Knowledge Center'}
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-heading font-black mb-3">
              {isRTL ? 'كل ما تحتاج معرفته عن قطاعات' : 'Everything you need to know about Qitaat'}
            </h1>
            <p className="text-primary-foreground/75 mb-6 text-sm sm:text-base">
              {isRTL
                ? 'إجابات حقيقية لأسئلة شائعة عن المنصة، الطلبات، العقود، والاشتراكات.'
                : 'Real answers about the platform, requests, contracts, and memberships.'}
            </p>
            <div className="relative">
              <Search className="absolute top-3.5 start-4 w-5 h-5 text-muted-foreground pointer-events-none" />
              <Input
                dir="auto"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={isRTL ? 'ابحث في مركز المعرفة…' : 'Search the knowledge center…'}
                className="h-12 ps-12 pe-4 rounded-xl text-foreground"
                aria-label={isRTL ? 'بحث في المعرفة' : 'Search knowledge'}
              />
            </div>
          </div>
        </section>

        {/* Category chips */}
        <section className="container-app pt-8" aria-label={isRTL ? 'الأقسام' : 'Categories'}>
          <div className="flex flex-wrap items-center gap-2 justify-center">
            <button
              onClick={() => setCategory('')}
              className={`px-3 h-8 rounded-full text-xs font-medium border transition-colors ${
                !activeCategory
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:bg-muted'
              }`}
            >
              {isRTL ? 'كل الأقسام' : 'All categories'}
            </button>
            {cats.map((c) => {
              const active = activeCategory === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`px-3 h-8 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:bg-muted'
                  }`}
                  data-category={c.id}
                >
                  {pickTitle(c, language === 'en' ? 'en' : 'ar')}
                </button>
              );
            })}
          </div>
        </section>

        {/* Results */}
        <section className="container-app py-10">
          {results.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              {isRTL ? 'لا توجد نتائج مطابقة.' : 'No matching results.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="knowledge-results">
              {results.map((it) => (
                <Card key={it.id} className="rounded-xl hover-lift">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
                      <Tag className="w-3 h-3" />
                      <span>{it.categoryId}</span>
                      <span>·</span>
                      <span>{it.type}</span>
                    </div>
                    <h2 className="font-heading font-semibold text-base text-foreground mb-2">
                      {pickTitle(it, language === 'en' ? 'en' : 'ar')}
                    </h2>
                    {pickSummary(it, language === 'en' ? 'en' : 'ar') && (
                      <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                        {pickSummary(it, language === 'en' ? 'en' : 'ar')}
                      </p>
                    )}
                    <p className="text-sm text-foreground/85 leading-relaxed">
                      {pickBody(it, language === 'en' ? 'en' : 'ar')}
                    </p>
                    {it.relatedRoutes && it.relatedRoutes.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {it.relatedRoutes.slice(0, 3).map((r) => (
                          <Link
                            key={r}
                            to={r}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            {r}
                            <ChevronRight className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default KnowledgeCenter;