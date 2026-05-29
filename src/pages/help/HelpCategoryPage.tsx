import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { getHelpCategoryBySlug, listPublishedArticles } from '@/modules/helpCenter';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { BookOpen } from 'lucide-react';

const HelpCategoryPage: React.FC = () => {
  const { slug = '' } = useParams();
  const { isRTL, language } = useLanguage();
  const { data: category } = useQuery({ queryKey: ['help', 'cat', slug], queryFn: () => getHelpCategoryBySlug(slug), enabled: !!slug });
  const { data: articles = [] } = useQuery({
    queryKey: ['help', 'cat-articles', category?.id],
    queryFn: () => listPublishedArticles({ categoryId: category!.id }),
    enabled: !!category?.id,
  });
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
        <Link to="/help" className="text-sm text-muted-foreground hover:underline">{isRTL ? '← مركز المساعدة' : '← Help Center'}</Link>
        <h1 className="text-3xl font-heading font-black mt-3 mb-6">{title}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.map((a) => (
            <Link key={a.id} to={`/help/article/${a.slug}`} className="hover-lift">
              <Card className="rounded-xl"><CardContent className="p-5">
                <BookOpen className="w-5 h-5 text-primary mb-2" />
                <div className="font-semibold mb-1">{language === 'ar' ? a.title_ar : a.title_en}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{language === 'ar' ? a.summary_ar : a.summary_en}</div>
              </CardContent></Card>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HelpCategoryPage;