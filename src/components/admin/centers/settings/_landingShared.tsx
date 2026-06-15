import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';

export type LandingTile = {
  key: string;
  to: string;
  icon: LucideIcon;
  title: { ar: string; en: string };
  description: { ar: string; en: string };
  external?: boolean;
};

export function LandingTileGrid({ tiles, header }: { tiles: ReadonlyArray<LandingTile>; header?: ReactNode }) {
  const { isRTL } = useLanguage();
  return (
    <div className="space-y-3">
      {header}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          const body = (
            <Card className="h-full transition-colors group-hover:border-primary/40">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <CardTitle className="flex flex-1 items-center justify-between gap-2 text-base">
                  <span className="truncate">{isRTL ? tile.title.ar : tile.title.en}</span>
                  <ArrowRight className={`size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 ${isRTL ? 'rotate-180' : ''}`} />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                {isRTL ? tile.description.ar : tile.description.en}
              </CardContent>
            </Card>
          );
          return tile.external ? (
            <a key={tile.key} href={tile.to} className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">{body}</a>
          ) : (
            <Link key={tile.key} to={tile.to} className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">{body}</Link>
          );
        })}
      </div>
    </div>
  );
}