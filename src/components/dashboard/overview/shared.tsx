import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  listEndingSoonContractsForUser,
  listOverdueInstallmentPayments,
} from '@/modules/contracts';
import { countMessagesSentByUserSince } from '@/modules/messaging';
import { countNotificationsForUserSince } from '@/modules/notifications';
import { getCurrentMembershipSubscription } from '@/modules/memberships';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowUpRight, AlertTriangle, CalendarDays, Bell, Send,
  CreditCard, Timer, Crown, Sparkles, Zap, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { tierIcons } from '@/lib/membership-tiers';
import { useMembershipVisibility } from '@/hooks/useMembershipVisibility';

/** Brand-aligned chart palette — sourced from central design tokens. */
export const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(var(--success))',
  'hsl(var(--info))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--muted-foreground))',
];

export const ChartTooltipStyle = {
  borderRadius: 12,
  fontSize: 11,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
  color: 'hsl(var(--foreground))',
};

export function getStatusLabel(status: string, isRTL: boolean): string {
  const map: Record<string, { ar: string; en: string }> = {
    draft: { ar: 'مسودة', en: 'Draft' },
    pending_approval: { ar: 'بانتظار الموافقة', en: 'Pending' },
    active: { ar: 'نشط', en: 'Active' },
    completed: { ar: 'مكتمل', en: 'Completed' },
    cancelled: { ar: 'ملغي', en: 'Cancelled' },
    disputed: { ar: 'متنازع', en: 'Disputed' },
  };
  return map[status]?.[isRTL ? 'ar' : 'en'] ?? status;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    draft: 'border-muted-foreground/30 text-muted-foreground',
    pending_approval: 'border-warning/30 text-warning',
    active: 'border-success/30 text-success',
    completed: 'border-primary/30 text-primary',
    cancelled: 'border-destructive/30 text-destructive',
    disputed: 'border-warning/30 text-warning',
  };
  return map[status] ?? '';
}

export function getMonths(isRTL: boolean) {
  return isRTL
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
}

export function buildMonthlyData(items: { created_at: string }[], isRTL: boolean, monthCount = 6) {
  const months = getMonths(isRTL);
  const now = new Date();
  const map = new Map<string, number>();
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    map.set(months[d.getMonth()], 0);
  }
  items.forEach((item) => {
    const key = months[new Date(item.created_at).getMonth()];
    if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries()).map(([month, count]) => ({ month, count }));
}

/** Time-of-day greeting (NEW). */
export function getTimeGreeting(isRTL: boolean): string {
  const h = new Date().getHours();
  if (h < 12) return isRTL ? 'صباح الخير' : 'Good morning';
  if (h < 18) return isRTL ? 'طاب يومك' : 'Good afternoon';
  return isRTL ? 'مساء الخير' : 'Good evening';
}

/** Refresh icon button — NEW. */
export const RefreshButton = React.memo(function RefreshButton({
  onClick,
  isLoading,
  isRTL,
}: { onClick: () => void; isLoading?: boolean; isRTL: boolean }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={isLoading}
      aria-label={isRTL ? 'تحديث' : 'Refresh'}
      className="h-9 w-9 rounded-lg hover:bg-muted"
    >
      <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} aria-hidden="true" />
    </Button>
  );
});

/* ================================================================== */
/*  Unified dashboard primitives — single source of truth for cards.  */
/* ================================================================== */

/** Standard card shell — apply to every dashboard section Card. */
export const SECTION_CARD_CLASS = 'border-border/60 bg-card';

/** Standard CardContent padding + vertical rhythm. */
export const SECTION_CONTENT_CLASS = 'p-3 sm:p-4 space-y-3';

type SectionTone = 'neutral' | 'accent' | 'warning' | 'success' | 'primary';

const toneIconClasses: Record<SectionTone, string> = {
  neutral: 'bg-muted/40 text-muted-foreground border-border/60',
  accent:  'bg-accent/10 text-accent border-accent/20',
  warning: 'bg-warning/10 text-warning border-warning/25',
  success: 'bg-success/10 text-success border-success/25',
  primary: 'bg-primary/10 text-primary border-primary/20',
};

