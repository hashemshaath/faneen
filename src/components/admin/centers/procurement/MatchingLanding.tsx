import { Link } from 'react-router-dom';
import { GitBranch, Inbox, Wrench, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';

/**
 * Matching tab — presentational. Matching is part of the request and
 * operations flow; this tile clarifies where to act without duplicating
 * any matching logic.
 */

const TILES = [
  {
    key: 'request-match',
    to: '/admin/quote-requests',
    icon: Inbox,
    title: { ar: 'مطابقة من الطلبات', en: 'Match from Requests' },
    description: {
      ar: 'افتح أي طلب لإجراء المطابقة مع المزودين المؤهلين.',
      en: 'Open any request to match it with qualified providers.',
    },
  },
  {
    key: 'ops-match',
    to: '/admin/quote-operations',
    icon: Wrench,
    title: { ar: 'لوحة العمليات', en: 'Operations Board' },
    description: {
      ar: 'تابع نتائج المطابقة من شاشة العمليات.',
      en: 'Track matching results from the operations board.',
    },
  },
] as const;

const MatchingLanding = () => {
  const { isRTL } = useLanguage();
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground font-medium">
          <GitBranch className="size-4 text-primary" />
          {isRTL ? 'المطابقة جزء من سير الطلب' : 'Matching is part of the request flow'}
        </div>
        <p className="mt-1">
          {isRTL
            ? 'لا توجد شاشة مطابقة مستقلة؛ تتم المطابقة من تفاصيل الطلب ومن لوحة العمليات.'
            : 'There is no standalone matching screen — matching happens inside request details and the operations board.'}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.key}
              to={tile.to}
              className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
            >
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="flex flex-1 items-center justify-between gap-2 text-base">
                    <span className="truncate">{isRTL ? tile.title.ar : tile.title.en}</span>
                    <ArrowRight
                      className={`size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 ${isRTL ? 'rotate-180' : ''}`}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  {isRTL ? tile.description.ar : tile.description.en}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default MatchingLanding;