import { Link } from 'react-router-dom';
import { Building2, ShieldCheck, MapPin, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';

/**
 * Directory tab — presentational links to existing public-visibility,
 * business listing, and locations admin pages. No queries.
 */

const TILES = [
  {
    key: 'visibility',
    to: '/admin/business-visibility',
    icon: ShieldCheck,
    title: { ar: 'إعدادات الظهور العام', en: 'Public Visibility' },
    description: {
      ar: 'تعديل وقفل أقسام بروفايلات المنشآت.',
      en: 'Override and lock sections of business profiles.',
    },
  },
  {
    key: 'businesses',
    to: '/admin/businesses',
    icon: Building2,
    title: { ar: 'إدارة المنشآت', en: 'Manage Businesses' },
    description: {
      ar: 'القائمة الكاملة للمنشآت المسجّلة في الدليل.',
      en: 'Full list of businesses registered in the directory.',
    },
  },
  {
    key: 'locations',
    to: '/admin/locations',
    icon: MapPin,
    title: { ar: 'الفروع والمواقع', en: 'Branches & Locations' },
    description: {
      ar: 'إدارة الفروع ومواقع الخدمة المرتبطة بالدليل.',
      en: 'Branches and service locations linked to the directory.',
    },
  },
] as const;

const DirectoryLanding = () => {
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
  );
};

export default DirectoryLanding;