import { Link } from 'react-router-dom';
import {
  Activity,
  ShieldCheck,
  Bell,
  Clock,
  ScrollText,
  Mail,
  ListChecks,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/i18n/LanguageContext';

/**
 * ADMIN UX RECONSOLIDATION PHASE 3 — Operations Center overview tile.
 *
 * Presentational landing surface for `/admin/operations`. Static cards
 * that route into the center's own tabs or into the existing legacy
 * pages. NO queries, NO mutations, NO service or supabase imports.
 */

type TileTone = 'primary' | 'sla' | 'notify' | 'cron' | 'logs' | 'email' | 'queue';

type Tile = {
  key: string;
  to: string;
  icon: typeof Activity;
  tone: TileTone;
  title: { ar: string; en: string };
  description: { ar: string; en: string };
  badge?: { ar: string; en: string };
};

const TILES: ReadonlyArray<Tile> = [
  {
    key: 'sla',
    to: '/admin/operations?tab=sla',
    icon: ShieldCheck,
    tone: 'sla',
    title: { ar: 'مؤشرات SLA', en: 'SLA' },
    description: {
      ar: 'معاينة جافة (Dry-run) لمسار SLA ولوحة استجابة التواصل. لا إرسال حقيقي.',
      en: 'Dry-run preview of SLA sweep and contact response dashboard. No live dispatch.',
    },
    badge: { ar: 'معاينة فقط', en: 'Preview only' },
  },
  {
    key: 'notifications',
    to: '/admin/operations?tab=notifications',
    icon: Bell,
    tone: 'notify',
    title: { ar: 'سجل التنبيهات', en: 'Notifications' },
    description: {
      ar: 'سجل تنبيهات التواصل للقراءة فقط. لا تغيير على الإرسال.',
      en: 'Read-only contact notification log. Dispatch behavior unchanged.',
    },
  },
  {
    key: 'cron',
    to: '/admin/operations?tab=cron',
    icon: Clock,
    tone: 'cron',
    title: { ar: 'الجدولة والمهام', en: 'Cron & Jobs' },
    description: {
      ar: 'سجل تشغيل مهام الجدولة وحالة التشغيل الأخير.',
      en: 'Scheduled job runs and latest execution status.',
    },
  },
  {
    key: 'logs',
    to: '/admin/operations?tab=logs',
    icon: ScrollText,
    tone: 'logs',
    title: { ar: 'السجلات', en: 'Logs' },
    description: {
      ar: 'سجل النشاط، سجل التدقيق، وسجل تدقيق التواصل.',
      en: 'Activity log, audit log, and contact audit log.',
    },
  },
  {
    key: 'email',
    to: '/admin/operations?tab=email',
    icon: Mail,
    tone: 'email',
    title: { ar: 'صحة البريد', en: 'Email Health' },
    description: {
      ar: 'مركز البريد ومؤشرات التسليم. الإجراءات الحساسة تبقى داخل صفحاتها الأصلية.',
      en: 'Email hub and deliverability. Sensitive actions stay on their source pages.',
    },
  },
  {
    key: 'queues',
    to: '/admin/operations?tab=queues',
    icon: ListChecks,
    tone: 'queue',
    title: { ar: 'القوائم والمهام', en: 'Queues & Tasks' },
    description: {
      ar: 'قائمة نمو المزودين ومراجعة المهام التشغيلية.',
      en: 'Provider growth queue and operational task review.',
    },
  },
];

const TONE_CLASSES: Record<TileTone, string> = {
  primary: 'bg-primary/10 text-primary',
  sla:     'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  notify:  'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  cron:    'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  logs:    'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  email:   'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  queue:   'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

const OperationsOverviewLanding = () => {
  const { isRTL } = useLanguage();
  return (
    <div className="space-y-4">
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
                  <div className={`flex size-10 items-center justify-center rounded-xl ${TONE_CLASSES[tile.tone]}`}>
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex items-center justify-between gap-2 text-base">
                      <span className="truncate">{isRTL ? tile.title.ar : tile.title.en}</span>
                      <ArrowRight
                        className={`size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 ${isRTL ? 'rotate-180' : ''}`}
                      />
                    </CardTitle>
                    {tile.badge ? (
                      <Badge variant="secondary" className="mt-1 text-[10px]">
                        {isRTL ? tile.badge.ar : tile.badge.en}
                      </Badge>
                    ) : null}
                  </div>
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

export default OperationsOverviewLanding;