import React from 'react';
import {
  Briefcase, User, Shield, Timer, Send, Download, Share2, ExternalLink,
  ChevronDown, CircleCheck, DollarSign, TrendingUp, Ruler, ListChecks,
  CheckCircle2, StickyNote, Paperclip, Phone, Mail,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Database } from '@/integrations/supabase/types';
import { getContractStatusMeta } from '@/lib/contract-statuses';
import { getContractHealth, getDaysRemaining } from './contract-helpers';
import { HealthBadge } from '@/components/health/HealthBadge';
import { contractHealth } from '@/modules/health';
import { getContractNextActionSummary, type NextActionTone } from '@/lib/contract-approval-timeline';
import { Clock } from 'lucide-react';

type ContractRow = Database['public']['Tables']['contracts']['Row'];
type MilestoneRow = Database['public']['Tables']['contract_milestones']['Row'];
type PaymentRow = Database['public']['Tables']['installment_payments']['Row'];
export type ContractWithRole = ContractRow & { _role: string };

/* ── Status Config (centralized in @/lib/contract-statuses) ── */
const statusConfig = (Object.fromEntries(
  ['draft', 'pending_approval', 'active', 'completed', 'cancelled', 'disputed'].map((k) => {
    const m = getContractStatusMeta(k);
    return [k, { icon: m.icon, color: m.badge, label_ar: m.label_ar, label_en: m.label_en, ring: m.ring, gradient: m.gradient }];
  }),
) as Record<string, { icon: React.ElementType; color: string; label_ar: string; label_en: string; ring: string; gradient: string }>);

/* ── Mini Circular Progress ── */
const CircularProgress = ({ value, size = 36, stroke = 3, color = 'text-accent' }: { value: number; size?: number; stroke?: number; color?: string }) => {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-muted/40" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={`${color} stroke-current transition-all duration-700`} />
    </svg>
  );
};

export interface ContractCardProps {
  c: ContractWithRole;
  isRTL: boolean;
  user: { id: string } | null;
  milestones: MilestoneRow[];
  notes: Array<{ id: string; content: string; note_type: string; created_at: string; user_id: string }>;
  attachments: Array<{ id: string; file_name: string; file_url: string; file_type: string; created_at: string }>;
  payments: PaymentRow[];
  measurements: Array<{ id: string; total_cost: number | null; [key: string]: unknown }>;
  profiles: Array<{ user_id: string; full_name: string | null; avatar_url: string | null; email?: string }>;
  onExpand: (id: string | null) => void;
  isExpanded: boolean;
  onNavigate: (path: string) => void;
  onExportPDF: (c: ContractWithRole) => void;
  onApprove: (c: ContractWithRole) => void;
  onSendForApproval: (c: ContractWithRole) => void;
  onDuplicate: (c: ContractWithRole) => void;
  onShare: (c: ContractWithRole) => void;
  onEdit: (c: ContractWithRole) => void;
  lineItems?: Array<{ id: string; total_cost: number | null }>;
  warranties?: Array<{ id: string }>;
  maintenance?: Array<{ id: string }>;
  amendments?: Array<{ id: string }>;
  measurementTotal?: number;
  lineItemTotal?: number;
  locked?: boolean;
  isProvider?: boolean;
  [key: string]: unknown;
}

/**
 * Enhanced contract card for the /dashboard/contracts list.
 * Extracted from DashboardContracts (Phase 2C) — markup, classes, ARIA unchanged.
 */
