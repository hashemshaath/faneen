import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { bumpArticleHelpful, bumpArticleView, getArticleBySlug } from '@/modules/helpCenter';
import { usePageMeta } from '@/hooks/usePageMeta';

const HelpArticlePage: React.FC = () => {
  const { slug = '' } = useParams();
  const { isRTL, language } = useLanguage();
  const [voted, setVoted] = useState<null | boolean>(null);
  const { data: article } = useQuery({ queryKey: ['help', 'article', slug], queryFn: () => getArticleBySlug(slug), enabled: !!slug });

  useEffect(() => { if (article?.slug) { void bumpArticleView(article.slug); } }, [article?.slug]);

  usePageMeta({ title: article ? `${language === 'ar' ? article.title_ar : article.title_en} | Qitaat` : 'Help | Qitaat' });

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col bg-background"><Navbar />
        <main className="flex-1 container py-24 text-center text-muted-foreground">{isRTL ? 'جارٍ التحميل…' : 'Loading…'}</main>
        <Footer />
      </div>
    );
  }

  const title = language === 'ar' ? article.title_ar : article.title_en;
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
      </main>
      <Footer />
    </div>
  );
};

export default HelpArticlePage;