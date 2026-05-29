import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getHelpCategoryBySlug, listPublishedArticles } from '@/modules/helpCenter';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { BookOpen, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { fmtNum } from '@/lib/format';

const HelpCategoryPage: React.FC = () => {
  const { slug = '' } = useParams();
  const { isRTL, language } = useLanguage();
  const { data: category } = useQuery({ queryKey: ['help', 'cat', slug], queryFn: () => getHelpCategoryBySlug(slug), enabled: !!slug });
  const { data: articles = [] } = useQuery({
    queryKey: ['help', 'cat-articles', category?.id],
    queryFn: () => listPublishedArticles({ categoryId: category!.id }),
    enabled: !!category?.id,
  });
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<'recent' | 'popular' | 'helpful'>('recent');

  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    const list = term
      ? articles.filter((a) =>
          [a.title_ar, a.title_en, a.summary_ar, a.summary_en]
            .filter(Boolean)
            .some((s) => (s as string).toLowerCase().includes(term)),
        )
      : articles;
    const sorted = [...list];
    if (sort === 'popular') sorted.sort((a, b) => (b.views_count ?? 0) - (a.views_count ?? 0));
    else if (sort === 'helpful') sorted.sort((a, b) => (b.helpful_count ?? 0) - (a.helpful_count ?? 0));
    else sorted.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return sorted;
  }, [articles, filter, sort]);

  const title = category ? (language === 'ar' ? category.title_ar : category.title_en) : '';
  const description = category
    ? ((language === 'ar' ? category.description_ar : category.description_en) ?? '')
    : '';
  usePageMeta({
    title: `${title} | ${isRTL ? 'مركز المساعدة' : 'Help Center'} | Qitaat`,
    description: description || (isRTL ? 'تصفّح مقالات هذا القسم في مركز مساعدة قِطاعات.' : 'Browse articles in this Qitaat Help Center category.'),
    canonical: category ? `https://qitaat.com/help/category/${category.slug}` : undefined,
  });

  useMultiJsonLd(
    category
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: isRTL ? 'الرئيسية' : 'Home', item: 'https://qitaat.com/' },
              { '@type': 'ListItem', position: 2, name: isRTL ? 'مركز المساعدة' : 'Help Center', item: 'https://qitaat.com/help' },
              { '@type': 'ListItem', position: 3, name: title, item: `https://qitaat.com/help/category/${category.slug}` },
            ],
          },
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: title,
            itemListElement: articles.slice(0, 50).map((a, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `https://qitaat.com/help/article/${a.slug}`,
              name: language === 'ar' ? a.title_ar : a.title_en,
            })),
          },
        ]
      : null,
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container py-24">
        <nav className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5" aria-label="Breadcrumb">
          <Link to="/help" className="hover:text-foreground hover:underline">{isRTL ? 'مركز المساعدة' : 'Help Center'}</Link>
          {isRTL ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          <span>{title}</span>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-heading font-black">{title}</h1>
              {category && <Badge variant="secondary" className="text-[10px]">{category.audience}</Badge>}
            </div>
            {description && <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{description}</p>}
            <div className="text-xs text-muted-foreground mt-2">
              <span className="num-tabular">{fmtNum(filtered.length)}</span>{' '}
              {isRTL ? 'مقالة' : 'articles'}
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute top-3 start-3 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                dir="auto"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={isRTL ? 'ابحث في هذا القسم…' : 'Filter in this category…'}
                className="h-10 ps-9 rounded-xl"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="h-10 rounded-xl border border-border bg-background text-sm px-3"
              aria-label={isRTL ? 'ترتيب' : 'Sort'}
            >
              <option value="recent">{isRTL ? 'الأحدث' : 'Most recent'}</option>
              <option value="popular">{isRTL ? 'الأكثر مشاهدة' : 'Most viewed'}</option>
              <option value="helpful">{isRTL ? 'الأكثر إفادة' : 'Most helpful'}</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((a) => (
            <Link key={a.id} to={`/help/article/${a.slug}`} className="hover-lift">
              <Card className="rounded-xl"><CardContent className="p-5">
                <BookOpen className="w-5 h-5 text-primary mb-2" />
                <div className="font-semibold mb-1">{language === 'ar' ? a.title_ar : a.title_en}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{language === 'ar' ? a.summary_ar : a.summary_en}</div>
                <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
                  <span><span className="num-tabular">{fmtNum(a.views_count ?? 0)}</span> {isRTL ? 'مشاهدة' : 'views'}</span>
                  {(a.helpful_count ?? 0) > 0 && <span className="num-tabular">{fmtNum(a.helpful_count)} 👍</span>}
                </div>
              </CardContent></Card>
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="md:col-span-2 text-center text-sm text-muted-foreground py-8">
              {isRTL ? 'لا توجد مقالات مطابقة.' : 'No matching articles.'}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HelpCategoryPage;