export const ContractCard = React.memo(({
  c, isRTL, user, milestones, notes, attachments, payments, measurements, profiles,
  onExpand, isExpanded, onNavigate, onExportPDF, onApprove, onSendForApproval, onShare,
}: ContractCardProps) => {
  const cfg = statusConfig[c.status] || statusConfig.draft;
  const StatusIcon = cfg.icon;
  const clientP = profiles.find((p) => p.user_id === c.client_id);
  const providerP = profiles.find((p) => p.user_id === c.provider_id);
  const isProvider = user?.id === c.provider_id;
  const title = isRTL ? c.title_ar : (c.title_en || c.title_ar);
  const completedMs = milestones.filter((m) => m.status === 'completed').length;
  const totalMs = milestones.length;
  const progress = totalMs > 0 ? Math.round((completedMs / totalMs) * 100) : 0;
  const canAccept = (user?.id === c.client_id && !c.client_accepted_at) || (user?.id === c.provider_id && !c.provider_accepted_at);
  const healthScore = getContractHealth(c, milestones, payments);
  const daysRemaining = getDaysRemaining(c.end_date);
  const paidPayments = payments.filter((p) => p.status === 'paid');
  const totalPaid = paidPayments.reduce((s: number, p) => s + Number(p.amount), 0);
  const paymentPercent = Number(c.total_amount) > 0 ? Math.round((totalPaid / Number(c.total_amount)) * 100) : 0;
  const locked = ['active', 'completed', 'cancelled'].includes(c.status);
  const measurementTotal = measurements.reduce((s: number, m) => s + Number(m.total_cost || 0), 0);
  const nextAction = getContractNextActionSummary(c, isRTL);
  const toneClass: Record<NextActionTone, string> = {
    muted: 'bg-muted/40 text-muted-foreground border-border/60',
    info: 'bg-info/5 dark:bg-info/10 text-info border-info/30',
    success: 'bg-success/5 dark:bg-success/10 text-success border-success/30',
    warning: 'bg-warning/5 dark:bg-warning/10 text-warning border-warning/40',
    destructive: 'bg-destructive/5 dark:bg-destructive/10 text-destructive border-destructive/30',
  };
  const nextLabel = isRTL ? nextAction.labelAr : nextAction.labelEn;
  const nextHint = isRTL ? nextAction.actionHintAr : nextAction.actionHintEn;
  const nextTimestamp = nextAction.timestamp
    ? new Date(nextAction.timestamp).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    : null;

  return (
    <Card className={`overflow-hidden transition-all duration-300 hover:shadow-md group border-border/70 ${isExpanded ? 'ring-2 ring-accent/30 shadow-lg' : 'hover:border-accent/40'}`}>
      <CardContent className="p-0">
        <div className={`h-1 w-full bg-gradient-to-r ${cfg.gradient} opacity-80`} aria-hidden="true" />

        <div className="p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4 flex-wrap sm:flex-nowrap">
            <div className="relative shrink-0 hidden sm:block">
              <CircularProgress
                value={healthScore}
                size={44}
                stroke={3.5}
                color={healthScore >= 70 ? 'text-success' : healthScore >= 40 ? 'text-warning' : 'text-destructive'}
              />
              <span
                className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${healthScore >= 70 ? 'text-success' : healthScore >= 40 ? 'text-warning' : 'text-destructive'}`}
                aria-label={isRTL ? `صحة العقد ${healthScore}%` : `Contract health ${healthScore}%`}
              >
                {healthScore}%
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h3 className="font-heading font-bold text-base sm:text-[17px] text-foreground leading-snug break-words">{title}</h3>
                <Badge className={`${cfg.color} gap-1 text-[11px] px-2 py-0.5 shrink-0 font-medium`}>
                  <StatusIcon className="w-3 h-3" aria-hidden="true" />
                  {isRTL ? cfg.label_ar : cfg.label_en}
                </Badge>
                <HealthBadge kind="contract" value={contractHealth(c.status, c.end_date)} />
                {locked && (
                  <Badge variant="outline" className="text-[10px] gap-1 px-1.5 h-5 border-warning/60 text-warning bg-warning/5">
                    <Shield className="w-3 h-3" aria-hidden="true" />
                    {isRTL ? 'مقفل' : 'Locked'}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
                <span className="font-mono bg-muted px-2 py-0.5 rounded text-[11px] text-foreground/80 tech-content">{c.contract_number}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1 border-border/60">
                  {isProvider ? <Briefcase className="w-3 h-3" aria-hidden="true" /> : <User className="w-3 h-3" aria-hidden="true" />}
                  {isProvider ? (isRTL ? 'مزود خدمة' : 'Provider') : (isRTL ? 'عميل' : 'Client')}
                </Badge>
                {daysRemaining !== null && c.status === 'active' && (
                  <Badge
                    variant={daysRemaining < 7 ? 'destructive' : daysRemaining < 30 ? 'secondary' : 'outline'}
                    className="text-[10px] px-1.5 py-0 h-5 gap-1"
                  >
                    <Timer className="w-3 h-3" aria-hidden="true" />
                    {daysRemaining > 0 ? (isRTL ? `${daysRemaining} يوم` : `${daysRemaining}d left`) : (isRTL ? 'منتهي' : 'Overdue')}
                  </Badge>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <TooltipProvider delayDuration={200}>
              <div className="flex items-center gap-0.5 shrink-0 ms-auto" role="group" aria-label={isRTL ? 'إجراءات العقد' : 'Contract actions'}>
                {canAccept && c.status !== 'completed' && c.status !== 'cancelled' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-success hover:bg-success/10 dark:hover:bg-success/20 focus-visible:ring-2 focus-visible:ring-success/40"
                        onClick={() => onApprove(c)}
                        aria-label={isRTL ? 'موافقة' : 'Approve'}
                      >
                        <CircleCheck className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[11px]">{isRTL ? 'موافقة' : 'Approve'}</TooltipContent>
                  </Tooltip>
                )}
                {c.status === 'draft' && user?.id === c.provider_id && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary hover:bg-primary/10"
                        onClick={() => onSendForApproval(c)}
                        aria-label={isRTL ? 'إرسال للمراجعة' : 'Send for Review'}
                      >
                        <Send className="w-3.5 h-3.5" aria-hidden="true" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[11px]">{isRTL ? 'إرسال للمراجعة' : 'Send for Review'}</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => onExportPDF(c)}
                      aria-label={isRTL ? 'تصدير PDF' : 'Export PDF'}
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[11px]">PDF</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => onShare(c)}
                      aria-label={isRTL ? 'مشاركة' : 'Share'}
                    >
                      <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[11px]">{isRTL ? 'مشاركة' : 'Share'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => onNavigate(`/contracts/${c.id}`)}
                      aria-label={isRTL ? 'عرض العقد' : 'View contract'}
                    >
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[11px]">{isRTL ? 'عرض' : 'View'}</TooltipContent>
                </Tooltip>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 text-muted-foreground hover:text-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  onClick={() => onExpand(isExpanded ? null : c.id)}
                  aria-label={isExpanded ? (isRTL ? 'طي' : 'Collapse') : (isRTL ? 'توسيع' : 'Expand')}
                  aria-expanded={isExpanded}
                >
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            </TooltipProvider>
          </div>

          {/* Last / Next Action Summary */}
          <div
            className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 mb-3 text-[11px] ${toneClass[nextAction.tone]}`}
            role="status"
            aria-label={isRTL ? `الإجراء التالي: ${nextLabel}` : `Next action: ${nextLabel}`}
          >
            <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-80" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold leading-tight">{nextLabel}</span>
                {nextHint && (
                  <>
                    <span className="opacity-50" aria-hidden="true">·</span>
                    <span className="opacity-90 leading-tight break-words">{nextHint}</span>
                  </>
                )}
              </div>
              {nextTimestamp && (
                <span className="block opacity-70 mt-0.5 tech-content text-[10px]">{nextTimestamp}</span>
              )}
            </div>
          </div>

          {/* Financial KPIs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <div className="relative overflow-hidden rounded-xl bg-card p-3 border border-border/70 ps-[14px] before:absolute before:start-0 before:inset-y-2 before:w-1 before:rounded-full before:bg-accent/70">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] text-muted-foreground font-medium">{isRTL ? 'قيمة العقد' : 'Contract Value'}</p>
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground/60" aria-hidden="true" />
              </div>
              <p className="text-base font-bold text-foreground tracking-tight tech-content leading-tight">
                {Number(c.total_amount).toLocaleString()}
                <span className="text-[10px] font-medium text-muted-foreground ms-1">{c.currency_code}</span>
              </p>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-success/5 dark:bg-success/10 p-3 border border-success/20 ps-[14px] before:absolute before:start-0 before:inset-y-2 before:w-1 before:rounded-full before:bg-success/70">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] text-muted-foreground font-medium">{isRTL ? 'المحصّل' : 'Collected'}</p>
                <TrendingUp className="w-3.5 h-3.5 text-success/70" aria-hidden="true" />
              </div>
              <p className="text-base font-bold text-foreground tracking-tight tech-content leading-tight">
                {totalPaid.toLocaleString()}
                <span className="text-[10px] font-medium text-muted-foreground ms-1">{c.currency_code}</span>
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <Progress value={paymentPercent} className="h-1.5 flex-1 [&>div]:bg-success" aria-label={isRTL ? `نسبة التحصيل ${paymentPercent}٪` : `Collected ${paymentPercent}%`} />
                <span className="text-[10px] font-semibold text-success tech-content">{paymentPercent}%</span>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-info/5 dark:bg-info/10 p-3 border border-info/20 ps-[14px] before:absolute before:start-0 before:inset-y-2 before:w-1 before:rounded-full before:bg-info/70">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] text-muted-foreground font-medium">{isRTL ? 'المقاسات' : 'Measurements'}</p>
                <Ruler className="w-3.5 h-3.5 text-info/70" aria-hidden="true" />
              </div>
              <p className="text-base font-bold text-foreground tracking-tight tech-content leading-tight">{measurements.length}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 tech-content truncate">
                {measurementTotal.toLocaleString()} <span className="text-[10px]">{c.currency_code}</span>
              </p>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-primary/5 dark:bg-primary/10 p-3 border border-primary/20 ps-[14px] before:absolute before:start-0 before:inset-y-2 before:w-1 before:rounded-full before:bg-primary/70">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] text-muted-foreground font-medium">{isRTL ? 'التقدم' : 'Progress'}</p>
                <ListChecks className="w-3.5 h-3.5 text-primary/70" aria-hidden="true" />
              </div>
              <p className="text-base font-bold text-foreground tracking-tight tech-content leading-tight">{completedMs}/{totalMs}</p>
              {totalMs > 0 && (
                <div className="flex items-center gap-2 mt-1.5">
                  <Progress value={progress} className="h-1.5 flex-1 [&>div]:bg-primary" aria-label={isRTL ? `تقدم ${progress}٪` : `Progress ${progress}%`} />
                  <span className="text-[10px] font-semibold text-primary tech-content">{progress}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Parties & Meta */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              {[
                { label: isRTL ? 'العميل' : 'Client', p: clientP, isMe: user?.id === c.client_id, accepted: !!c.client_accepted_at },
                { label: isRTL ? 'المزود' : 'Provider', p: providerP, isMe: user?.id === c.provider_id, accepted: !!c.provider_accepted_at },
              ].map((party) => (
                <div key={party.label} className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar className="w-8 h-8 ring-1 ring-border">
                      <AvatarImage src={party.p?.avatar_url || undefined} />
                      <AvatarFallback className="text-[11px] bg-accent/10 text-accent font-bold">{(party.p?.full_name || '?').charAt(0)}</AvatarFallback>
                    </Avatar>
                    {party.accepted && (
                      <div
                        className="absolute -bottom-0.5 -end-0.5 w-4 h-4 rounded-full bg-success text-success-foreground flex items-center justify-center ring-2 ring-card"
                        title={isRTL ? 'تم القبول' : 'Accepted'}
                      >
                        <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none mb-0.5">{party.label}</p>
                    <p className="text-xs font-semibold leading-tight text-foreground">
                      {party.p?.full_name || '-'}
                      {party.isMe && <span className="text-accent ms-1 text-[10px]">({isRTL ? 'أنت' : 'You'})</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {notes.length > 0 && (
                <Badge variant="outline" className="text-[10px] gap-1 px-1.5 h-5 border-border/60" aria-label={isRTL ? `${notes.length} ملاحظات` : `${notes.length} notes`}>
                  <StickyNote className="w-3 h-3" aria-hidden="true" />{notes.length}
                </Badge>
              )}
              {attachments.length > 0 && (
                <Badge variant="outline" className="text-[10px] gap-1 px-1.5 h-5 border-border/60" aria-label={isRTL ? `${attachments.length} مرفقات` : `${attachments.length} attachments`}>
                  <Paperclip className="w-3 h-3" aria-hidden="true" />{attachments.length}
                </Badge>
              )}
            </div>
          </div>

          {/* Supervisor Row */}
          {(c.supervisor_name || c.supervisor_phone) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 pt-3 border-t border-border/50 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><User className="w-3 h-3" aria-hidden="true" />{c.supervisor_name || '-'}</span>
              {c.supervisor_phone && (
                <a href={`tel:${c.supervisor_phone}`} className="flex items-center gap-1 hover:text-accent transition-colors tech-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded">
                  <Phone className="w-3 h-3" aria-hidden="true" />{c.supervisor_phone}
                </a>
              )}
              {c.supervisor_email && (
                <a href={`mailto:${c.supervisor_email}`} className="flex items-center gap-1 hover:text-accent transition-colors tech-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded">
                  <Mail className="w-3 h-3" aria-hidden="true" />{c.supervisor_email}
                </a>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
ContractCard.displayName = 'ContractCard';