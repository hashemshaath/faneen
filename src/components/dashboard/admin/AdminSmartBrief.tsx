import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowUpRight, type LucideIcon, AlertTriangle, ShieldCheck, Inbox, TrendingUp, Mail, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

type Severity = 'critical' | 'warning' | 'info' | 'success';

interface BriefItem {
  id: string;
  severity: Severity;
  icon: LucideIcon;
  title: string;
  reason: string;
  to: string;
  cta: string;
}

export interface AdminSmartBriefSignals {
  dlqActive?: number;
  contractsPending?: number;
  providersPending?: number;
  approvalsPending?: number;
  ownershipTransfersPending?: number;
  accessRequestsPending?: number;
  quoteRequestsPending?: number;
  serviceRequestsPending?: number;
  newContactMessages?: number;
  leadsToday?: number;
  providersToday?: number;
  contractsToday?: number;
  servicePendingReview?: number;
  servicesSuspended?: number;
}

const SEV_STYLES: Record<Severity, { bar: string; chip: string; iconBg: string; iconFg: string; label: { ar: string; en: string } }> = {
  critical: { bar: 'bg-destructive', chip: 'bg-destructive/10 text-destructive border-destructive/20', iconBg: 'bg-destructive/10', iconFg: 'text-destructive', label: { ar: 'حرج', en: 'Critical' } },
  warning:  { bar: 'bg-warning',     chip: 'bg-warning/10 text-warning border-warning/20',             iconBg: 'bg-warning/10',     iconFg: 'text-warning',     label: { ar: 'تحذير', en: 'Warning' } },
  info:     { bar: 'bg-info',        chip: 'bg-info/10 text-info border-info/20',                     iconBg: 'bg-info/10',        iconFg: 'text-info',        label: { ar: 'معلومة', en: 'Info' } },
  success:  { bar: 'bg-success',     chip: 'bg-success/10 text-success border-success/20',           iconBg: 'bg-success/10',     iconFg: 'text-success',     label: { ar: 'سليم', en: 'Healthy' } },
};

const SEV_RANK: Record<Severity, number> = { critical: 0, warning: 1, info: 2, success: 3 };

