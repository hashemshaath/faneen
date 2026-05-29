/**
 * HELP-CENTER-INTELLIGENCE-3 — SmartHelpPanel
 *
 * Renders 4 contextual lists for the help launcher:
 *   1) Page-specific (from contextual registry / ranking)
 *   2) Most helpful (ratio + popularity)
 *   3) Related to the top page-specific article
 *   4) Recently viewed (local-storage)
 *
 * Reads via the `listPublishedArticles` wrapper (no direct DB).
 * Does NOT render AI answers in v1 (intelligence layer only).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  computeSmartRecommendations,
  listPublishedArticles,
  readRecentlyViewedSlugs,
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

  return (
    <div className="w-80 max-w-[90vw] max-h-[60vh] overflow-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-lg">
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