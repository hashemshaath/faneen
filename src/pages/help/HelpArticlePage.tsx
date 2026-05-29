import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import {
  bumpArticleHelpful,
  bumpArticleView,
  getArticleBySlug,
  listPublishedArticles,
  findRelatedArticles,
  pushRecentlyViewedSlug,
} from '@/modules/helpCenter';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';

const HelpArticlePage: React.FC = () => {
  const { slug = '' } = useParams();
  const { isRTL, language } = useLanguage();
  const [voted, setVoted] = useState<null | boolean>(null);
  const { data: article } = useQuery({ queryKey: ['help', 'article', slug], queryFn: () => getArticleBySlug(slug), enabled: !!slug });

  useEffect(() => {
    if (article?.slug) {
      void bumpArticleView(article.slug);
      pushRecentlyViewedSlug(article.slug);
    }
  }, [article?.slug]);

  const { data: pool = [] } = useQuery({
    queryKey: ['help', 'all-published'],
    queryFn: () => listPublishedArticles({ limit: 500 }),
    staleTime: 5 * 60_000,
  });

  const related = article ? findRelatedArticles(article, pool, 5) : [];

  const articleTitle = article ? (language === 'ar' ? article.title_ar : article.title_en) : '';
  const articleSummary = article
    ? ((language === 'ar' ? article.summary_ar : article.summary_en) ?? '').slice(0, 300)
    : '';

  usePageMeta({
    title: article ? `${articleTitle} | Qitaat` : 'Help | Qitaat',
    description: articleSummary || (isRTL ? 'مقالة في مركز مساعدة قِطاعات.' : 'Qitaat Help Center article.'),
    canonical: article ? `https://qitaat.com/help/article/${article.slug}` : undefined,
    ogType: 'article',
  });

  useMultiJsonLd(
    article
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: articleTitle,
            description: articleSummary,
            inLanguage: language === 'ar' ? 'ar' : 'en',
            datePublished: article.updated_at,
            dateModified: article.updated_at,
            mainEntityOfPage: `https://qitaat.com/help/article/${article.slug}`,
            author: { '@type': 'Organization', name: 'Qitaat' },
            publisher: {
              '@type': 'Organization',
              name: 'Qitaat',
              logo: { '@type': 'ImageObject', url: 'https://qitaat.com/logo.png' },
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: isRTL ? 'الرئيسية' : 'Home', item: 'https://qitaat.com/' },
              { '@type': 'ListItem', position: 2, name: isRTL ? 'مركز المساعدة' : 'Help Center', item: 'https://qitaat.com/help' },
              { '@type': 'ListItem', position: 3, name: articleTitle, item: `https://qitaat.com/help/article/${article.slug}` },
            ],
          },
        ]
      : null,
  );

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col bg-background"><Navbar />
        <main className="flex-1 container py-24 text-center text-muted-foreground">{isRTL ? 'جارٍ التحميل…' : 'Loading…'}</main>
        <Footer />
      </div>
    );
  }

  const title = articleTitle;
  const summary = language === 'ar' ? article.summary_ar : article.summary_en;
  const content = language === 'ar' ? article.content_ar : article.content_en;

  const onVote = async (helpful: boolean) => {
    if (voted !== null) return;
    setVoted(helpful);
    try { await bumpArticleHelpful(article.slug, helpful); } catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container py-24 max-w-3xl">
        <Link to="/help" className="text-sm text-muted-foreground hover:underline">{isRTL ? '← مركز المساعدة' : '← Help Center'}</Link>
        <h1 className="text-3xl font-heading font-black mt-3 mb-2" dir="auto">{title}</h1>
        {summary && <p className="text-muted-foreground mb-6" dir="auto">{summary}</p>}
        <Card className="rounded-xl mb-6"><CardContent className="p-6 prose max-w-none whitespace-pre-line" dir="auto">{content}</CardContent></Card>
        <div className="text-xs text-muted-foreground mb-6">{isRTL ? 'آخر تحديث: ' : 'Last updated: '}{new Date(article.updated_at).toLocaleDateString()}</div>

        <Card className="rounded-xl"><CardContent className="p-6">
          <div className="font-semibold mb-3">{isRTL ? 'هل كانت هذه المقالة مفيدة؟' : 'Was this article helpful?'}</div>
          {voted === null ? (
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onVote(true)}><ThumbsUp className="w-4 h-4 me-2" />{isRTL ? 'مفيدة' : 'Helpful'}</Button>
              <Button variant="outline" onClick={() => onVote(false)}><ThumbsDown className="w-4 h-4 me-2" />{isRTL ? 'غير مفيدة' : 'Not Helpful'}</Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">{isRTL ? 'شكرًا لتقييمك!' : 'Thanks for your feedback!'}</div>
          )}
        </CardContent></Card>

        {related.length > 0 && (
          <Card className="rounded-xl mt-6"><CardContent className="p-6">
            <div className="font-semibold mb-3">{isRTL ? 'مقالات ذات صلة' : 'Related articles'}</div>
            <div className="grid gap-2">
              {related.map((r) => (
                <Link key={r.id} to={`/help/article/${r.slug}`} className="block px-3 py-2 rounded-lg hover:bg-muted text-sm" dir="auto">
                  {language === 'ar' ? r.title_ar : r.title_en}
                </Link>
              ))}
            </div>
          </CardContent></Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default HelpArticlePage;