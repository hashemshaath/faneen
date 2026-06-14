import { Link } from 'react-router-dom';
import {
  Users,
  Shield,
  KeyRound,
  Activity,
  Lock,
  LayoutDashboard,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/i18n/LanguageContext';

/**
 * ADMIN UX RECONSOLIDATION PHASE 4 — Identity & Access Center overview.
 *
 * Presentational landing for `/admin/identity`. Static tiles that route
 * into the center's own tabs and into the legacy identity dashboard.
 * NO queries, NO mutations, NO service or supabase imports.
 */

type TileTone = 'primary' | 'users' | 'roles' | 'invite' | 'activity' | 'security';

type Tile = {
  key: string;
  to: string;
  icon: typeof Users;
  tone: TileTone;
  title: { ar: string; en: string };
  description: { ar: string; en: string };
  badge?: { ar: string; en: string };
};

const TILES: ReadonlyArray<Tile> = [
  {
    key: 'dashboard',
    to: '/admin/identity/dashboard',
    icon: LayoutDashboard,
    tone: 'primary',
    title: { ar: 'لوحة الحسابات الكاملة', en: 'Full accounts dashboard' },
    description: {
      ar: 'مؤشرات تفصيلية للمستخدمين والمنشآت، البحث الموحّد، والنشاط الإداري.',
      en: 'Detailed KPIs for users and businesses, unified search, and admin activity.',
    },
    badge: { ar: 'النسخة الموسّعة', en: 'Extended view' },
  },
  {
    key: 'users',
    to: '/admin/identity?tab=users',
    icon: Users,
    tone: 'users',
    title: { ar: 'المستخدمون', en: 'Users' },
    description: {
      ar: 'إدارة الحسابات، الأدوار، الحظر، وكلمات المرور — السلوك دون تغيير.',
      en: 'Accounts, roles, ban, and passwords — behavior unchanged.',
    },
  },
  {
    key: 'roles',
    to: '/admin/identity?tab=roles',
    icon: Shield,
    tone: 'roles',
    title: { ar: 'الأدوار والصلاحيات', en: 'Roles & Permissions' },
    description: {
      ar: 'إدارة الوصول، الأدوار، وقواعد RLS. النموذج التنفيذي دون تغيير.',
      en: 'Access management, roles, and RLS catalog. Permission model unchanged.',
    },
  },
  {
    key: 'invitations',
    to: '/admin/identity?tab=invitations',
    icon: KeyRound,
    tone: 'invite',
    title: { ar: 'الدعوات وطلبات الانضمام', en: 'Invitations & Access Requests' },
    description: {
      ar: 'طلبات انضمام المستخدمين للمنشآت. تدفّق القبول دون تغيير.',
      en: 'Users requesting access to businesses. Acceptance flow unchanged.',
    },
  },
  {
    key: 'activity',
    to: '/admin/identity?tab=activity',
    icon: Activity,
    tone: 'activity',
    title: { ar: 'النشاط الإداري', en: 'Admin activity' },
    description: {
      ar: 'سجل النشاط للقراءة فقط. كاتب التدقيق دون تغيير.',
      en: 'Read-only admin activity log. Audit writer unchanged.',
    },
  },
  {
    key: 'security',
    to: '/admin/identity?tab=security',
    icon: Lock,
    tone: 'security',
    title: { ar: 'الأمان والوصول للنظام', en: 'Security & System Access' },
    description: {
      ar: 'لوحة وصول النظام للقراءة. الجلسات والمصادقة دون تغيير.',
      en: 'System-access review surface. Sessions and auth unchanged.',
    },
  },
];

const TONE_CLASSES: Record<TileTone, string> = {
  primary:  'bg-primary/10 text-primary',
  users:    'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  roles:    'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  invite:   'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  activity: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  security: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

const IdentityOverviewLanding = () => {
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

export default IdentityOverviewLanding;