/**
 * Unified header for every dashboard section card.
 * Renders an icon-in-tinted-box + heading + optional right-side slot.
 */
export const SectionHeader = React.memo(function SectionHeader({
  icon: Icon,
  title,
  tone = 'neutral',
  right,
  description,
}: {
  icon: React.ElementType;
  title: string;
  tone?: SectionTone;
  right?: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className={cn('p-1.5 rounded-lg border shrink-0', toneIconClasses[tone])}>
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-[13px] leading-tight text-foreground truncate">
            {title}
          </h3>
          {description && (
            <p className="text-[10px] text-muted-foreground leading-snug mt-0.5 truncate">
              {description}
            </p>
          )}
        </div>
      </div>
      {right && <div className="shrink-0 flex items-center gap-1.5">{right}</div>}
    </div>
  );
});

/** Small pill/chip — use for "Last 24h", counts, status tags inside SectionHeader.right. */
export const SectionChip = React.memo(function SectionChip({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: SectionTone;
}) {
  const toneClass =
    tone === 'accent'  ? 'text-accent bg-accent/10 border-accent/20'   :
    tone === 'warning' ? 'text-warning bg-warning/10 border-warning/25' :
    tone === 'success' ? 'text-success bg-success/10 border-success/25' :
    tone === 'primary' ? 'text-primary bg-primary/10 border-primary/20' :
                         'text-muted-foreground bg-muted/50 border-border/40';
  return (
    <span className={cn('text-[10px] font-medium rounded-full px-2 py-0.5 border tracking-tight', toneClass)}>
      {children}
    </span>
  );
});

/** "View all" style link button shown in SectionHeader.right. */
export const SectionLinkAction = React.memo(function SectionLinkAction({
  to, label,
}: { to: string; label: string }) {
  return (
    <Link to={to}>
      <Button variant="ghost" size="sm" className="text-[11px] text-accent h-7 px-2 gap-1 font-medium">
        {label}
        <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
      </Button>
    </Link>
  );
});

