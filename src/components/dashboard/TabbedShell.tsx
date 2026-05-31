import React, { Suspense, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { EmbeddedPageContext } from '@/contexts/AdminTabsContext';
import { lazyRetry } from '@/lib/lazyRetry';
import { Loader2, type LucideIcon } from 'lucide-react';

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

  // Memoize lazy components so they aren't re-created on each render.
  const lazyMap = useMemo(() => {
    const m: Record<string, React.LazyExoticComponent<React.ComponentType<unknown>>> = {};
    for (const t of tabs) m[t.key] = lazyRetry(t.loader);
    return m;
  }, [tabs]);

  const onChange = (v: string) => {
    const next = new URLSearchParams(params);
    if (v === defaultKey) next.delete('tab');
    else next.set('tab', v);
    setParams(next, { replace: true });
  };

  return (
    <DashboardLayout>
      <EmbeddedPageContext.Provider value={true}>
        <div className="space-y-4 max-w-7xl mx-auto">
          <header className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
              <Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold">{isRTL ? title.ar : title.en}</h1>
              {description ? (
                <p className="text-xs text-muted-foreground">
                  {isRTL ? description.ar : description.en}
                </p>
              ) : null}
            </div>
          </header>

          <Tabs value={active} onValueChange={onChange} className="space-y-4">
            <TabsList className="flex flex-wrap h-auto justify-start gap-1 overflow-x-auto">
              {tabs.map((t) => {
                const TabIcon = t.icon;
                return (
                  <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
                    {TabIcon ? <TabIcon className="size-3.5" /> : null}
                    {isRTL ? t.label.ar : t.label.en}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {tabs.map((t) => {
              const Comp = lazyMap[t.key];
              return (
                <TabsContent key={t.key} value={t.key}>
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