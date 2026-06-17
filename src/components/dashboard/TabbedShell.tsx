import React, { Suspense, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { EmbeddedPageContext } from '@/contexts/AdminTabsContext';
import { lazyRetry } from '@/lib/lazyRetry';
import { Loader2, type LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/shared';

/**
 * NAVIGATION-CONSOLIDATION-1 — generic tabbed shell.
 *
 * Renders a single DashboardLayout that hosts N tabs. Each tab lazy-loads
 * an existing page component; that page detects the EmbeddedPageContext
 * flag (via DashboardLayout's early-return) and renders its content
 * without its own shell, so we don't duplicate sidebar / header / breadcrumbs.
 *
 * Active tab is mirrored to `?tab=<key>` and restored from URL. The first
 * tab is treated as the default and omits `?tab=` for clean URLs.
 */

export type TabbedShellTab = {
  key: string;
  label: { ar: string; en: string };
  icon?: LucideIcon;
  /** Optional one-line bilingual hint shown above the active tab content. */
  hint?: { ar: string; en: string };
  /** Lazy import — returns a default-exported React component. */
  loader: () => Promise<{ default: React.ComponentType<unknown> }>;
};

export interface TabbedShellProps {
  /** Header icon (Lucide). */
  icon: LucideIcon;
  /** Bilingual page title. */
  title: { ar: string; en: string };
  /** Bilingual one-line description shown under the title. */
  description?: { ar: string; en: string };
  /** Tab definitions, in order. The first tab is the default. */
  tabs: ReadonlyArray<TabbedShellTab>;
  /** When true, applies `useNoIndex()` so the shell is hidden from search. */
  noIndex?: boolean;
}

const PanelFallback: React.FC = () => (
  <div className="flex items-center justify-center py-16 text-muted-foreground">
    <Loader2 className="size-5 animate-spin" />
  </div>
);

const TabbedShellInner: React.FC<TabbedShellProps> = ({ icon: Icon, title, description, tabs, noIndex }) => {
  if (noIndex) useNoIndex(); // eslint-disable-line react-hooks/rules-of-hooks
  const { isRTL } = useLanguage();
  const [params, setParams] = useSearchParams();

  const validKeys = useMemo(() => tabs.map((t) => t.key), [tabs]);
  const defaultKey = validKeys[0];
  const raw = params.get('tab');
  const active = raw && validKeys.includes(raw) ? raw : defaultKey;

  // Localized title/subtitle — memoized so PageHeader (React.memo) skips
  // re-rendering on unrelated parent updates (e.g. tab switches).
  const headerTitle = useMemo(() => (isRTL ? title.ar : title.en), [isRTL, title]);
  const headerSubtitle = useMemo(
    () => (description ? (isRTL ? description.ar : description.en) : undefined),
    [isRTL, description],
  );

  // Memoize lazy components so they aren't re-created on each render.
  const lazyMap = useMemo(() => {
    const m: Record<string, React.LazyExoticComponent<React.ComponentType<unknown>>> = {};
    for (const t of tabs) m[t.key] = lazyRetry(t.loader);
    return m;
  }, [tabs]);

  const onChange = useCallback(
    (v: string) => {
      const next = new URLSearchParams(params);
      if (v === defaultKey) next.delete('tab');
      else next.set('tab', v);
      setParams(next, { replace: true });
    },
    [params, defaultKey, setParams],
  );

  return (
    <DashboardLayout>
      <EmbeddedPageContext.Provider value={true}>
        <div className="space-y-4 max-w-7xl mx-auto">
          <PageHeader icon={Icon} title={headerTitle} subtitle={headerSubtitle} tone="primary" />

          <Tabs value={active} onValueChange={onChange} className="space-y-4">
            {/* Sticky on mobile for easier section switching while scrolling long tab content. */}
            <div className="sticky top-0 z-20 -mx-2 px-2 py-1 bg-background/85 backdrop-blur-md border-b border-border/30 md:static md:border-0 md:bg-transparent md:backdrop-blur-0 md:p-0 md:mx-0">
              <TabsList className="flex flex-nowrap md:flex-wrap h-auto justify-start gap-1 overflow-x-auto no-scrollbar w-full">
                {tabs.map((t) => {
                  const TabIcon = t.icon;
                  return (
                    <TabsTrigger
                      key={t.key}
                      value={t.key}
                      className="gap-1.5 min-h-11 px-3 whitespace-nowrap shrink-0"
                    >
                      {TabIcon ? <TabIcon className="size-3.5" /> : null}
                      {isRTL ? t.label.ar : t.label.en}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {tabs.map((t) => {
              const Comp = lazyMap[t.key];
              return (
                <TabsContent key={t.key} value={t.key}>
                  {t.hint && (
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 px-1">
                      {isRTL ? t.hint.ar : t.hint.en}
                    </p>
                  )}
                  <Suspense fallback={<PanelFallback />}>
                    <Comp />
                  </Suspense>
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </EmbeddedPageContext.Provider>
    </DashboardLayout>
  );
};

export const TabbedShell = React.memo(TabbedShellInner);
export default TabbedShell;