/** Empty-state body for section cards. */
export const SectionEmpty = React.memo(function SectionEmpty({
  icon: Icon, message, action,
}: { icon: React.ElementType; message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
      <Icon className="w-8 h-8 mb-2 opacity-20" aria-hidden="true" />
      <p className="text-[11px]">{message}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
});

export const StatCard = React.memo(function StatCard({
  icon: Icon, label, value, sub, color, to,
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string; to?: string;
}) {
  const content = (
    <Card className="border-border/30 hover:shadow-lg hover:shadow-accent/5 hover:border-accent/25 transition-all duration-300 group h-full">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
            <Icon className="w-4.5 h-4.5" aria-hidden="true" />
          </div>
          {to && <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />}
        </div>
        <p className="text-xl sm:text-2xl font-bold leading-none tracking-tight"><span className="tech-content">{value}</span></p>
        {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5">{label}</p>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to} className="block h-full">{content}</Link> : content;
});

export const QuickAction = React.memo(function QuickAction({
  icon: Icon, label, to,
}: { icon: React.ElementType; label: string; to: string }) {
  return (
    <Link to={to}>
      <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1.5 rounded-xl hover:border-accent/50 hover:bg-accent/5 hover:shadow-sm transition-all duration-300">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-accent" aria-hidden="true" />
        </div>
        <span className="text-[10px] font-medium">{label}</span>
      </Button>
    </Link>
  );
});

export const TodaySummary = React.memo(function TodaySummary({
  isRTL, userId,
}: { isRTL: boolean; userId: string }) {
  const { data } = useQuery({
    queryKey: ['today-summary', userId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const [notifs, messages] = await Promise.all([
        countNotificationsForUserSince({ userId, sinceIso: `${today}T00:00:00Z` }),
        countMessagesSentByUserSince({ userId, sinceIso: `${today}T00:00:00Z` }),
      ]);
      return {
        todayNotifs: ((notifs as { count?: number }).count) ?? 0,
        todayMessages: ((messages as { count?: number }).count) ?? 0,
      };
    },
    staleTime: 60000,
  });

  const items = [
    {
      icon: Bell,
      label: isRTL ? 'إشعارات اليوم' : "Today's alerts",
      hint: isRTL ? 'تنبيهات وردت خلال الـ24 ساعة الماضية' : 'Alerts received in the last 24 hours',
      emptyHint: isRTL ? 'لا توجد تنبيهات جديدة حتى الآن' : 'No new alerts yet',
      value: data?.todayNotifs ?? 0,
      tone: 'warning' as const,
    },
    {
      icon: Send,
      label: isRTL ? 'رسائل أرسلتها اليوم' : 'Messages you sent today',
      hint: isRTL ? 'إجمالي ما أرسلته خلال اليوم' : 'Total messages you sent today',
      emptyHint: isRTL ? 'لم ترسل أي رسالة اليوم' : 'You haven\u2019t sent any messages today',
      value: data?.todayMessages ?? 0,
      tone: 'accent' as const,
    },
  ];

  return (
    <Card className={SECTION_CARD_CLASS}>
      <CardContent className={SECTION_CONTENT_CLASS}>
        <SectionHeader
          icon={CalendarDays}
          title={isRTL ? 'ملخّص يومك' : "Today's summary"}
          right={<SectionChip>{isRTL ? 'آخر 24 ساعة' : 'Last 24h'}</SectionChip>}
        />

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {items.map((item, i) => {
            const isEmpty = item.value === 0;
            const activeBg = item.tone === 'warning' ? 'bg-warning/5' : 'bg-accent/5';
            const activeBorder = item.tone === 'warning' ? 'border-warning/25' : 'border-accent/20';
            const activeLabel = item.tone === 'warning' ? 'text-warning' : 'text-accent';
            const iconWrapActive = item.tone === 'warning' ? 'bg-warning/10 text-warning' : 'bg-accent/10 text-accent';
            const ItemIcon = item.icon;
            return (
              <div
                key={i}
                className={`flex flex-col p-3 rounded-xl border transition-colors min-h-[140px] ${
                  isEmpty
                    ? 'border-dashed border-border/50 bg-muted/20'
                    : `${activeBorder} ${activeBg}`
                }`}
              >
                {/* Icon on top */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                    isEmpty ? 'bg-muted/40 text-muted-foreground/60' : iconWrapActive
                  }`}
                >
                  <ItemIcon className="w-4 h-4" aria-hidden="true" />
                </div>
                {/* Label on its own line, allowed to wrap */}
                <p
                  className={`text-[11px] font-medium leading-snug mb-1.5 break-words ${
                    isEmpty ? 'text-muted-foreground' : activeLabel
                  }`}
                >
                  {item.label}
                </p>
                {/* Value */}
                <p
                  className={`text-2xl font-bold leading-none tracking-tight tech-content ${
                    isEmpty ? 'text-muted-foreground/40' : 'text-foreground'
                  }`}
                >
                  {item.value}
                </p>
                {/* Hint pinned to bottom */}
                <p
                  className={`mt-auto pt-2 text-[10px] leading-snug break-words ${
                    isEmpty ? 'text-muted-foreground/60' : 'text-muted-foreground'
                  }`}
                >
                  {isEmpty ? item.emptyHint : item.hint}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});

export const OverdueAlerts = React.memo(function OverdueAlerts({
  isRTL, userId,
}: { isRTL: boolean; userId: string }) {
  const { data } = useQuery({
    queryKey: ['overdue-alerts', userId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data: overduePayments } = await listOverdueInstallmentPayments(today, 10);

      const { data: expiringContracts } = await listEndingSoonContractsForUser({
        userId,
        cutoffDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        limit: 10,
      });

      return {
        overduePayments: overduePayments?.length ?? 0,
        expiringContracts: expiringContracts?.length ?? 0,
      };
    },
    staleTime: 120000,
  });

  const total = (data?.overduePayments ?? 0) + (data?.expiringContracts ?? 0);
  if (total === 0) return null;

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardContent className={SECTION_CONTENT_CLASS}>
        <SectionHeader
          icon={AlertTriangle}
          tone="warning"
          title={isRTL ? 'تنبيهات تحتاج انتباهك' : 'Needs your attention'}
          right={<SectionChip tone="warning">{total}</SectionChip>}
        />
        <div className="space-y-1.5">
          {(data?.overduePayments ?? 0) > 0 && (
            <Link to="/dashboard/installments" className="flex items-center gap-2 p-2 rounded-lg bg-warning/10 hover:bg-warning/15 transition-colors">
              <CreditCard className="w-3.5 h-3.5 text-warning" aria-hidden="true" />
              <span className="text-[11px] font-medium text-warning dark:text-warning">
                {data!.overduePayments} {isRTL ? 'أقساط متأخرة' : 'overdue payments'}
              </span>
            </Link>
          )}
          {(data?.expiringContracts ?? 0) > 0 && (
            <Link to="/dashboard/contracts" className="flex items-center gap-2 p-2 rounded-lg bg-warning/10 hover:bg-warning/15 transition-colors">
              <Timer className="w-3.5 h-3.5 text-warning" aria-hidden="true" />
              <span className="text-[11px] font-medium text-warning dark:text-warning">
                {data!.expiringContracts} {isRTL ? 'عقود قاربت الانتهاء' : 'contracts expiring soon'}
              </span>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

type MembershipPlan = { name_ar: string; name_en: string; tier: string };
type MembershipSub = {
  expires_at: string | null;
  billing_cycle: string | null;
  plan: MembershipPlan | null;
};

export const MembershipWidget = React.memo(function MembershipWidget({
  isRTL, userId,
}: { isRTL: boolean; userId: string }) {
  const membershipVisibility = useMembershipVisibility();
  const { data: sub } = useQuery({
    queryKey: ['membership-widget', userId],
    queryFn: async () => {
      const { data } = await getCurrentMembershipSubscription<MembershipSub>({
        userId,
        select:
          'expires_at, billing_cycle, plan:membership_plans!plan_id(name_ar, name_en, tier)',
      });
      return data;
    },
    staleTime: 300000,
  });

  const daysRemaining = sub?.expires_at
    ? Math.max(0, Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86400000))
    : null;

  const plan = sub?.plan ?? null;
  const tier = plan?.tier || 'free';
  const Icon = tierIcons[tier] || Zap;
  const cycleDays = sub?.billing_cycle === 'yearly' ? 365 : 30;

  return (
    <Card className={SECTION_CARD_CLASS}>
      <CardContent className={SECTION_CONTENT_CLASS}>
        <SectionHeader
          icon={Crown}
          tone="accent"
          title={isRTL ? 'عضويتك' : 'Your Membership'}
          right={<SectionChip tone="accent">{plan ? (isRTL ? plan.name_ar : plan.name_en) : (isRTL ? 'مجاني' : 'Free')}</SectionChip>}
        />
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-accent" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-foreground truncate">{plan ? (isRTL ? plan.name_ar : plan.name_en) : (isRTL ? 'الخطة المجانية' : 'Free plan')}</p>
            {daysRemaining !== null && (
              <>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                  <span>{isRTL ? `${daysRemaining} يوم متبقي` : `${daysRemaining} days left`}</span>
                  <span>{Math.round((daysRemaining / cycleDays) * 100)}%</span>
                </div>
                <Progress
                  value={Math.max(5, (daysRemaining / cycleDays) * 100)}
                  className="h-1.5 mt-1"
                  aria-label={isRTL ? `${daysRemaining} يوم متبقي من الاشتراك` : `${daysRemaining} days left in subscription`}
                />
              </>
            )}
          </div>
        </div>
        <Link to={membershipVisibility.membershipPathOrNull ?? '/contact'} className="block">
          <Button variant="ghost" size="sm" className="w-full text-[11px] h-8 text-accent gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />{isRTL ? 'إدارة العضوية' : 'Manage Plan'}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
});

/** Skeleton placeholder shown during lazy chunk load — NEW. */
export function DashboardViewSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <Skeleton className="h-24 rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}