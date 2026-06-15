import { Link } from 'react-router-dom';
import {
  Cog, Palette, Fingerprint, Plug, Bell, ShieldCheck, SlidersHorizontal, ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';

/**
 * ADMIN UX RECONSOLIDATION PHASE 10 — Settings overview tile grid.
 * Presentational links only. No queries, no mutations, no service calls.
 */

type Tile = {
  key: string;
  to: string;
  icon: typeof Cog;
  title: { ar: string; en: string };
  description: { ar: string; en: string };
};

const TILES: ReadonlyArray<Tile> = [
  { key: 'general', to: '/admin/settings?tab=general', icon: Cog, title: { ar: 'الإعدادات العامة', en: 'General' }, description: { ar: 'إعدادات النظام الأساسية.', en: 'Core system settings.' } },
  { key: 'branding', to: '/admin/settings?tab=branding', icon: Palette, title: { ar: 'العلامة', en: 'Branding' }, description: { ar: 'الشعار والألوان والعلامة التجارية.', en: 'Logo, colors, and brand assets.' } },
  { key: 'identity', to: '/admin/settings?tab=identity', icon: Fingerprint, title: { ar: 'الهوية', en: 'Identity' }, description: { ar: 'إعدادات هوية النظام.', en: 'System identity tokens.' } },
  { key: 'integrations', to: '/admin/settings?tab=integrations', icon: Plug, title: { ar: 'التكاملات', en: 'Integrations' }, description: { ar: 'خدمات الجهات الخارجية.', en: 'Third-party integrations.' } },
  { key: 'notifications', to: '/admin/settings?tab=notifications', icon: Bell, title: { ar: 'التنبيهات', en: 'Notifications' }, description: { ar: 'قوالب وإعدادات الإشعارات.', en: 'Notification templates and settings.' } },
  { key: 'security', to: '/admin/settings?tab=security', icon: ShieldCheck, title: { ar: 'الأمان', en: 'Security' }, description: { ar: 'سياسات الأمان والأذونات.', en: 'Security policies and permissions.' } },
  { key: 'advanced', to: '/admin/settings?tab=advanced', icon: SlidersHorizontal, title: { ar: 'متقدم', en: 'Advanced' }, description: { ar: 'تشخيصات وإعدادات متقدمة.', en: 'Diagnostics and advanced settings.' } },
];

const SettingsOverviewLanding = () => {
  const { isRTL } = useLanguage();
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                  <ArrowRight className={`size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 ${isRTL ? 'rotate-180' : ''}`} />
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
  );
};

export default SettingsOverviewLanding;