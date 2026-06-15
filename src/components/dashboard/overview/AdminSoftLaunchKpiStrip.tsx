/**
 * DASHBOARD EXPERIENCE PHASE B4 — Admin Soft Launch KPI Strip.
 *
 * Pure presentational strip of operational entry points for the soft-launch
 * window. Renders link tiles only — NO queries, NO mutations, NO Supabase,
 * NO services. Optional numeric value can be passed by the parent when it
 * already has data available; otherwise the tile shows a neutral label.
 */
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  ShieldCheck,
  Activity,
  ScrollText,
  Rocket,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface AdminSoftLaunchKpi {
  id: string;
  label: { ar: string; en: string };
  to: string;
  icon: LucideIcon;
  /** Optional numeric/string indicator supplied by the parent from data
   *  it already fetches. When omitted the tile renders a neutral em-dash. */
  value?: number | string | null;
  tone?: 'info' | 'warning' | 'accent' | 'primary' | 'destructive';
}

export interface AdminSoftLaunchKpiStripProps {
  isRTL: boolean;
  items?: AdminSoftLaunchKpi[];
}

const TONE_CLASS: Record<NonNullable<AdminSoftLaunchKpi['tone']>, string> = {
  info: 'text-info bg-info/10',
  warning: 'text-warning bg-warning/10',
  accent: 'text-accent bg-accent/10',
  primary: 'text-primary bg-primary/10',
  destructive: 'text-destructive bg-destructive/10',
};

export function AdminSoftLaunchKpiStrip({ isRTL, items }: AdminSoftLaunchKpiStripProps) {
  const list: AdminSoftLaunchKpi[] = items ?? [
    {
      id: 'requests-today',
      label: { ar: 'طلبات اليوم', en: "Today's requests" },
      to: '/admin/quote-requests',
      icon: ClipboardList,
      tone: 'info',
    },
    {
      id: 'providers-pending',
      label: { ar: 'مزودون بانتظار المراجعة', en: 'Providers pending review' },
      to: '/admin/provider-review',
      icon: ShieldCheck,
      tone: 'warning',
    },
    {
      id: 'operations',
      label: { ar: 'تشغيل النظام', en: 'System operations' },
      to: '/admin/operations',
      icon: Activity,
      tone: 'accent',
    },
    {
      id: 'activity-log',
      label: { ar: 'السجلات والتنبيهات', en: 'Logs & alerts' },
      to: '/admin/activity-log',
      icon: ScrollText,
      tone: 'primary',
    },
    {
      id: 'soft-launch',
      label: { ar: 'الإطلاق التجريبي', en: 'Soft launch' },
      to: '/admin/operations?tab=soft-launch',
      icon: Rocket,
      tone: 'accent',
    },
  ];

  return (
    <Card
      className="border-border/40"
      data-testid="admin-soft-launch-kpi-strip"
      data-role="admin"
    >
      <CardHeader className="pb-1 px-4 pt-3">
        <CardTitle className="text-xs flex items-center gap-2">
          <Rocket className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
          {isRTL ? 'متابعة الإطلاق التجريبي' : 'Soft launch monitor'}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {list.map((m) => {
            const Icon = m.icon;
            const tone = TONE_CLASS[m.tone ?? 'accent'];
            const hasValue = m.value !== null && m.value !== undefined && m.value !== '';
            return (
              <Link
                key={m.id}
                to={m.to}
                className="group rounded-xl border border-border/40 p-3 flex items-center justify-between gap-2 hover:border-accent/40 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', tone)}>
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className={cn('text-sm font-semibold leading-none tech-content', hasValue ? '' : 'text-muted-foreground')}>
                      {hasValue ? m.value : '—'}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">
                      {isRTL ? m.label.ar : m.label.en}
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-accent transition-colors" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default AdminSoftLaunchKpiStrip;