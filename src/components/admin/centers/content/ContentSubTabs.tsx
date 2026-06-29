import React, { Suspense, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/i18n/LanguageContext';
import { lazyRetry } from '@/lib/lazyRetry';
import { Loader2, type LucideIcon } from 'lucide-react';

/**
 * ADMIN UX RECONSOLIDATION PHASE 6 — generic content sub-tabs wrapper.
 *
 * Hosts N existing admin pages as inner tabs inside a Content Center
 * tab (e.g. Showcase combines AdminShowcase + AdminPartnerShowcase).
 *
 * Each leaf is lazy-loaded via the page's own default export — no
 * queries, mutations, or service calls are moved.
 */

export interface ContentSubTab {
  key: string;
  label: { ar: string; en: string };
  icon?: LucideIcon;
  loader: () => Promise<{ default: React.ComponentType<unknown> }>;
}

export interface ContentSubTabsProps {
  tabs: ReadonlyArray<ContentSubTab>;
}

const Fallback = () => (
  <div className="flex items-center justify-center py-12 text-muted-foreground">
    <Loader2 className="size-5 animate-spin" />
  </div>
);

export const ContentSubTabs: React.FC<ContentSubTabsProps> = ({ tabs }) => {
  const { isRTL } = useLanguage();
  const [active, setActive] = useState<string>(tabs[0]?.key ?? '');

  const lazyMap = React.useMemo(() => {
    const m: Record<string, React.LazyExoticComponent<React.ComponentType<unknown>>> = {};
    for (const t of tabs) m[t.key] = lazyRetry(t.loader);
    return m;
  }, [tabs]);

  return (
    <Tabs value={active} onValueChange={setActive} className="space-y-3">
      <TabsList className="flex flex-wrap h-auto justify-start gap-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
              {Icon ? <Icon className="size-3.5" /> : null}
              {isRTL ? t.label.ar : t.label.en}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {tabs.map((t) => {
        const Comp = lazyMap[t.key];
        return (
          <TabsContent key={t.key} value={t.key}>
            <Suspense fallback={<Fallback />}>
              <Comp />
            </Suspense>
          </TabsContent>
        );
      })}
    </Tabs>
  );
};

export default ContentSubTabs;