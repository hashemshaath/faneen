import { Link } from 'react-router-dom';
import { type LucideIcon, FileText, Wrench, Star, Target,
  Image as ImageIcon, FolderOpen, Megaphone, MessageSquare, Activity,
  ArrowUpRight, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type PrimaryKpi = {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  sub?: string;
  to?: string;
  tone: 'primary' | 'info' | 'accent' | 'success';
};

type SecondaryStat = {
  icon: LucideIcon;
  label: string;
  value: number | string;
  to?: string;
};

const TONE_RING: Record<PrimaryKpi['tone'], string> = {
  primary: 'bg-primary/10 text-primary ring-primary/15',
  info:    'bg-info/10 text-info ring-info/15',
  accent:  'bg-accent/10 text-accent ring-accent/15',
  success: 'bg-success/10 text-success ring-success/15',
};

const TONE_BAR: Record<PrimaryKpi['tone'], string> = {
  primary: 'bg-primary',
  info:    'bg-info',
  accent:  'bg-accent',
  success: 'bg-success',
};

interface Props {
  isRTL: boolean;
  activeContracts: number;
  totalContracts: number;
  services: number;
  avgRating: string | number;
  reviews: number;
  completionRate: number;
  completedContracts: number;
  portfolio: number;
  projects: number;
  promotions: number;
  messages: number;
  operations: number;
}

export function ProviderStatsOverview({
  isRTL,
  activeContracts, totalContracts,
  services, avgRating, reviews,
  completionRate, completedContracts,
  portfolio, projects, promotions, messages, operations,
}: Props) {
  const primary: PrimaryKpi[] = [
    {
      icon: FileText,
      label: isRTL ? 'العقود النشطة' : 'Active contracts',
      value: activeContracts,
      sub: `${isRTL ? 'من أصل' : 'of'} ${totalContracts}`,
      to: '/dashboard/contracts',
      tone: 'primary',
    },
    {
      icon: Wrench,
      label: isRTL ? 'الخدمات النشطة' : 'Active services',
      value: services,
      sub: isRTL ? 'إدارة الخدمات' : 'Manage services',
      to: '/dashboard/services',
      tone: 'info',
    },
    {
      icon: Star,
      label: isRTL ? 'متوسط التقييم' : 'Avg. rating',
      value: avgRating,
      sub: `${reviews} ${isRTL ? 'تقييم' : 'reviews'}`,
      to: '/dashboard/reviews',
      tone: 'accent',
    },
    {
      icon: Target,
      label: isRTL ? 'معدل الإنجاز' : 'Completion rate',
      value: `${completionRate}%`,
      sub: `${completedContracts} ${isRTL ? 'عقد مكتمل' : 'completed'}`,
      tone: 'success',
    },
  ];

  const secondary: SecondaryStat[] = [
    { icon: Wrench,         label: isRTL ? 'خدمات'    : 'Services',  value: services,   to: '/dashboard/services' },
    { icon: ImageIcon,      label: isRTL ? 'معرض'     : 'Portfolio', value: portfolio,  to: '/dashboard/portfolio' },
    { icon: FolderOpen,     label: isRTL ? 'مشاريع'   : 'Projects',  value: projects,   to: '/dashboard/projects' },
    { icon: Megaphone,      label: isRTL ? 'عروض'     : 'Promos',    value: promotions, to: '/dashboard/promotions' },
    { icon: MessageSquare,  label: isRTL ? 'محادثات'  : 'Chats',     value: messages,   to: '/dashboard/messages' },
    { icon: Activity,       label: isRTL ? 'عمليات'   : 'Operations',value: operations },
  ];

  return (
    <Card
      dir={isRTL ? 'rtl' : 'ltr'}
      className="overflow-hidden border-border/50 shadow-[var(--elev-1)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex w-7 h-7 rounded-lg bg-primary/10 text-primary items-center justify-center ring-1 ring-primary/15">
            <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="font-heading text-sm font-semibold leading-tight truncate">
              {isRTL ? 'نظرة عامة على الأداء' : 'Performance overview'}
            </h2>
            <p className="text-[10px] text-muted-foreground">
              {isRTL ? 'أرقام حقيقية من حسابك — محدّثة تلقائيًا' : 'Real metrics from your account — auto-refreshed'}
            </p>
          </div>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border/40 rtl:divide-x-reverse">
        {primary.map((k) => {
          const Wrapper = ({ children }: { children: React.ReactNode }) =>
            k.to ? (
              <Link to={k.to} className="group block h-full p-4 sm:p-5 hover:bg-muted/30 transition-colors focus-visible:bg-muted/40 focus-visible:outline-none">
                {children}
              </Link>
            ) : (
              <div className="h-full p-4 sm:p-5">{children}</div>
            );
          return (
            <Wrapper key={k.label}>
              <div className="flex items-start justify-between gap-2">
                <span className={cn('inline-flex w-9 h-9 rounded-xl items-center justify-center ring-1', TONE_RING[k.tone])}>
                  <k.icon className="w-4 h-4" aria-hidden="true" />
                </span>
                {k.to && (
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity rtl:-scale-x-100" aria-hidden="true" />
                )}
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="tech-content text-2xl sm:text-3xl font-bold leading-none text-foreground">{k.value}</span>
                </div>
                <p className="text-[11px] sm:text-xs font-medium text-foreground/80 mt-1.5">{k.label}</p>
                {k.sub && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{k.sub}</p>}
              </div>
              <div className={cn('mt-3 h-0.5 w-8 rounded-full', TONE_BAR[k.tone])} aria-hidden="true" />
            </Wrapper>
          );
        })}
      </div>

      {/* Secondary stats */}
      <div className="border-t border-border/40 bg-muted/20 px-2 sm:px-3 py-2">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
          {secondary.map((s) => {
            const inner = (
              <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-background transition-colors">
                <span className="inline-flex w-7 h-7 rounded-md bg-background ring-1 ring-border/60 items-center justify-center shrink-0">
                  <s.icon className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="tech-content text-sm font-semibold leading-none text-foreground">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{s.label}</div>
                </div>
              </div>
            );
            return s.to ? (
              <Link key={s.label} to={s.to} className="block">{inner}</Link>
            ) : (
              <div key={s.label}>{inner}</div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

export default ProviderStatsOverview;