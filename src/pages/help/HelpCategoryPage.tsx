import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { getHelpCategoryBySlug, listPublishedArticles } from '@/modules/helpCenter';
import { usePageMeta } from '@/hooks/usePageMeta';
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
  usePageMeta({ title: `${title} | ${isRTL ? 'مركز المساعدة' : 'Help Center'} | Qitaat` });

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