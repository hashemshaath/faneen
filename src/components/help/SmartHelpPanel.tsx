/**
 * HELP-CENTER-ASSISTANT-4 — SmartHelpPanel
 *
 * Grounded help assistant + contextual recommendations.
 * - Question input feeds the local, deterministic generateHelpAnswer().
 * - Answers cite published help articles only. No external AI. No fetch.
 * - Low-confidence answers expose a "Report content gap" action.
 * - Lists below: page-specific, most helpful, related, recently viewed.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  computeSmartRecommendations,
  generateHelpAnswer,
  listPublishedArticles,
  logAssistantEvent,
  readRecentlyViewedSlugs,
  submitHelpContentGap,
  type HelpAnswer,
  type HelpArticle,
  type HelpAudience,
} from '@/modules/helpCenter';

interface SmartHelpPanelProps {
  pageKey: string;
  audience?: HelpAudience;
  onNavigate?: () => void;
}

const Section: React.FC<{ title: string; items: HelpArticle[]; lang: 'ar' | 'en'; onNavigate?: () => void }> = ({ title, items, lang, onNavigate }) => {
  if (items.length === 0) return null;
  return (
    <div className="px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground px-1 pb-1">{title}</div>
      {items.map((a) => (
        <Link
          key={a.id}
          to={`/help/article/${a.slug}`}
          onClick={onNavigate}
          className="block px-2 py-1.5 rounded hover:bg-muted text-sm"
          dir="auto"
        >
          {lang === 'ar' ? a.title_ar : a.title_en}
        </Link>
      ))}
    </div>
  );
};

const SmartHelpPanel: React.FC<SmartHelpPanelProps> = ({ pageKey, audience, onNavigate }) => {
  const { isRTL, language } = useLanguage();
  const lang: 'ar' | 'en' = language === 'ar' ? 'ar' : 'en';

  const { data: articles = [] } = useQuery({
    queryKey: ['help', 'all-published'],
    queryFn: () => listPublishedArticles({ limit: 500 }),
    staleTime: 5 * 60_000,
  });

  const rec = computeSmartRecommendations({
    articles,
    pageKey,
    audience,
    recentlyViewedSlugs: readRecentlyViewedSlugs(),
  });

  const hasAny = rec.pageSpecific.length + rec.mostHelpful.length + rec.related.length + rec.recentlyViewed.length > 0;

  const [question, setQuestion] = React.useState('');
  const [answer, setAnswer] = React.useState<HelpAnswer | null>(null);
  const [gapSubmitted, setGapSubmitted] = React.useState(false);
  const [gapBusy, setGapBusy] = React.useState(false);

  const askPlaceholder = isRTL ? 'اسأل عن استخدام قطاعات...' : 'Ask about using Qitaat...';
  const fallback = isRTL
    ? 'لم نجد مقالًا منشورًا يغطي هذا السؤال بدقة.'
    : 'We could not find a published article that covers this question accurately.';

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    void logAssistantEvent({ event: 'question_asked', query: q, page_key: pageKey, audience });
    const a = generateHelpAnswer({
      question: q,
      articles,
      audience,
      pageKey,
      language: lang,
    });
    setAnswer(a);
    setGapSubmitted(false);
    void logAssistantEvent({
      event: a.status === 'answered' ? 'answer_found' : 'low_confidence',
      query: q,
      page_key: pageKey,
      audience,
      confidence: a.confidence,
      sources_count: a.sources.length,
    });
  };

  const handleReportGap = async () => {
    if (gapSubmitted || gapBusy) return;
    setGapBusy(true);
    try {
      await submitHelpContentGap({
        query: question.trim(),
        audience: audience ?? null,
        page_key: pageKey ?? null,
      });
      await logAssistantEvent({
        event: 'content_gap_submitted',
        query: question.trim(),
        page_key: pageKey,
        audience,
      });
      setGapSubmitted(true);
    } catch {
      /* swallow — never break UI on telemetry */
    } finally {
      setGapBusy(false);
    }
  };

  return (
    <div className="w-80 max-w-[90vw] max-h-[70vh] overflow-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-lg">
      <form onSubmit={handleAsk} className="p-2 border-b border-border">
        <label htmlFor="help-assistant-input" className="sr-only">{askPlaceholder}</label>
        <div className="flex items-center gap-1.5">
          <input
            id="help-assistant-input"
            data-testid="help-assistant-input"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={askPlaceholder}
            dir="auto"
            className="flex-1 h-9 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs hover:opacity-90"
          >
            {isRTL ? 'اسأل' : 'Ask'}
          </button>
        </div>
        {answer && (
          <div className="mt-2 text-sm" data-testid="help-assistant-answer">
            {answer.status === 'answered' ? (
              <>
                <div className="px-2 py-1.5 rounded-md bg-muted/60 whitespace-pre-line" dir="auto">
                  {answer.answer}
                </div>
                <div className="mt-1.5 text-[10px] uppercase tracking-wide text-muted-foreground px-1">
                  {isRTL ? 'المصادر' : 'Sources'} · {Math.round(answer.confidence * 100)}%
                </div>
                <div className="px-1">
                  {answer.sources.map((s) => (
                    <Link
                      key={s.slug}
                      to={`/help/article/${s.slug}`}
                      onClick={onNavigate}
                      className="block text-xs text-primary hover:underline py-0.5"
                      data-testid="help-assistant-source"
                    >
                      · {s.title}
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <div className="px-2 py-1.5 rounded-md bg-muted/60 space-y-1.5" data-testid="help-assistant-fallback">
                <div dir="auto">{fallback}</div>
                {!gapSubmitted ? (
                  <button
                    type="button"
                    onClick={handleReportGap}
                    disabled={gapBusy}
                    data-testid="help-assistant-report-gap"
                    className="text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    {isRTL ? 'الإبلاغ عن فجوة محتوى' : 'Report content gap'}
                  </button>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    {isRTL ? 'تم تسجيل الفجوة. شكرًا!' : 'Gap recorded. Thanks!'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </form>
      {!hasAny ? (
        <div className="p-4 text-sm text-muted-foreground">{isRTL ? 'لا توجد اقتراحات بعد.' : 'No suggestions yet.'}</div>
      ) : (
        <>
          <Section title={isRTL ? 'لهذه الصفحة' : 'For this page'} items={rec.pageSpecific} lang={lang} onNavigate={onNavigate} />
          <Section title={isRTL ? 'الأكثر فائدة' : 'Most helpful'} items={rec.mostHelpful} lang={lang} onNavigate={onNavigate} />
          <Section title={isRTL ? 'مقالات ذات صلة' : 'Related articles'} items={rec.related} lang={lang} onNavigate={onNavigate} />
          <Section title={isRTL ? 'شوهدت مؤخرًا' : 'Recently viewed'} items={rec.recentlyViewed} lang={lang} onNavigate={onNavigate} />
        </>
      )}
      <Link
        to="/help"
        onClick={onNavigate}
        className="block px-3 py-2 mt-1 border-t border-border text-xs text-muted-foreground hover:bg-muted"
      >
        {isRTL ? 'فتح مركز المساعدة ←' : 'Open Help Center →'}
      </Link>
    </div>
  );
};

export default SmartHelpPanel;