function buildBrief(signals: AdminSmartBriefSignals, isRTL: boolean): BriefItem[] {
  const items: BriefItem[] = [];
  const cta = isRTL ? 'افتح' : 'Open';

  if ((signals.dlqActive ?? 0) > 0) {
    items.push({
      id: 'dlq', severity: 'critical', icon: AlertTriangle,
      title: isRTL ? `${signals.dlqActive} رسالة بريد فشل تسليمها` : `${signals.dlqActive} emails failed to deliver`,
      reason: isRTL ? 'تأثير مباشر على الإشعارات والاسترداد — افحص قائمة الفشل خلال أقل من ساعة.' : 'Directly impacts notifications & recovery — triage within the hour.',
      to: '/admin/email-center', cta,
    });
  }
  if ((signals.contractsPending ?? 0) > 0) {
    items.push({
      id: 'contracts-pending', severity: 'warning', icon: Inbox,
      title: isRTL ? `${signals.contractsPending} عقد بانتظار الاعتماد` : `${signals.contractsPending} contracts awaiting approval`,
      reason: isRTL ? 'كل يوم تأخير = تأخير إيراد. راجعها لتحرير سلسلة العمل.' : 'Each day of delay defers revenue. Clear the queue to unblock workflow.',
      to: '/admin/contracts', cta,
    });
  }
  const totalApprovals = (signals.providersPending ?? 0) + (signals.approvalsPending ?? 0) + (signals.servicePendingReview ?? 0);
  if (totalApprovals > 0) {
    items.push({
      id: 'approvals', severity: 'warning', icon: ShieldCheck,
      title: isRTL ? `${totalApprovals} طلب موافقة في الطابور` : `${totalApprovals} approval items queued`,
      reason: isRTL ? 'مزوّدون، عضويات، وخدمات بانتظار قرارك — مراجعتها تسرّع التفعيل.' : 'Providers, memberships, and services waiting on you — approving accelerates activation.',
      to: '/admin/approvals', cta,
    });
  }
  if ((signals.servicesSuspended ?? 0) > 0) {
    items.push({
      id: 'suspended', severity: 'critical', icon: AlertTriangle,
      title: isRTL ? `${signals.servicesSuspended} خدمة موقوفة` : `${signals.servicesSuspended} services suspended`,
      reason: isRTL ? 'تؤثر على ظهور المزوّد في النتائج العامة — راجع السبب.' : 'Hurts provider visibility on public surfaces — investigate the cause.',
      to: '/admin/service-activations?admin_status=suspended', cta,
    });
  }
  const inboxTotal = (signals.quoteRequestsPending ?? 0) + (signals.serviceRequestsPending ?? 0) + (signals.newContactMessages ?? 0);
  if (inboxTotal > 0) {
    items.push({
      id: 'inbox', severity: 'info', icon: Mail,
      title: isRTL ? `${inboxTotal} رسالة وطلب جديد` : `${inboxTotal} new messages & requests`,
      reason: isRTL ? 'الردّ السريع يرفع الثقة والتحويل. ابدأ بالأقدم.' : 'Fast replies lift trust & conversion. Start with the oldest.',
      to: '/admin/contact-messages', cta,
    });
  }
  if ((signals.leadsToday ?? 0) >= 5) {
    items.push({
      id: 'leads-spike', severity: 'info', icon: TrendingUp,
      title: isRTL ? `${signals.leadsToday} طلب وارد اليوم` : `${signals.leadsToday} incoming leads today`,
      reason: isRTL ? 'نشاط مرتفع — تأكد من توزيع الطلبات على المزوّدين بسرعة.' : 'Above-baseline activity — make sure leads route to providers quickly.',
      to: '/admin/lead-requests', cta,
    });
  }
  if ((signals.providersToday ?? 0) >= 1) {
    items.push({
      id: 'providers-today', severity: 'info', icon: Crown,
      title: isRTL ? `${signals.providersToday} مزوّد جديد سجّل اليوم` : `${signals.providersToday} new providers today`,
      reason: isRTL ? 'افحص جودة التسجيل وادفعهم نحو الترقية.' : 'Validate onboarding quality and nudge them toward upgrade.',
      to: '/admin/businesses', cta,
    });
  }

  if (items.length === 0) {
    items.push({
      id: 'healthy', severity: 'success', icon: ShieldCheck,
      title: isRTL ? 'كل شيء يعمل بسلاسة' : 'All systems are calm',
      reason: isRTL ? 'لا توجد إشارات حرجة الآن — وقت ممتاز للمبادرات الاستباقية.' : 'No critical signals right now — great window for proactive work.',
      to: '/admin/operations', cta,
    });
  }

  items.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
  return items.slice(0, 4);
}

export function AdminSmartBrief({ signals, isRTL }: { signals: AdminSmartBriefSignals; isRTL: boolean }) {
  const items = useMemo(() => buildBrief(signals, isRTL), [signals, isRTL]);
  const topSeverity = items[0]?.severity ?? 'success';
  const sev = SEV_STYLES[topSeverity];

  return (
    <Card className="border-border/40 overflow-hidden">
      <div className={cn('h-0.5 w-full', sev.bar)} aria-hidden="true" />
      <CardContent className="px-4 pt-3 pb-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-tight">
                {isRTL ? 'موجز ذكي للمسؤول' : 'Admin Smart Brief'}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {isRTL ? 'أهم الأولويات الآن — مبنية على بيانات حقيقية.' : 'Top priorities right now — derived from live signals.'}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5 border', sev.chip)}>
            {isRTL ? sev.label.ar : sev.label.en}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {items.map((item) => {
            const s = SEV_STYLES[item.severity];
            return (
              <Link
                key={item.id}
                to={item.to}
                className="group rounded-xl border border-border/40 p-2.5 flex items-start gap-2.5 hover:border-accent/40 hover:bg-muted/30 transition-colors"
              >
                <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', s.iconBg, s.iconFg)}>
                  <item.icon className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold leading-tight truncate">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground leading-snug mt-1 line-clamp-2">{item.reason}</p>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-accent transition-colors shrink-0 mt-0.5" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}