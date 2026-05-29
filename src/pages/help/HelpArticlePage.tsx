import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Clock, Share2, Link2, Printer, ChevronRight, ChevronLeft, List, Eye } from 'lucide-react';
import {
  bumpArticleHelpful,
  bumpArticleView,
  getArticleBySlug,
  listPublishedArticles,
  findRelatedArticles,
  pushRecentlyViewedSlug,
} from '@/modules/helpCenter';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { toast } from 'sonner';

const HelpArticlePage: React.FC = () => {
  const { slug = '' } = useParams();
  const { isRTL, language } = useLanguage();
  const [voted, setVoted] = useState<null | boolean>(null);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [progress, setProgress] = useState(0);
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

  // Prev / Next within the same category by recency
  const { prev, next } = useMemo(() => {
    if (!article) return { prev: null, next: null };
    const siblings = pool.filter((a) => a.category_id === article.category_id && a.slug !== article.slug);
    const sorted = [...siblings].sort((a, b) => a.updated_at.localeCompare(b.updated_at));
    const idx = sorted.findIndex((a) => a.updated_at > article.updated_at);
    const prevA = idx > 0 ? sorted[idx - 1] : (idx === -1 && sorted.length ? sorted[sorted.length - 1] : null);
    const nextA = idx >= 0 ? sorted[idx] : null;
    return { prev: prevA, next: nextA };
  }, [article, pool]);

  const articleTitle = article ? (language === 'ar' ? article.title_ar : article.title_en) : '';
  const articleSummary = article
    ? ((language === 'ar' ? article.summary_ar : article.summary_en) ?? '').slice(0, 300)
    : '';
  const articleContent = article ? (language === 'ar' ? article.content_ar : article.content_en) ?? '' : '';

  // Reading time (~ 200 wpm for EN, 180 wpm for AR)
  const readingMinutes = useMemo(() => {
    if (!articleContent) return 1;
    const words = articleContent.trim().split(/\s+/).filter(Boolean).length;
    const wpm = language === 'ar' ? 180 : 200;
    return Math.max(1, Math.round(words / wpm));
  }, [articleContent, language]);

  // Build a lightweight TOC from lines that look like headings: lines starting with #, ##, or **Title**
  const toc = useMemo(() => {
    if (!articleContent) return [] as Array<{ id: string; text: string; level: number }>;
    const lines = articleContent.split('\n');
    const items: Array<{ id: string; text: string; level: number }> = [];
    lines.forEach((line, i) => {
      const md = /^(#{1,3})\s+(.+?)\s*$/.exec(line);
      if (md) {
        const text = md[2].replace(/[*_`]/g, '').trim();
        items.push({ id: `h-${i}`, text, level: md[1].length });
        return;
      }
      const bold = /^\*\*(.+?)\*\*\s*$/.exec(line.trim());
      if (bold && bold[1].length < 80) items.push({ id: `h-${i}`, text: bold[1], level: 2 });
    });
    return items.slice(0, 20);
  }, [articleContent]);

  // Scroll progress bar
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const total = h.scrollHeight - h.clientHeight;
      setProgress(total > 0 ? Math.min(100, (scrolled / total) * 100) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
  const content = articleContent;

  const onVote = async (helpful: boolean) => {
    if (voted !== null) return;
    setVoted(helpful);
    try { await bumpArticleHelpful(article.slug, helpful); } catch { /* ignore */ }
  };

  const articleUrl = `https://qitaat.com/help/article/${article.slug}`;

  const onShare = async () => {
    try {
      if (typeof navigator !== 'undefined' && (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share) {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
          title,
          text: summary ?? title,
          url: articleUrl,
        });
      } else {
        await navigator.clipboard.writeText(articleUrl);
        toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied');
      }
    } catch { /* user dismissed */ }
  };

  const onCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(articleUrl);
      toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied');
    } catch {
      toast.error(isRTL ? 'تعذّر نسخ الرابط' : 'Failed to copy');
    }
  };

  const onPrint = () => window.print();

  const submitFeedbackNote = () => {
    // Best-effort: persist locally and notify; analytics persistence can hook in later.
    try {
      const key = 'qitaat_help_feedback_notes_v1';
      const prev = JSON.parse(localStorage.getItem(key) ?? '[]');
      prev.unshift({ slug: article.slug, helpful: voted, note: feedbackNote, at: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(prev.slice(0, 50)));
    } catch { /* ignore */ }
    setFeedbackSent(true);
    toast.success(isRTL ? 'شكرًا، تم استلام ملاحظتك' : 'Thanks — we got your note');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Reading progress bar */}
      <div className="fixed top-0 inset-x-0 h-1 z-[60] bg-transparent print:hidden">
        <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${progress}%` }} aria-hidden />
      </div>
      <Navbar />
      <main className="flex-1 container py-24 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 max-w-6xl">
        <article className="min-w-0">
          {/* Breadcrumb */}
          <nav className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5" aria-label="Breadcrumb">
            <Link to="/help" className="hover:text-foreground hover:underline">{isRTL ? 'مركز المساعدة' : 'Help Center'}</Link>
            {isRTL ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <span className="line-clamp-1">{title}</span>
          </nav>

          <h1 className="text-3xl sm:text-4xl font-heading font-black mb-3" dir="auto">{title}</h1>
          {summary && <p className="text-muted-foreground mb-5 text-base" dir="auto">{summary}</p>}

          {/* Meta strip */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-6 border-b border-border pb-4">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {isRTL ? `~${readingMinutes} دقيقة قراءة` : `~${readingMinutes} min read`}
            </span>
            <span className="inline-flex items-center gap-1.5 tech-content">
              <Eye className="w-3.5 h-3.5" />
              {article.views_count ?? 0}
            </span>
            <span className="tech-content">
              {isRTL ? 'آخر تحديث: ' : 'Last updated: '}
              {new Date(article.updated_at).toLocaleDateString(language === 'ar' ? 'ar' : 'en')}
            </span>
            <div className="ms-auto flex items-center gap-1.5 print:hidden">
              <Button size="sm" variant="ghost" onClick={onShare} aria-label={isRTL ? 'مشاركة' : 'Share'}>
                <Share2 className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={onCopyLink} aria-label={isRTL ? 'نسخ الرابط' : 'Copy link'}>
                <Link2 className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={onPrint} aria-label={isRTL ? 'طباعة' : 'Print'}>
                <Printer className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Card className="rounded-xl mb-6">
            <CardContent className="p-6 prose max-w-none whitespace-pre-line" dir="auto">{content}</CardContent>
          </Card>

          {/* Prev / Next */}
          {(prev || next) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 print:hidden">
              {prev ? (
                <Link to={`/help/article/${prev.slug}`} className="hover-lift">
                  <Card className="rounded-xl h-full">
                    <CardContent className="p-4">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                        {isRTL ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                        {isRTL ? 'السابق' : 'Previous'}
                      </div>
                      <div className="text-sm font-semibold line-clamp-2" dir="auto">
                        {language === 'ar' ? prev.title_ar : prev.title_en}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ) : <div />}
              {next ? (
                <Link to={`/help/article/${next.slug}`} className="hover-lift sm:text-end">
                  <Card className="rounded-xl h-full">
                    <CardContent className="p-4">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1 sm:justify-end">
                        {isRTL ? 'التالي' : 'Next'}
                        {isRTL ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </div>
                      <div className="text-sm font-semibold line-clamp-2" dir="auto">
                        {language === 'ar' ? next.title_ar : next.title_en}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ) : <div />}
            </div>
          )}

          {/* Feedback */}
          <Card className="rounded-xl print:hidden">
            <CardContent className="p-6">
              <div className="font-semibold mb-3">{isRTL ? 'هل كانت هذه المقالة مفيدة؟' : 'Was this article helpful?'}</div>
              {voted === null ? (
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => onVote(true)}>
                    <ThumbsUp className="w-4 h-4 me-2" />{isRTL ? 'مفيدة' : 'Helpful'}
                  </Button>
                  <Button variant="outline" onClick={() => onVote(false)}>
                    <ThumbsDown className="w-4 h-4 me-2" />{isRTL ? 'غير مفيدة' : 'Not Helpful'}
                  </Button>
                </div>
              ) : feedbackSent ? (
                <div className="text-sm text-muted-foreground">
                  {isRTL ? 'شكرًا — تم استلام تقييمك وملاحظتك.' : 'Thanks — we received your rating and note.'}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    {voted
                      ? (isRTL ? 'ممتاز! ما الذي ساعدك أكثر؟ (اختياري)' : 'Awesome! What helped you most? (optional)')
                      : (isRTL ? 'نأسف لذلك. أخبرنا كيف نحسّن هذه المقالة:' : 'Sorry to hear that. Tell us how to improve this article:')}
                  </div>
                  <textarea
                    dir="auto"
                    value={feedbackNote}
                    onChange={(e) => setFeedbackNote(e.target.value)}
                    rows={3}
                    placeholder={isRTL ? 'ملاحظتك…' : 'Your note…'}
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <div className="flex items-center gap-2">
                    <Button onClick={submitFeedbackNote} disabled={feedbackNote.trim().length === 0 && voted === false}>
                      {isRTL ? 'إرسال' : 'Submit'}
                    </Button>
                    {voted === false && (
                      <Link to="/help/report-issue" className="text-sm text-primary hover:underline">
                        {isRTL ? 'أو افتح بلاغًا تفصيليًا' : 'or open a detailed report'}
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </article>

        {/* Sidebar */}
        <aside className="hidden lg:block print:hidden">
          <div className="sticky top-24 space-y-4">
            {toc.length > 0 && (
              <Card className="rounded-xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <List className="w-3.5 h-3.5" />
                    {isRTL ? 'محتويات المقال' : 'On this page'}
                  </div>
                  <nav className="grid gap-1">
                    {toc.map((t) => (
                      <span
                        key={t.id}
                        className={`block text-sm text-muted-foreground hover:text-foreground transition-colors ${
                          t.level === 1 ? 'font-semibold text-foreground' : t.level === 3 ? 'ps-4' : ''
                        }`}
                      >
                        {t.text}
                      </span>
                    ))}
                  </nav>
                </CardContent>
              </Card>
            )}

            {related.length > 0 && (
              <Card className="rounded-xl">
                <CardContent className="p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    {isRTL ? 'مقالات ذات صلة' : 'Related articles'}
                  </div>
                  <div className="grid gap-1.5">
                    {related.map((r) => (
                      <Link key={r.id} to={`/help/article/${r.slug}`} className="block px-2 py-1.5 rounded-lg hover:bg-muted text-sm" dir="auto">
                        {language === 'ar' ? r.title_ar : r.title_en}
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="rounded-xl bg-muted/40">
              <CardContent className="p-4 text-center">
                <div className="text-sm font-semibold mb-1">{isRTL ? 'لم تجد إجابتك؟' : "Didn't find your answer?"}</div>
                <Link to="/contact"><Button size="sm" className="w-full">{isRTL ? 'تواصل مع الدعم' : 'Contact support'}</Button></Link>
              </CardContent>
            </Card>
          </div>
        </aside>
      </main>
      <Footer />
    </div>
  );
};

export default HelpArticlePage;