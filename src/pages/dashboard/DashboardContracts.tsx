import React, { useState, useMemo, useCallback, useTransition } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { mapContractLockError, mapContractCreateError } from '@/lib/contract-errors';
import { dispatchAmendmentEvent } from '@/lib/amendment-notify';
import {
  FileText, Eye, Plus, CheckCircle2, Clock, XCircle, AlertTriangle,
  Shield, DollarSign, Calendar, Users, ListChecks, StickyNote,
  Send, Phone, Mail, User, ChevronDown, ChevronUp, Activity,
  BookOpen, X, Layers, Hammer, Wrench, Home, Factory,
  Flame, TreePine, GlassWater, Grid3X3, PanelTop,
  Download, Search, Loader2, Copy, Sparkles, ArrowRight,
  Paperclip, TrendingUp, BarChart3, CreditCard, Receipt,
  CalendarDays, MapPin, Building2, Hash, Timer,
  CircleDot, Banknote, FileCheck, Share2,
  Ruler, ClipboardList, ShieldCheck, WrenchIcon, Upload,
  Zap, Target, PieChart, ArrowUpRight, ArrowDownRight,
  Briefcase, Star, Filter, LayoutGrid, List, MoreHorizontal,
  Percent, RefreshCw, Edit3, ExternalLink, CircleCheck,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { ContractExportData } from '@/lib/contract-pdf-export';
import type { Database } from '@/integrations/supabase/types';
import { getContractStatusMeta, isContractLockedByStatus } from '@/lib/contract-statuses';
import {
  calculateVatBreakdown, calculateLineItemsTotal, calculateMeasurementsTotal,
  calculateLineVatBreakdown, sumLineVatBreakdowns, formatVatHandlingLabel,
} from '@/lib/contract-financials';
import { calculateLineTotal, formatPricingMethodLabel, formatUnitOfMeasure, SUPPORTED_PRICING_METHODS, type PricingMethod } from '@/lib/contract-pricing';
import {
  BOQ_GROUPS,
  groupLineItemsByBoqGroup,
  hasMixedPricing,
  listPricingMethodsUsed,
  getSuggestedPricingMethod,
  getWorkTypeBoqPresets,
  dedupeStarterRows,
  type BoqGroupKey,
} from '@/lib/contract-boq';
import { ClientPicker, type SelectedClient } from '@/components/contracts/ClientPicker';
import { DimensionHelper } from '@/components/contracts/DimensionHelper';
import { WORK_TYPES, getWorkType, pickTemplateForWorkType, type WorkTypeKey } from '@/lib/contract-work-types';
import { getStatusGuidance } from '@/lib/contract-status-guidance';
import { serializeDraftPayload, maskEmail as maskInviteEmail, type PendingInvite } from '@/lib/contract-invitations';
import type { Json } from '@/integrations/supabase/types';

type ContractRow = Database['public']['Tables']['contracts']['Row'];
type MilestoneRow = Database['public']['Tables']['contract_milestones']['Row'];
type PaymentRow = Database['public']['Tables']['installment_payments']['Row'];
type TemplateRow = Database['public']['Tables']['contract_templates']['Row'];
type AmendmentRow = Database['public']['Tables']['contract_amendments']['Row'];
type ContractWithRole = ContractRow & { _role: string };

/* CT4 — published template version row used in the contract creation flow. */
interface PublishedTemplateOption {
  template_id: string;
  version_id: string;
  version_number: number;
  status: string;
  slug: string | null;
  category: string;
  name_ar: string;
  name_en: string | null;
  service_category_id: string | null;
  pricing_methods: string[];
  required_field_count: number;
}

import { FieldAiActions } from '@/components/blog/FieldAiActions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNoIndex } from "@/hooks/useNoIndex";

/* ── Template Category Config ── */
const templateCategoryConfig: Record<string, { ar: string; en: string; icon: React.ElementType; color: string }> = {
  aluminum_doors_windows: { ar: 'ألمنيوم أبواب وشبابيك', en: 'Aluminum Doors & Windows', icon: PanelTop, color: 'text-info bg-info/10' },
  iron_doors_windows: { ar: 'حديد أبواب وشبابيك', en: 'Iron Doors & Windows', icon: Hammer, color: 'text-slate-600 bg-slate-500/10' },
  fire_doors: { ar: 'أبواب مقاومة للحريق', en: 'Fire-Rated Doors', icon: Flame, color: 'text-destructive bg-destructive/10' },
  gates_structures: { ar: 'بوابات ومظلات وهناجر', en: 'Gates & Structures', icon: Factory, color: 'text-warning bg-warning/10' },
  wood_doors: { ar: 'أبواب خشبية', en: 'Wood Doors', icon: TreePine, color: 'text-success bg-success/10' },
  kitchens: { ar: 'مطابخ', en: 'Kitchens', icon: Grid3X3, color: 'text-secondary bg-secondary/10' },
  facades: { ar: 'واجهات', en: 'Facades', icon: Home, color: 'text-info bg-info/10' },
  wardrobes_closets: { ar: 'خزائن ودواليب', en: 'Wardrobes & Closets', icon: Layers, color: 'text-destructive bg-destructive/10' },
  upvc: { ar: 'UPVC أبواب وشبابيك', en: 'UPVC Doors & Windows', icon: Wrench, color: 'text-success bg-success/10' },
  glass_securit: { ar: 'زجاج وسيكوريت', en: 'Glass & Securit', icon: GlassWater, color: 'text-info bg-info/10' },
};

/* ── Status Config (centralized in @/lib/contract-statuses) ── */
// `color` is mapped from the central `badge` field for back-compat with this
// file's existing JSX; `ring`/`gradient` come straight from the central source.
const statusConfig = (Object.fromEntries(
  ['draft', 'pending_approval', 'active', 'completed', 'cancelled', 'disputed'].map((k) => {
    const m = getContractStatusMeta(k);
    return [k, { icon: m.icon, color: m.badge, label_ar: m.label_ar, label_en: m.label_en, ring: m.ring, gradient: m.gradient }];
  }),
) as Record<string, { icon: React.ElementType; color: string; label_ar: string; label_en: string; ring: string; gradient: string }>);

interface ContractForm {
  title_ar: string; title_en: string; description_ar: string; description_en: string;
  total_amount: string; currency_code: string; start_date: string; end_date: string;
  terms_ar: string; terms_en: string;
  supervisor_name: string; supervisor_phone: string; supervisor_email: string;
  client_email: string;
  vat_inclusive: boolean; vat_rate: string;
}

const emptyForm: ContractForm = {
  title_ar: '', title_en: '', description_ar: '', description_en: '',
  total_amount: '', currency_code: 'SAR', start_date: '', end_date: '',
  terms_ar: '', terms_en: '',
  supervisor_name: '', supervisor_phone: '', supervisor_email: '',
  client_email: '', vat_inclusive: false, vat_rate: '15',
};

type ViewSection = 'list' | 'create' | 'templates' | 'template-preview';

/* ── Contract Health Score ── */
const getContractHealth = (contract: ContractRow, milestones: MilestoneRow[], payments: PaymentRow[]) => {
  let score = 0, max = 0;
  max += 10; if (contract.start_date && contract.end_date) score += 10;
  max += 10; if (contract.terms_ar) score += 10;
  max += 10; if (contract.supervisor_name && contract.supervisor_phone) score += 10;
  max += 20; if (contract.client_accepted_at) score += 10; if (contract.provider_accepted_at) score += 10;
  max += 30; if (milestones.length > 0) { const completed = milestones.filter(m => m.status === 'completed').length; score += Math.round((completed / milestones.length) * 30); }
  max += 20; if (payments.length > 0) { const paid = payments.filter(p => p.status === 'paid').length; score += Math.round((paid / payments.length) * 20); }
  return Math.round((score / max) * 100);
};

const getDaysRemaining = (endDate: string | null) => {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

/* ── Mini Circular Progress ── */
const CircularProgress = ({ value, size = 36, stroke = 3, color = 'text-accent' }: { value: number; size?: number; stroke?: number; color?: string }) => {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-muted/40" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={`${color} stroke-current transition-all duration-700`} />
    </svg>
  );
};

interface ContractCardProps {
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
  onNavigate: (id: string) => void;
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

/* ── Enhanced Contract Card ── */
const ContractCard = React.memo(({
  c, isRTL, user, milestones, notes, attachments, payments, measurements, profiles,
  onExpand, isExpanded, onNavigate, onExportPDF, onApprove, onSendForApproval, onDuplicate, onShare, onEdit,
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
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
  const healthScore = getContractHealth(c, milestones, payments);
  const daysRemaining = getDaysRemaining(c.end_date);
  const paidPayments = payments.filter((p) => p.status === 'paid');
  const totalPaid = paidPayments.reduce((s: number, p) => s + Number(p.amount), 0);
  const paymentPercent = Number(c.total_amount) > 0 ? Math.round((totalPaid / Number(c.total_amount)) * 100) : 0;
  const locked = ['active', 'completed', 'cancelled'].includes(c.status);
  const measurementTotal = measurements.reduce((s: number, m) => s + Number(m.total_cost || 0), 0);

  return (
    <Card className={`overflow-hidden transition-all duration-300 hover:shadow-md group border-border/70 ${isExpanded ? 'ring-2 ring-accent/30 shadow-lg' : 'hover:border-accent/40'}`}>
      <CardContent className="p-0">
        {/* Status accent strip — calmer single-tone tint */}
        <div className={`h-1 w-full bg-gradient-to-r ${cfg.gradient} opacity-80`} aria-hidden="true" />

        <div className="p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4 flex-wrap sm:flex-nowrap">
            {/* Health Circle */}
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

          {/* Financial KPIs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {/* Contract Value — neutral surface, accent left bar */}
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
            {/* Collected — subtle success tint */}
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
            {/* Measurements — subtle info tint */}
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
            {/* Progress — subtle primary tint */}
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
              ].map(party => (
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

            {/* Quick Counters */}
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

/* ──────────── Main ──────────── */
const DashboardContracts = () => {
  useNoIndex();
  const { isRTL, language } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'provider' | 'client'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewSection, setViewSection] = useState<ViewSection>('list');
  const [form, setForm] = useState<ContractForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [templatePreview, setTemplatePreview] = useState<any | null>(null);
  /* CT4 — Selected published template version + pricing method for new contracts. */
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [selectedPricingMethod, setSelectedPricingMethod] = useState<string | null>(null);
  /* CT4B — Client picker + work type selection. */
  const [selectedClient, setSelectedClient] = useState<SelectedClient | null>(null);
  const [selectedWorkType, setSelectedWorkType] = useState<WorkTypeKey>('general');
  const [workTypeTouched, setWorkTypeTouched] = useState(false);
  /* CT4C.3 — Client invitation flow state. */
  const [inviteMode, setInviteMode] = useState<'idle' | 'composing' | 'awaiting'>('idle');
  const [inviteForm, setInviteForm] = useState<{ email: string; name: string; phone: string }>({ email: '', name: '', phone: '' });
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);
  const [approveConfirm, setApproveConfirm] = useState<any | null>(null);
  const [sendConfirm, setSendConfirm] = useState<any | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status' | 'health'>('date');
  const [showAddMeasurement, setShowAddMeasurement] = useState<string | null>(null);
  const [showAddMilestone, setShowAddMilestone] = useState<string | null>(null);
  const [showAddAmendment, setShowAddAmendment] = useState<string | null>(null);
  const [showAddMaintenance, setShowAddMaintenance] = useState<string | null>(null);
  const [showAddPayment, setShowAddPayment] = useState<string | null>(null);
  const [showAddLineItem, setShowAddLineItem] = useState<string | null>(null);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [measurementForm, setMeasurementForm] = useState({ name_ar: '', piece_number: '', floor_label: 'ground_floor', location_ar: '', length_mm: '', width_mm: '', quantity: '1', unit_price: '' });
  const [milestoneForm, setMilestoneForm] = useState({ title_ar: '', amount: '', due_date: '' });
  const [amendmentForm, setAmendmentForm] = useState({ title_ar: '', description_ar: '', amendment_type: 'scope_change', new_amount: '' });
  const [maintenanceForm, setMaintenanceForm] = useState({ title_ar: '', description_ar: '', priority: 'normal' as string, scheduled_date: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', due_date: '', notes: '' });
  const [lineItemForm, setLineItemForm] = useState({
    name_ar: '',
    description_ar: '',
    quantity: '1',
    unit_price: '',
    item_type: 'service',
    pricing_method: 'unit' as PricingMethod,
    length_mm: '',
    width_mm: '',
    height_mm: '',
    weight_kg: '',
    weight_ton: '',
    amount: '',
    boq_group_key: 'other' as BoqGroupKey,
  });
  const [maintenanceImages, setMaintenanceImages] = useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const maintenanceImageRef = React.useRef<HTMLInputElement>(null);

  /* Provider Contract UX 2 — Part A: navigable stepper section refs. */
  type StepKey = 'client' | 'work' | 'template' | 'details' | 'pricing' | 'review';
  const stepRefs = {
    client: React.useRef<HTMLDivElement>(null),
    work: React.useRef<HTMLDivElement>(null),
    template: React.useRef<HTMLDivElement>(null),
    details: React.useRef<HTMLDivElement>(null),
    pricing: React.useRef<HTMLDivElement>(null),
    review: React.useRef<HTMLDivElement>(null),
  } as const;
  const stepOrder: StepKey[] = ['client', 'work', 'template', 'details', 'pricing', 'review'];
  const [activeStep, setActiveStep] = useState<StepKey>('client');
  const goToStep = useCallback((key: StepKey) => {
    setActiveStep(key);
    const el = stepRefs[key]?.current;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const [uploadingContractId, setUploadingContractId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');

  /* ── Data Queries ── */
  const { data: providerContracts = [], isLoading: loadingProvider } = useQuery({
    queryKey: ['dashboard-contracts', 'provider', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('contracts').select('*').eq('provider_id', user!.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: clientContracts = [], isLoading: loadingClient } = useQuery({
    queryKey: ['dashboard-contracts', 'client', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('contracts').select('*').eq('client_id', user!.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const isLoading = loadingProvider || loadingClient;

  const contracts = useMemo(() => {
    const seen = new Set<string>();
    const result: ContractWithRole[] = [];
    providerContracts.forEach((c) => { if (!seen.has(c.id)) { seen.add(c.id); result.push({ ...c, _role: 'provider' }); } });
    clientContracts.forEach((c) => { if (!seen.has(c.id)) { seen.add(c.id); result.push({ ...c, _role: 'client' }); } });
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [providerContracts, clientContracts]);

  const contractIds = useMemo(() => contracts.map((c) => c.id), [contracts]);

  const { data: allMilestones = [] } = useQuery({
    queryKey: ['dashboard-milestones', contractIds],
    queryFn: async () => {
      if (contractIds.length === 0) return [];
      const { data } = await supabase.from('contract_milestones').select('*').in('contract_id', contractIds).order('sort_order');
      return data ?? [];
    },
    enabled: contractIds.length > 0,
  });

  const { data: allNotes = [] } = useQuery({
    queryKey: ['dashboard-contract-notes', contractIds],
    queryFn: async () => {
      if (contractIds.length === 0) return [];
      const { data } = await supabase.from('contract_notes').select('*').in('contract_id', contractIds).order('created_at', { ascending: false }).limit(200);
      return data ?? [];
    },
    enabled: contractIds.length > 0,
  });

  const { data: allAttachments = [] } = useQuery({
    queryKey: ['dashboard-contract-attachments', contractIds],
    queryFn: async () => {
      if (contractIds.length === 0) return [];
      const { data } = await supabase.from('contract_attachments').select('*').in('contract_id', contractIds).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: contractIds.length > 0,
  });

  const { data: allPayments = [] } = useQuery({
    queryKey: ['dashboard-contract-payments', contractIds],
    queryFn: async () => {
      if (contractIds.length === 0) return [];
      const { data: plans } = await supabase.from('installment_plans').select('id, contract_id').in('contract_id', contractIds);
      if (!plans || plans.length === 0) return [];
      const planIds = plans.map(p => p.id);
      const { data: payments } = await supabase.from('installment_payments').select('*').in('plan_id', planIds);
      return (payments ?? []).map(p => ({ ...p, contract_id: plans.find(pl => pl.id === p.plan_id)?.contract_id }));
    },
    enabled: contractIds.length > 0,
  });

  const { data: allMeasurements = [] } = useQuery({
    queryKey: ['dashboard-contract-measurements', contractIds],
    queryFn: async () => {
      if (contractIds.length === 0) return [];
      const { data } = await supabase.from('contract_measurements').select('*').in('contract_id', contractIds);
      return data ?? [];
    },
    enabled: contractIds.length > 0,
  });

  const { data: allWarranties = [] } = useQuery({
    queryKey: ['dashboard-contract-warranties', contractIds],
    queryFn: async () => {
      if (contractIds.length === 0) return [];
      const { data } = await supabase.from('warranties').select('*').in('contract_id', contractIds);
      return data ?? [];
    },
    enabled: contractIds.length > 0,
  });

  const { data: allMaintenanceRequests = [] } = useQuery({
    queryKey: ['dashboard-contract-maintenance', contractIds],
    queryFn: async () => {
      if (contractIds.length === 0) return [];
      const { data } = await supabase.from('maintenance_requests').select('*').in('contract_id', contractIds).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: contractIds.length > 0,
  });

  const { data: allAmendments = [] } = useQuery({
    queryKey: ['dashboard-contract-amendments', contractIds],
    queryFn: async () => {
      if (contractIds.length === 0) return [];
      const { data } = await supabase.from('contract_amendments').select('*').in('contract_id', contractIds).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: contractIds.length > 0,
  });

  const { data: allLineItems = [] } = useQuery({
    queryKey: ['dashboard-contract-line-items', contractIds],
    queryFn: async () => {
      if (contractIds.length === 0) return [];
      const { data } = await supabase.from('contract_line_items').select('*').in('contract_id', contractIds).order('sort_order');
      return data ?? [];
    },
    enabled: contractIds.length > 0,
  });

  // CT5D — allowed pricing methods per active contract template version.
  const contractTemplateVersionIds = useMemo(() => {
    const set = new Set<string>();
    for (const c of contracts) {
      const v = (c as { template_version_id?: string | null }).template_version_id;
      if (v) set.add(v);
    }
    return Array.from(set);
  }, [contracts]);

  const { data: contractPricingRules = [] } = useQuery({
    queryKey: ['dashboard-contract-pricing-rules', contractTemplateVersionIds],
    queryFn: async () => {
      if (contractTemplateVersionIds.length === 0) return [];
      const { data } = await supabase
        .from('contract_template_pricing_rules')
        .select('version_id, method, vat_handling')
        .in('version_id', contractTemplateVersionIds);
      return data ?? [];
    },
    enabled: contractTemplateVersionIds.length > 0,
  });

  /** Map of template_version_id → allowed pricing methods (empty array if no rules configured). */
  const allowedMethodsByVersion = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const r of contractPricingRules) {
      const list = map.get(r.version_id) ?? [];
      list.push(r.method);
      map.set(r.version_id, list);
    }
    return map;
  }, [contractPricingRules]);

  /**
   * CT5G.2 — Map of template_version_id → (pricing_method → vat_handling).
   * Used to derive per-line VAT breakdown for display only. Defaults to
   * 'inherit' when no rule is configured for a given (version, method).
   */
  const vatHandlingByVersionMethod = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    for (const r of contractPricingRules as Array<{ version_id: string; method: string; vat_handling?: string | null }>) {
      const inner = map.get(r.version_id) ?? new Map<string, string>();
      inner.set(r.method, (r.vat_handling || 'inherit'));
      map.set(r.version_id, inner);
    }
    return map;
  }, [contractPricingRules]);

  const { data: profiles = [] } = useQuery({
    queryKey: ['contract-profiles', contractIds],
    queryFn: async () => {
      const userIds = new Set<string>();
      contracts.forEach((c) => { userIds.add(c.client_id); userIds.add(c.provider_id); });
      if (userIds.size === 0) return [];
      const { data } = await supabase.from('profiles').select('user_id, full_name, avatar_url, phone, email').in('user_id', Array.from(userIds));
      return data ?? [];
    },
    enabled: contracts.length > 0,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['contract-templates'],
    queryFn: async () => {
      const { data } = await supabase.from('contract_templates').select('*').eq('is_active', true).order('sort_order');
      return data ?? [];
    },
    enabled: !!user,
  });

  /* CT4 — Published template versions only (for contract creation selector). */
  const { data: publishedVersions = [] } = useQuery<PublishedTemplateOption[]>({
    queryKey: ['contract-template-versions', 'published'],
    queryFn: async () => {
      const { data: versions, error } = await supabase
        // CT7B: provider-facing read — must use safe public view, not the
        // base table (which is now admin-only at the RLS layer).
        .from('contract_template_versions_public')
        .select('id, version_number, status, template_id, contract_templates!inner(id, slug, category, name_ar, name_en, service_category_id, is_active)')
        .eq('status', 'published')
        .order('version_number', { ascending: false });
      if (error) throw error;
      const versionIds = (versions ?? []).map((v: any) => v.id);
      const { data: rules } = versionIds.length
        ? await supabase.from('contract_template_pricing_rules').select('version_id, method').in('version_id', versionIds)
        : { data: [] as { version_id: string; method: string }[] };
      const { data: fields } = versionIds.length
        ? await supabase.from('contract_template_required_fields').select('version_id').in('version_id', versionIds)
        : { data: [] as { version_id: string }[] };
      const rulesByVer = new Map<string, string[]>();
      (rules ?? []).forEach((r: any) => {
        const arr = rulesByVer.get(r.version_id) ?? [];
        arr.push(r.method);
        rulesByVer.set(r.version_id, arr);
      });
      const fieldsByVer = new Map<string, number>();
      (fields ?? []).forEach((f: any) => fieldsByVer.set(f.version_id, (fieldsByVer.get(f.version_id) ?? 0) + 1));
      return (versions ?? [])
        .filter((v: any) => v.contract_templates?.is_active !== false)
        .map((v: any): PublishedTemplateOption => ({
          template_id: v.template_id,
          version_id: v.id,
          version_number: v.version_number,
          status: v.status,
          slug: v.contract_templates?.slug ?? null,
          category: v.contract_templates?.category ?? 'general',
          name_ar: v.contract_templates?.name_ar ?? '',
          name_en: v.contract_templates?.name_en ?? null,
          service_category_id: v.contract_templates?.service_category_id ?? null,
          pricing_methods: rulesByVer.get(v.id) ?? [],
          required_field_count: fieldsByVer.get(v.id) ?? 0,
        }));
    },
    enabled: !!user,
  });

  /* CT4 — Default to General template when none selected. */
  const generalVersion = useMemo(
    () => publishedVersions.find(v => v.slug === 'general' || v.category === 'general') ?? publishedVersions[0] ?? null,
    [publishedVersions],
  );
  const effectiveVersion = useMemo(
    () => publishedVersions.find(v => v.version_id === selectedVersionId) ?? generalVersion,
    [publishedVersions, selectedVersionId, generalVersion],
  );

  /* CT4B — Auto-suggest published template version from selected work type
   * unless the user manually picked a different template. */
  React.useEffect(() => {
    if (publishedVersions.length === 0) return;
    if (selectedVersionId) return;
    const suggested = pickTemplateForWorkType(selectedWorkType, publishedVersions);
    if (suggested) {
      setSelectedVersionId(suggested.version_id);
      setSelectedPricingMethod(null);
    }
    // We deliberately depend only on workType + the published list. If the user
    // overrides the dropdown, `selectedVersionId` becomes truthy and we stop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkType, publishedVersions]);

  const { data: businessId } = useQuery({
    queryKey: ['my-business-id-contracts', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('businesses').select('id').eq('user_id', user!.id).order('created_at', { ascending: true }).limit(1).maybeSingle();
      return data?.id ?? null;
    },
    enabled: !!user,
  });

  /* ── Helper: isLocked ── */
  const isContractLocked = (c: ContractRow) => isContractLockedByStatus(c.status);

  /* ── Mutations ── */
  const addNoteMutation = useMutation({
    mutationFn: async ({ contractId, content, noteType }: { contractId: string; content: string; noteType?: string }) => {
      const { error } = await supabase.from('contract_notes').insert({ contract_id: contractId, user_id: user!.id, content, note_type: noteType || 'note' });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dashboard-contract-notes'] }); setNoteText(''); toast.success(isRTL ? 'تمت إضافة الملاحظة' : 'Note added'); },
  });

  const addMeasurementMutation = useMutation({
    mutationFn: async ({ contractId }: { contractId: string }) => {
      const area = (Number(measurementForm.length_mm) * Number(measurementForm.width_mm)) / 1000000;
      const totalCost = Number(measurementForm.unit_price) * Number(measurementForm.quantity);
      const { error } = await supabase.from('contract_measurements').insert({
        contract_id: contractId, name_ar: measurementForm.name_ar, piece_number: measurementForm.piece_number,
        floor_label: measurementForm.floor_label, location_ar: measurementForm.location_ar,
        length_mm: Number(measurementForm.length_mm), width_mm: Number(measurementForm.width_mm),
        quantity: Number(measurementForm.quantity), unit_price: Number(measurementForm.unit_price),
        area_sqm: area, total_cost: totalCost,
      });
      if (error) throw error;
      // Update contract total from measurements + line items
      // C6.4a — recompute via RPC.
      await supabase.rpc('recalc_contract_total', { _contract_id: contractId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-measurements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
      setShowAddMeasurement(null);
      setMeasurementForm({ name_ar: '', piece_number: '', floor_label: 'ground_floor', location_ar: '', length_mm: '', width_mm: '', quantity: '1', unit_price: '' });
      toast.success(isRTL ? 'تمت إضافة المقاس وتحديث قيمة العقد' : 'Measurement added & contract updated');
    },
    onError: (err: unknown) => toast.error(mapContractLockError(err, isRTL).message),
  });

  const addMilestoneMutation = useMutation({
    mutationFn: async ({ contractId }: { contractId: string }) => {
      const existing = allMilestones.filter(m => m.contract_id === contractId);
      const { error } = await supabase.from('contract_milestones').insert({
        contract_id: contractId, title_ar: milestoneForm.title_ar,
        amount: Number(milestoneForm.amount), due_date: milestoneForm.due_date || null,
        sort_order: existing.length + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-milestones'] });
      setShowAddMilestone(null);
      setMilestoneForm({ title_ar: '', amount: '', due_date: '' });
      toast.success(isRTL ? 'تمت إضافة المرحلة' : 'Milestone added');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addAmendmentMutation = useMutation({
    mutationFn: async ({ contractId }: { contractId: string }) => {
      const { data: inserted, error } = await supabase.from('contract_amendments').insert({
        contract_id: contractId, requested_by: user!.id,
        title_ar: amendmentForm.title_ar, description_ar: amendmentForm.description_ar || null,
        amendment_type: amendmentForm.amendment_type,
        new_amount: amendmentForm.new_amount ? Number(amendmentForm.new_amount) : null,
      }).select('id').single();
      if (error) throw error;
      return inserted?.id as string | undefined;
    },
    onSuccess: (newAmendmentId) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-amendments'] });
      setShowAddAmendment(null);
      setAmendmentForm({ title_ar: '', description_ar: '', amendment_type: 'scope_change', new_amount: '' });
      toast.success(isRTL ? 'تم إرسال طلب التعديل' : 'Amendment request sent');
      if (newAmendmentId) dispatchAmendmentEvent(newAmendmentId, 'created');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const approveAmendmentMutation = useMutation({
    mutationFn: async ({ amendmentId }: { amendmentId: string; contract: ContractWithRole }) => {
      const { error } = await supabase.rpc('approve_contract_amendment', { _amendment_id: amendmentId });
      if (error) throw error;
      return amendmentId;
    },
    onSuccess: (amId) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-amendments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
      toast.success(isRTL ? 'تمت الموافقة على التعديل' : 'Amendment approved');
      if (amId) dispatchAmendmentEvent(amId, 'approved');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Error'),
  });

  /* ── Maintenance Request Mutation ── */
  const addMaintenanceMutation = useMutation({
    mutationFn: async ({ contractId }: { contractId: string }) => {
      const contract = contracts.find((c) => c.id === contractId);
      if (!contract) throw new Error('Contract not found');
      const { data: mainReq, error } = await supabase.from('maintenance_requests').insert({
        contract_id: contractId, client_id: contract.client_id, provider_id: contract.provider_id,
        title_ar: maintenanceForm.title_ar, description_ar: maintenanceForm.description_ar || null,
        priority: maintenanceForm.priority as Database['public']['Enums']['maintenance_priority'],
        scheduled_date: maintenanceForm.scheduled_date || null,
      }).select('id').single();
      if (error) throw error;
      // Upload maintenance images as attachments
      for (const file of maintenanceImages) {
        const ext = file.name.split('.').pop();
        const path = `maintenance/${mainReq.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('contract-attachments').upload(path, file);
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('contract-attachments').getPublicUrl(path);
          await supabase.from('contract_attachments').insert({
            contract_id: contractId, user_id: user!.id, file_name: file.name,
            file_url: urlData.publicUrl, file_type: 'image',
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-attachments'] });
      setShowAddMaintenance(null);
      setMaintenanceForm({ title_ar: '', description_ar: '', priority: 'normal', scheduled_date: '' });
      setMaintenanceImages([]);
      toast.success(isRTL ? 'تم إرسال طلب الصيانة' : 'Maintenance request submitted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* ── Add Payment Mutation ── */
  const addPaymentMutation = useMutation({
    mutationFn: async ({ contractId }: { contractId: string }) => {
      // Find or create installment plan
      let { data: plan } = await supabase.from('installment_plans').select('id').eq('contract_id', contractId).maybeSingle();
      if (!plan) {
        const contract = contracts.find((c) => c.id === contractId);
        const { data: newPlan, error: planErr } = await supabase.from('installment_plans').insert({
          contract_id: contractId, total_amount: Number(contract?.total_amount || 0),
          installment_amount: Number(paymentForm.amount), number_of_installments: 1,
          start_date: paymentForm.due_date || new Date().toISOString().split('T')[0],
        }).select('id').single();
        if (planErr) throw planErr;
        plan = newPlan;
      }
      const existing = allPayments.filter((p) => p.contract_id === contractId);
      const { error } = await supabase.from('installment_payments').insert({
        plan_id: plan!.id, installment_number: existing.length + 1,
        amount: Number(paymentForm.amount), due_date: paymentForm.due_date,
        notes: paymentForm.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-payments'] });
      setShowAddPayment(null);
      setPaymentForm({ amount: '', due_date: '', notes: '' });
      toast.success(isRTL ? 'تمت إضافة الدفعة' : 'Payment added');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* ── Mark Payment as Paid ── */
  const markPaidMutation = useMutation({
    mutationFn: async ({ paymentId }: { paymentId: string }) => {
      const { error } = await supabase.from('installment_payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', paymentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-payments'] });
      toast.success(isRTL ? 'تم تسجيل الدفع' : 'Payment recorded');
    },
  });

  /* ── Add Line Item Mutation ── */
  const addLineItemMutation = useMutation({
    mutationFn: async ({ contractId }: { contractId: string }) => {
      const existing = allLineItems.filter((li) => li.contract_id === contractId);
      const fi: Record<string, number> = {};
      const setIf = (k: string, v: string) => { if (v !== '' && Number.isFinite(Number(v))) fi[k] = Number(v); };
      setIf('length_mm', lineItemForm.length_mm);
      setIf('width_mm', lineItemForm.width_mm);
      setIf('height_mm', lineItemForm.height_mm);
      setIf('weight_kg', lineItemForm.weight_kg);
      setIf('weight_ton', lineItemForm.weight_ton);
      setIf('amount', lineItemForm.amount);
      const calc = calculateLineTotal({
        pricing_method: lineItemForm.pricing_method,
        quantity: lineItemForm.quantity,
        unit_price: lineItemForm.unit_price,
        formula_inputs: fi,
      });
      if (!calc.ok) {
        throw new Error(isRTL ? 'قيم البند غير صالحة' : 'Invalid line item values');
      }
      const { error } = await supabase.from('contract_line_items').insert({
        contract_id: contractId, name_ar: lineItemForm.name_ar,
        description_ar: lineItemForm.description_ar || null,
        quantity: Number(lineItemForm.quantity || 1),
        unit_price: Number(lineItemForm.unit_price || 0),
        item_type: lineItemForm.item_type, sort_order: existing.length + 1,
        pricing_method: lineItemForm.pricing_method,
        unit_of_measure: formatUnitOfMeasure(lineItemForm.pricing_method),
        formula_inputs: fi,
        boq_group_key: lineItemForm.boq_group_key || 'other',
      });
      if (error) throw error;
      // C6.4a — recompute via RPC.
      await supabase.rpc('recalc_contract_total', { _contract_id: contractId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-line-items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
      setShowAddLineItem(null);
      setLineItemForm({
        name_ar: '', description_ar: '', quantity: '1', unit_price: '', item_type: 'service',
        pricing_method: 'unit', length_mm: '', width_mm: '', height_mm: '', weight_kg: '', weight_ton: '', amount: '',
        boq_group_key: 'other',
      });
      toast.success(isRTL ? 'تمت إضافة البند وتحديث قيمة العقد' : 'Item added & total updated');
    },
    onError: (err: unknown) => toast.error(mapContractLockError(err, isRTL).message),
  });

  /* ── Delete Line Item ── */
  const deleteLineItemMutation = useMutation({
    mutationFn: async ({ id, contractId }: { id: string; contractId: string }) => {
      const { error } = await supabase.from('contract_line_items').delete().eq('id', id);
      if (error) throw error;
      // C6.4a — recompute via RPC.
      await supabase.rpc('recalc_contract_total', { _contract_id: contractId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-line-items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
      toast.success(isRTL ? 'تم حذف البند' : 'Item deleted');
    },
    onError: (err: unknown) => toast.error(mapContractLockError(err, isRTL).message),
  });

  /* ── CT5G — Bulk-insert starter BOQ rows for a work type. Idempotent. ── */
  const addStarterBoqMutation = useMutation({
    mutationFn: async ({ contractId, category }: { contractId: string; category: string | null | undefined }) => {
      const existing = allLineItems.filter((li) => li.contract_id === contractId);
      const presets = getWorkTypeBoqPresets(category);
      const allowedKey = (contracts.find(c => c.id === contractId) as { template_version_id?: string | null } | undefined)?.template_version_id;
      const allowed = allowedKey ? allowedMethodsByVersion.get(allowedKey) : undefined;
      const filtered = (allowed && allowed.length > 0)
        ? presets.filter(p => allowed.includes(p.pricing_method))
        : presets;
      const toInsert = dedupeStarterRows(filtered, existing);
      if (toInsert.length === 0) return { inserted: 0 };
      const baseSort = existing.length;
      const rows = toInsert.map((p, idx) => ({
        contract_id: contractId,
        name_ar: p.name_ar,
        name_en: p.name_en,
        description_ar: null,
        quantity: 1,
        unit_price: 0,
        total_cost: 0,
        item_type: 'material' as const,
        sort_order: baseSort + idx + 1,
        pricing_method: p.pricing_method,
        unit_of_measure: formatUnitOfMeasure(p.pricing_method),
        formula_inputs: {},
        boq_group_key: p.boq_group_key,
      }));
      const { error } = await supabase.from('contract_line_items').insert(rows);
      if (error) throw error;
      await supabase.rpc('recalc_contract_total', { _contract_id: contractId });
      return { inserted: toInsert.length };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-line-items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
      const n = res?.inserted ?? 0;
      if (n === 0) {
        toast.info(isRTL ? 'تمت إضافة البنود المقترحة' : 'Suggested BOQ items already added');
      } else {
        toast.success(isRTL ? `أُضيفت ${n} بنود مقترحة` : `Added ${n} suggested items`);
      }
    },
    onError: (err: unknown) => toast.error(mapContractLockError(err, isRTL).message),
  });

  /* ── Update Milestone Status ── */
  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: any = { status };
      if (status === 'completed') update.completed_at = new Date().toISOString();
      const { error } = await supabase.from('contract_milestones').update(update).eq('id', id);
      if (error) throw error;
      // Best-effort: notify client + email when a milestone is updated by provider.
      if (status === 'completed') {
        try {
          const ms = allMilestones.find((m) => m.id === id);
          if (ms) {
            const contract = contracts.find((c) => c.id === ms.contract_id);
            if (contract && contract.client_id && contract.client_id !== user?.id) {
              const refId = (contract as any).ref_id || contract.id;
              const titleAr = (contract as any).title_ar || '';
              const titleEn = (contract as any).title_en || titleAr;
              const msTitle = isRTL ? ((ms as any).title_ar || (ms as any).title_en || '') : ((ms as any).title_en || (ms as any).title_ar || '');
              void supabase.from('notifications').insert({
                user_id: contract.client_id,
                title_ar: 'تم تحديث مرحلة في عقدك',
                title_en: 'A milestone in your contract was updated',
                body_ar: msTitle ? `المرحلة: ${msTitle}` : `العقد ${refId}`,
                body_en: msTitle ? `Milestone: ${msTitle}` : `Contract ${refId}`,
                notification_type: 'contract_milestone_completed',
                reference_id: contract.id,
                reference_type: 'contract',
                action_url: `/contracts/${contract.id}`,
              });
              const clientProfile = profiles.find((p: any) => p.user_id === contract.client_id) as any;
              const clientEmail = clientProfile?.email;
              const clientName = clientProfile?.full_name;
              if (clientEmail) {
                void supabase.functions.invoke('send-transactional-email', {
                  body: {
                    templateName: 'contract-milestone-completed',
                    recipientEmail: clientEmail,
                    idempotencyKey: `contract-milestone-completed-${id}`,
                    templateData: {
                      recipientName: clientName,
                      contractRefId: refId,
                      contractTitle: isRTL ? titleAr : titleEn,
                      milestoneTitle: msTitle || undefined,
                      contractId: contract.id,
                      contractUrl: `${window.location.origin}/contracts/${contract.id}`,
                    },
                  },
                }).catch(() => { /* queue retries */ });
              }
            }
          }
        } catch { /* notify is best-effort */ }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-milestones'] });
      toast.success(isRTL ? 'تم تحديث المرحلة' : 'Milestone updated');
    },
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async ({ contractId, file }: { contractId: string; file: File }) => {
      const ext = file.name.split('.').pop();
      const path = `${contractId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('contract-attachments').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('contract-attachments').getPublicUrl(path);
      const fileType = file.type.startsWith('image/') ? 'image' : 'document';
      const { error } = await supabase.from('contract_attachments').insert({
        contract_id: contractId, user_id: user!.id, file_name: file.name,
        file_url: urlData.publicUrl, file_type: fileType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-attachments'] });
      setUploadingContractId(null);
      toast.success(isRTL ? 'تم رفع المرفق' : 'Attachment uploaded');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createContractMutation = useMutation({
    mutationFn: async () => {
      // CT4B — Prefer the picker-selected client; fall back to manual email lookup.
      let clientUserId: string | null = selectedClient?.user_id ?? null;
      if (!clientUserId && !editingId) {
        const email = form.client_email.trim();
        if (!email) throw new Error(isRTL ? 'يرجى اختيار العميل أولاً' : 'Please select a client first');
        const { data: cp, error: cpe } = await supabase.from('profiles').select('user_id').eq('email', email).maybeSingle();
        if (cpe) throw cpe;
        if (!cp) throw new Error(isRTL ? 'لم يتم العثور على العميل بهذا البريد الإلكتروني' : 'Client not found with this email');
        clientUserId = cp.user_id;
      }

      const payload: any = {
        provider_id: user!.id, client_id: clientUserId!, business_id: businessId || null,
        title_ar: form.title_ar, title_en: form.title_en || null,
        description_ar: form.description_ar || null, description_en: form.description_en || null,
        total_amount: Number(form.total_amount), currency_code: form.currency_code,
        start_date: form.start_date || null, end_date: form.end_date || null,
        terms_ar: form.terms_ar || null, terms_en: form.terms_en || null,
        supervisor_name: form.supervisor_name || null, supervisor_phone: form.supervisor_phone || null,
        supervisor_email: form.supervisor_email || null, status: 'draft',
        vat_inclusive: form.vat_inclusive, vat_rate: Number(form.vat_rate),
      };

      if (editingId) {
        const { error } = await supabase.from('contracts').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        // CT4 — Always create new contracts via the SECURITY DEFINER RPC so the
        // template snapshot is frozen atomically. Falls back to General v1.
        const versionId = effectiveVersion?.version_id ?? null;
        if (!versionId) {
          throw new Error(isRTL ? 'لا يوجد قالب عقد منشور' : 'No published contract template available');
        }
        const { error } = await supabase.rpc('create_contract_from_template', {
          _payload: payload,
          _template_version_id: versionId,
          _pricing_method: selectedPricingMethod,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
      setViewSection('list'); setForm(emptyForm); setEditingId(null);
      setSelectedVersionId(null); setSelectedPricingMethod(null); setSelectedTemplate(null);
      setSelectedClient(null); setSelectedWorkType('general'); setWorkTypeTouched(false);
      toast.success(editingId ? (isRTL ? 'تم تحديث العقد' : 'Contract updated') : (isRTL ? 'تم إنشاء العقد' : 'Contract created'));
    },
    onError: (err: Error) => {
      const mapped = mapContractCreateError(err, isRTL);
      toast.error(mapped.message);
    },
  });

  /* CT4C.3 — Client invitation mutations. */
  const sendInviteMutation = useMutation({
    mutationFn: async () => {
      const email = inviteForm.email.trim().toLowerCase();
      if (!email) throw new Error(isRTL ? 'البريد الإلكتروني مطلوب' : 'Email is required');
      const draft = serializeDraftPayload({
        form,
        templateVersionId: effectiveVersion?.version_id ?? null,
        workType: selectedWorkType || null,
        pricingMethod: selectedPricingMethod,
      });
      const { data, error } = await supabase.rpc('create_client_invitation', {
        _email: email,
        _name: inviteForm.name.trim() || null,
        _phone: inviteForm.phone.trim() || null,
        _business_id: businessId || null,
        _draft_payload: Object.keys(draft).length > 0 ? (JSON.parse(JSON.stringify(draft)) as Json) : null,
        _template_version_id: effectiveVersion?.version_id ?? null,
        _work_type: selectedWorkType || null,
      });
      if (error) throw error;
      const result = data as {
        already_registered: boolean;
        user_id?: string | null;
        invite_id?: string | null;
        ref_id?: string | null;
        token?: string | null;
        expires_at?: string | null;
      };
      if (result.already_registered) {
        return { alreadyRegistered: true as const };
      }
      // Dispatch invite email via dedicated edge function. Token is sent
      // server-side once — never persisted in client state.
      const { error: notifyErr } = await supabase.functions.invoke('notify-client-invitation', {
        body: { invite_id: result.invite_id, token: result.token, kind: 'created' },
      });
      if (notifyErr) throw notifyErr;
      return {
        alreadyRegistered: false as const,
        invite: {
          id: result.invite_id!,
          ref_id: result.ref_id!,
          email_lower: email,
          expires_at: result.expires_at!,
          reminder_count: 0,
        } as PendingInvite,
      };
    },
    onSuccess: (res) => {
      if (res.alreadyRegistered) {
        toast.info(isRTL ? 'هذا البريد مسجل بالفعل. يرجى البحث عنه واختياره.' : 'This email is already registered. Please search for the client and select them.');
        setInviteMode('idle');
        return;
      }
      setPendingInvite(res.invite);
      setInviteMode('awaiting');
      toast.success(isRTL ? 'تم إرسال الدعوة بنجاح' : 'Invitation sent successfully');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resendInviteMutation = useMutation({
    mutationFn: async () => {
      if (!pendingInvite) throw new Error('No pending invite');
      const { data, error } = await supabase.rpc('resend_client_invitation', { _id: pendingInvite.id });
      if (error) throw error;
      const result = data as { invite_id: string; ref_id: string; token: string; reminder_count: number; expires_at: string };
      const { error: notifyErr } = await supabase.functions.invoke('notify-client-invitation', {
        body: { invite_id: result.invite_id, token: result.token, kind: 'reminder' },
      });
      if (notifyErr) throw notifyErr;
      return result;
    },
    onSuccess: (res) => {
      setPendingInvite(p => p ? { ...p, reminder_count: res.reminder_count, expires_at: res.expires_at } : p);
      toast.success(isRTL ? 'تم إرسال التذكير' : 'Reminder sent');
    },
    onError: (err: Error) => {
      const msg = String(err.message || '');
      if (msg.includes('cooldown')) toast.error(isRTL ? 'يرجى الانتظار قبل إعادة الإرسال (60 ثانية)' : 'Please wait before resending (60s cooldown)');
      else if (msg.includes('reminder_limit')) toast.error(isRTL ? 'تم الوصول للحد الأقصى من التذكيرات' : 'Reminder limit reached');
      else toast.error(msg);
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async () => {
      if (!pendingInvite) throw new Error('No pending invite');
      const { error } = await supabase.rpc('cancel_client_invitation', { _id: pendingInvite.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم إلغاء الدعوة' : 'Invitation cancelled');
      setPendingInvite(null);
      setInviteMode('idle');
      setInviteForm({ email: '', name: '', phone: '' });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* CT4C.5 — Accepted invitations awaiting contract completion. */
  type AcceptedInvitationRow = {
    id: string;
    ref_id: string;
    email_lower: string;
    recipient_name: string | null;
    work_type: string | null;
    template_version_id: string | null;
    accepted_at: string | null;
    status: string;
    bound_contract_id: string | null;
  };
  const { data: acceptedInvitations = [], refetch: refetchAcceptedInvites } = useQuery({
    queryKey: ['accepted-invitations', user?.id],
    enabled: !!user?.id,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_invitations')
        .select('id,ref_id,email_lower,recipient_name,work_type,template_version_id,accepted_at,status,bound_contract_id')
        .eq('status', 'accepted')
        .is('bound_contract_id', null)
        .order('accepted_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as AcceptedInvitationRow[];
    },
  });

  /* Poll the awaiting pendingInvite so the provider sees acceptance live. */
  const { data: pendingInviteStatus } = useQuery({
    queryKey: ['pending-invite-status', pendingInvite?.id],
    enabled: !!pendingInvite?.id,
    refetchInterval: 15000,
    queryFn: async () => {
      if (!pendingInvite?.id) return null;
      const { data, error } = await supabase
        .from('client_invitations')
        .select('id,status,accepted_at,bound_contract_id')
        .eq('id', pendingInvite.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const pendingInviteAccepted = pendingInviteStatus?.status === 'accepted' && !pendingInviteStatus?.bound_contract_id;

  const completeFromInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { data, error } = await supabase.rpc('complete_contract_from_invitation', { _invite_id: inviteId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (contractId) => {
      toast.success(isRTL ? 'تم إنشاء العقد من الدعوة' : 'Contract created from invitation');
      queryClient.invalidateQueries({ queryKey: ['accepted-invitations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['provider-contracts'] });
      // Reset invite state if this was the active awaiting invite
      setPendingInvite(null);
      setInviteMode('idle');
      setInviteForm({ email: '', name: '', phone: '' });
      navigate(`/contracts/${contractId}`);
    },
    onError: (err: Error) => {
      const msg = String(err.message || '');
      if (msg.includes('forbidden')) toast.error(isRTL ? 'غير مصرح' : 'Not authorized');
      else if (msg.includes('invitation_not_accepted')) toast.error(isRTL ? 'الدعوة غير مقبولة بعد' : 'Invitation not yet accepted');
      else if (msg.includes('draft_payload_missing')) toast.error(isRTL ? 'لا توجد مسودة محفوظة لهذه الدعوة' : 'No saved draft for this invitation');
      else if (msg.includes('business_ownership_invalid')) toast.error(isRTL ? 'الصلاحية على المنشأة غير صالحة' : 'Business ownership invalid');
      else toast.error(msg);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (contract: ContractWithRole) => {
      // C6.4a — go through SECURITY DEFINER RPC.
      const { error } = await supabase.rpc('accept_contract', { _contract_id: contract.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
      setApproveConfirm(null);
      toast.success(isRTL ? 'تمت الموافقة على العقد' : 'Contract approved');
    },
  });

  const sendForApprovalMutation = useMutation({
    mutationFn: async (contract: ContractWithRole) => {
      // C6.4a — go through SECURITY DEFINER RPC.
      const { error } = await supabase.rpc('send_contract_for_approval', { _contract_id: contract.id });
      if (error) throw error;
      await supabase.from('notifications').insert({
        user_id: contract.client_id,
        title_ar: `عقد جديد بانتظار مراجعتك: ${contract.title_ar}`,
        title_en: `New contract pending review: ${contract.title_en || contract.title_ar}`,
        notification_type: 'contract', reference_id: contract.id, reference_type: 'contract',
        action_url: `/contracts/${contract.id}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
      setSendConfirm(null);
      toast.success(isRTL ? 'تم إرسال العقد للمراجعة' : 'Contract sent for review');
    },
  });

  /* ── Helpers ── */
  const stats = useMemo(() => {
    const src = roleFilter === 'provider' ? providerContracts : roleFilter === 'client' ? clientContracts : contracts;
    const totalAmount = src.reduce((s: number, c) => s + Number(c.total_amount), 0);
    const totalPaid = allPayments.filter((p) => p.status === 'paid' && src.some((c) => c.id === p.contract_id)).reduce((s: number, p) => s + Number(p.amount), 0);
    const overduePayments = allPayments.filter((p) => p.status === 'overdue' && src.some((c) => c.id === p.contract_id));
    return {
      total: src.length,
      active: src.filter((c) => c.status === 'active').length,
      completed: src.filter((c) => c.status === 'completed').length,
      pendingApproval: src.filter((c) => c.status === 'pending_approval').length,
      draft: src.filter((c) => c.status === 'draft').length,
      cancelled: src.filter((c) => c.status === 'cancelled').length,
      totalAmount, totalPaid,
      overdueCount: overduePayments.length,
      overdueAmount: overduePayments.reduce((s: number, p) => s + Number(p.amount), 0),
      asProvider: providerContracts.length,
      asClient: clientContracts.length,
      totalMilestones: allMilestones.length,
      completedMilestones: allMilestones.filter(m => m.status === 'completed').length,
      totalAttachments: allAttachments.length,
      totalMaintenance: allMaintenanceRequests.length,
      totalMeasurements: allMeasurements.length,
    };
  }, [contracts, providerContracts, clientContracts, allPayments, allMilestones, allAttachments, allMaintenanceRequests, allMeasurements, roleFilter]);

  const filtered = useMemo(() => {
    let items = roleFilter === 'provider' ? providerContracts.map((c) => ({ ...c, _role: 'provider' })) :
      roleFilter === 'client' ? clientContracts.map((c) => ({ ...c, _role: 'client' })) : contracts;

    if (statusFilter !== 'all') items = items.filter((c) => c.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((c) =>
        c.title_ar?.toLowerCase().includes(q) || c.title_en?.toLowerCase().includes(q) ||
        c.contract_number?.toLowerCase().includes(q) ||
        profiles.some((p) => (p.full_name?.toLowerCase().includes(q)) && (p.user_id === c.client_id || p.user_id === c.provider_id))
      );
    }

    if (sortBy === 'amount') items = [...items].sort((a, b) => Number(b.total_amount) - Number(a.total_amount));
    else if (sortBy === 'status') items = [...items].sort((a, b) => a.status.localeCompare(b.status));
    else if (sortBy === 'health') {
      items = [...items].sort((a, b) => {
        const hA = getContractHealth(a, allMilestones.filter(m => m.contract_id === a.id), allPayments.filter(p => p.contract_id === a.id));
        const hB = getContractHealth(b, allMilestones.filter(m => m.contract_id === b.id), allPayments.filter(p => p.contract_id === b.id));
        return hB - hA;
      });
    } else items = [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return items;
  }, [contracts, providerContracts, clientContracts, statusFilter, searchQuery, roleFilter, profiles, sortBy, allMilestones, allPayments]);

  const formatDate = useCallback((d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }, [isRTL]);

  const handleExportPDF = useCallback(async (c: ContractWithRole) => {
    setIsExporting(true);
    try {
      const clientP = profiles.find((p) => p.user_id === c.client_id);
      const providerP = profiles.find((p) => p.user_id === c.provider_id);
      const ms = allMilestones.filter((m) => m.contract_id === c.id);

      // CT6 — Pull line items, frozen template snapshot, and template meta
      // on demand. RLS gates everything; failures fall back to legacy export.
      const cAny = c as unknown as { template_version_id?: string | null; pricing_method?: string | null };
      const [liRes, snapRes, tplRes] = await Promise.all([
        supabase
          .from('contract_line_items')
          .select('name_ar, name_en, pricing_method, unit_of_measure, boq_group_key, quantity, unit_price, total_cost, formula_inputs, sort_order')
          .eq('contract_id', c.id)
          .order('sort_order'),
        supabase
          .from('contract_template_snapshots')
          .select('frozen_payload')
          .eq('contract_id', c.id)
          .maybeSingle(),
        cAny.template_version_id
          ? supabase
              // CT7B: non-admin path uses safe public view.
              .from('contract_template_versions_public')
              .select('version_number, language_precedence, contract_templates!inner(name_ar, name_en, category)')
              .eq('id', cAny.template_version_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      const lineItemsRows = (liRes.data ?? []) as Array<Record<string, unknown>>;
      const snap = (snapRes.data?.frozen_payload ?? null) as null | { sections?: unknown; attachments?: unknown };
      const tplMeta = (tplRes.data ?? null) as null | {
        version_number?: number | null;
        language_precedence?: string | null;
        contract_templates?: { name_ar?: string | null; name_en?: string | null; category?: string | null };
      };

      const data: ContractExportData = {
        contractNumber: c.contract_number, title: isRTL ? c.title_ar : (c.title_en || c.title_ar),
        totalAmount: Number(c.total_amount), currency: c.currency_code,
        startDate: c.start_date ? formatDate(c.start_date) : undefined,
        endDate: c.end_date ? formatDate(c.end_date) : undefined,
        clientName: clientP?.full_name || '-', providerName: providerP?.full_name || '-',
        supervisorName: c.supervisor_name || undefined,
        supervisorPhone: c.supervisor_phone || undefined,
        supervisorEmail: c.supervisor_email || undefined,
        terms: isRTL ? c.terms_ar : (c.terms_en || c.terms_ar),
        milestones: ms.map((m) => ({
          title: isRTL ? m.title_ar : (m.title_en || m.title_ar),
          amount: Number(m.amount),
          dueDate: m.due_date ? formatDate(m.due_date) : undefined,
          status: m.status,
        })),
        documentHash: c.document_hash || undefined,
        template: tplMeta ? {
          nameAr: tplMeta.contract_templates?.name_ar ?? null,
          nameEn: tplMeta.contract_templates?.name_en ?? null,
          versionNumber: tplMeta.version_number ?? null,
          category: tplMeta.contract_templates?.category ?? null,
          pricingMethod: cAny.pricing_method ?? null,
          languagePrecedence: tplMeta.language_precedence ?? null,
        } : null,
        templateSnapshot: snap ? {
          sections: ((snap as { sections?: unknown }).sections ?? []) as never,
          attachments: ((snap as { attachments?: unknown }).attachments ?? []) as never,
        } : null,
        lineItems: lineItemsRows.map((li) => ({
          nameAr: (li.name_ar as string | null) ?? null,
          nameEn: (li.name_en as string | null) ?? null,
          pricingMethod: (li.pricing_method as string | null) ?? null,
          unitOfMeasure: (li.unit_of_measure as string | null) ?? null,
          boqGroupKey: (li.boq_group_key as string | null) ?? null,
          quantity: Number(li.quantity || 0),
          unitPrice: Number(li.unit_price || 0),
          totalCost: Number(li.total_cost || 0),
          formulaInputs: li.formula_inputs ?? null,
        })),
        isRTL,
      };
      const { exportContractPDF } = await import('@/lib/contract-pdf-export');
      await exportContractPDF(data);
      // PDF-QA2: log the export. Server validates auth & resolves metadata.
      try {
        const { recordContractPdfExport } = await import('@/lib/contract-pdf-history');
        await recordContractPdfExport(c.id, 'dashboard_contracts', isRTL ? 'ar' : 'en');
      } catch { /* non-blocking */ }
      toast.success(isRTL ? 'تم تصدير العقد' : 'Contract exported');
    } catch {
      toast.error(isRTL ? 'فشل التصدير' : 'Export failed');
    } finally { setIsExporting(false); }
  }, [profiles, allMilestones, isRTL, formatDate]);

  const handleDuplicate = useCallback(async (c: ContractWithRole) => {
    try {
      const { error } = await supabase.from('contracts').insert({
        provider_id: c.provider_id, client_id: c.client_id, business_id: c.business_id,
        title_ar: `${c.title_ar} (نسخة)`, title_en: c.title_en ? `${c.title_en} (Copy)` : null,
        description_ar: c.description_ar, description_en: c.description_en,
        total_amount: c.total_amount, currency_code: c.currency_code,
        terms_ar: c.terms_ar, terms_en: c.terms_en,
        supervisor_name: c.supervisor_name, supervisor_phone: c.supervisor_phone, supervisor_email: c.supervisor_email,
        status: 'draft',
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
      toast.success(isRTL ? 'تم نسخ العقد' : 'Contract duplicated');
    } catch {
      toast.error(isRTL ? 'فشل النسخ' : 'Duplication failed');
    }
  }, [queryClient, isRTL]);

  const applyTemplate = useCallback((tmpl: TemplateRow) => {
    setForm(f => ({
      ...f,
      terms_ar: [tmpl.terms_ar, tmpl.scope_of_work_ar, tmpl.warranty_terms_ar, tmpl.payment_terms_ar, tmpl.penalties_ar, tmpl.notes_ar].filter(Boolean).join('\n\n'),
      terms_en: [tmpl.terms_en, tmpl.scope_of_work_en, tmpl.warranty_terms_en, tmpl.payment_terms_en, tmpl.penalties_en, tmpl.notes_en].filter(Boolean).join('\n\n'),
    }));
    setSelectedTemplate(tmpl);
    setViewSection('create');
    toast.success(isRTL ? 'تم تطبيق القالب' : 'Template applied');
  }, [isRTL]);

  const openEditContract = useCallback((c: ContractWithRole) => {
    setEditingId(c.id);
    setForm({
      title_ar: c.title_ar, title_en: c.title_en || '', description_ar: c.description_ar || '',
      description_en: c.description_en || '', total_amount: c.total_amount?.toString() || '',
      currency_code: c.currency_code || 'SAR', start_date: c.start_date || '', end_date: c.end_date || '',
      terms_ar: c.terms_ar || '', terms_en: c.terms_en || '',
      supervisor_name: c.supervisor_name || '', supervisor_phone: c.supervisor_phone || '',
      supervisor_email: c.supervisor_email || '', client_email: '',
      vat_inclusive: c.vat_inclusive || false, vat_rate: c.vat_rate?.toString() || '15',
    });
    setViewSection('create');
  }, []);

  const closeForm = useCallback(() => {
    setViewSection('list'); setForm(emptyForm); setEditingId(null); setSelectedTemplate(null); setTemplatePreview(null);
    setSelectedClient(null); setSelectedWorkType('general'); setWorkTypeTouched(false);
    setSelectedVersionId(null); setSelectedPricingMethod(null);
    setInviteMode('idle'); setInviteForm({ email: '', name: '', phone: '' }); setPendingInvite(null);
  }, []);

  const handleShareContract = useCallback(async (c: ContractWithRole) => {
    const url = `${window.location.origin}/contracts/${c.id}`;
    const title = isRTL ? c.title_ar : (c.title_en || c.title_ar);
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* user cancelled */ }
    } else {
      navigator.clipboard.writeText(url);
      toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied');
    }
  }, [isRTL]);

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-lg shadow-accent/20">
                <FileText className="w-5 h-5 text-accent-foreground" />
              </div>
              {isRTL ? 'إدارة العقود' : 'Contract Management'}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 ms-11.5">{isRTL ? 'إنشاء ومتابعة وتصدير العقود الاحترافية' : 'Create, track, and export professional contracts'}</p>
          </div>
          {viewSection === 'list' && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" onClick={() => setViewSection('templates')}>
                <BookOpen className="w-3.5 h-3.5" />
                {isRTL ? 'القوالب' : 'Templates'}
                {templates.length > 0 && <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4">{templates.length}</Badge>}
              </Button>
              <Button variant="hero" size="sm" className="gap-1.5 text-xs h-9 shadow-lg" onClick={() => { closeForm(); setViewSection('create'); }}>
                <Plus className="w-4 h-4" />
                {isRTL ? 'عقد جديد' : 'New Contract'}
              </Button>
            </div>
          )}
          {viewSection !== 'list' && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" onClick={closeForm}>
              <X className="w-3.5 h-3.5" />{isRTL ? 'رجوع' : 'Back'}
            </Button>
          )}
        </div>

        {/* ── Dashboard Stats ── */}
        {viewSection === 'list' && (
          <div className="space-y-4">
            {/* Primary Financial KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { icon: FileText, label: isRTL ? 'إجمالي العقود' : 'Total Contracts', value: stats.total.toString(), color: 'from-primary/10 to-primary/5', iconColor: 'text-primary bg-primary/15', trend: stats.active > 0 ? `${stats.active} ${isRTL ? 'نشط' : 'active'}` : undefined, trendUp: true },
                { icon: DollarSign, label: isRTL ? 'القيمة الإجمالية' : 'Total Value', value: stats.totalAmount.toLocaleString(), color: 'from-accent/10 to-accent/5', iconColor: 'text-accent bg-accent/15', sub: 'SAR' },
                { icon: Banknote, label: isRTL ? 'المحصّل' : 'Collected', value: stats.totalPaid.toLocaleString(), color: 'from-success/10 to-success/5', iconColor: 'text-success bg-success/15', sub: 'SAR', trend: stats.totalAmount > 0 ? `${Math.round((stats.totalPaid / stats.totalAmount) * 100)}%` : undefined, trendUp: true },
                { icon: AlertTriangle, label: isRTL ? 'متأخرات' : 'Overdue', value: stats.overdueAmount.toLocaleString(), color: stats.overdueCount > 0 ? 'from-destructive/10 to-destructive/5' : 'from-success/5 to-success/3', iconColor: stats.overdueCount > 0 ? 'text-destructive bg-destructive/15' : 'text-success bg-success/15', sub: 'SAR', trend: stats.overdueCount > 0 ? `${stats.overdueCount} ${isRTL ? 'دفعة' : 'payments'}` : undefined, trendUp: false },
              ].map((s, i) => (
                <Card key={i} className={`overflow-hidden border-border/40`}>
                  <CardContent className={`p-4 bg-gradient-to-br ${s.color}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.iconColor}`}><s.icon className="w-5 h-5" /></div>
                      {s.trend && (
                        <Badge variant="outline" className={`text-[8px] gap-0.5 ${s.trendUp ? 'text-success border-success' : 'text-destructive border-destructive'}`}>
                          {s.trendUp ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                          {s.trend}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xl font-bold mb-0.5">{s.value}{s.sub && <span className="text-[10px] text-muted-foreground ms-1 font-normal">{s.sub}</span>}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Collection Progress & Activity Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Collection */}
              {stats.totalAmount > 0 && (
                <Card className="lg:col-span-2 border-border/40">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-accent" />{isRTL ? 'نسبة التحصيل' : 'Collection Rate'}</h3>
                      <span className="text-lg font-bold text-accent">{Math.round((stats.totalPaid / stats.totalAmount) * 100)}%</span>
                    </div>
                    <Progress value={(stats.totalPaid / stats.totalAmount) * 100} className="h-2.5 mb-2 [&>div]:bg-gradient-to-r [&>div]:from-accent [&>div]:to-success" aria-label={isRTL ? `نسبة التحصيل ${Math.round((stats.totalPaid / stats.totalAmount) * 100)}٪` : `Collection rate ${Math.round((stats.totalPaid / stats.totalAmount) * 100)}%`} />
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{isRTL ? 'المحصّل' : 'Collected'}: <strong className="text-foreground">{stats.totalPaid.toLocaleString()}</strong> {isRTL ? 'ر.س' : 'SAR'}</span>
                      <span>{isRTL ? 'المتبقي' : 'Remaining'}: <strong className="text-foreground">{(stats.totalAmount - stats.totalPaid).toLocaleString()}</strong> {isRTL ? 'ر.س' : 'SAR'}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Quick Stats */}
              <Card className="border-border/40">
                <CardContent className="p-4 space-y-2.5">
                  <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-1"><Activity className="w-3.5 h-3.5 text-primary" />{isRTL ? 'إحصائيات سريعة' : 'Quick Stats'}</h3>
                  {[
                    { icon: CheckCircle2, label: isRTL ? 'مكتملة' : 'Completed', value: stats.completed, color: 'text-info' },
                    { icon: Clock, label: isRTL ? 'بانتظار الموافقة' : 'Pending', value: stats.pendingApproval, color: 'text-warning' },
                    { icon: ListChecks, label: isRTL ? 'المراحل' : 'Milestones', value: `${stats.completedMilestones}/${stats.totalMilestones}`, color: 'text-secondary' },
                    { icon: Ruler, label: isRTL ? 'المقاسات' : 'Measurements', value: stats.totalMeasurements, color: 'text-info' },
                    { icon: WrenchIcon, label: isRTL ? 'طلبات الصيانة' : 'Maintenance', value: stats.totalMaintenance, color: 'text-urgent' },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-muted-foreground"><s.icon className={`w-3.5 h-3.5 ${s.color}`} />{s.label}</span>
                      <span className="font-bold">{s.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ═══ Templates Browser ═══ */}
        {viewSection === 'templates' && (
          <Card className="border-accent/20 bg-gradient-to-br from-accent/[0.02] to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-accent" />
                {isRTL ? 'قوالب العقود الاحترافية' : 'Professional Contract Templates'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((tmpl) => {
                  const cfg = templateCategoryConfig[tmpl.category];
                  const Icon = cfg?.icon || FileText;
                  return (
                    <Card key={tmpl.id} className="border-border/40 hover:border-accent/30 hover:shadow-lg transition-all cursor-pointer group" onClick={() => { setTemplatePreview(tmpl); setViewSection('template-preview'); }}>
                      <CardContent className="p-3.5">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg?.color || 'bg-muted text-muted-foreground'}`}><Icon className="w-5 h-5" /></div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-heading font-semibold text-xs truncate group-hover:text-accent transition-colors">{isRTL ? tmpl.name_ar : (tmpl.name_en || tmpl.name_ar)}</h4>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{cfg?.[isRTL ? 'ar' : 'en'] || tmpl.category}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {[tmpl.scope_of_work_ar && (isRTL ? 'نطاق' : 'Scope'), tmpl.warranty_terms_ar && (isRTL ? 'ضمان' : 'Warranty'), tmpl.payment_terms_ar && (isRTL ? 'دفع' : 'Payment')].filter(Boolean).map((tag, i) => (
                                <Badge key={i} variant="secondary" className="text-[7px] px-1.5 py-0 h-4">{tag}</Badge>
                              ))}
                            </div>
                          </div>
                          <ArrowRight className={`w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-1 ${isRTL ? 'rotate-180' : ''}`} />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {templates.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">{isRTL ? 'لا توجد قوالب متاحة' : 'No templates available'}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ═══ Template Preview ═══ */}
        {viewSection === 'template-preview' && templatePreview && (
          <Card className="border-accent/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => { const cfg = templateCategoryConfig[templatePreview.category]; const Icon = cfg?.icon || FileText; return <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg?.color || 'bg-muted'}`}><Icon className="w-5 h-5" /></div>; })()}
                  <div>
                    <CardTitle className="text-sm">{isRTL ? templatePreview.name_ar : (templatePreview.name_en || templatePreview.name_ar)}</CardTitle>
                    <p className="text-[10px] text-muted-foreground">{templateCategoryConfig[templatePreview.category]?.[isRTL ? 'ar' : 'en']}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setViewSection('templates')} className="gap-1 text-xs">
                  <ArrowRight className={`w-3 h-3 ${isRTL ? '' : 'rotate-180'}`} />{isRTL ? 'رجوع' : 'Back'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: 'terms', label: isRTL ? 'الشروط والالتزامات' : 'Terms', content: isRTL ? templatePreview.terms_ar : (templatePreview.terms_en || templatePreview.terms_ar) },
                { key: 'scope', label: isRTL ? 'نطاق العمل' : 'Scope of Work', content: isRTL ? templatePreview.scope_of_work_ar : (templatePreview.scope_of_work_en || templatePreview.scope_of_work_ar) },
                { key: 'warranty', label: isRTL ? 'شروط الضمان' : 'Warranty', content: isRTL ? templatePreview.warranty_terms_ar : (templatePreview.warranty_terms_en || templatePreview.warranty_terms_ar) },
                { key: 'payment', label: isRTL ? 'شروط الدفع' : 'Payment', content: isRTL ? templatePreview.payment_terms_ar : (templatePreview.payment_terms_en || templatePreview.payment_terms_ar) },
                { key: 'penalties', label: isRTL ? 'الغرامات' : 'Penalties', content: isRTL ? templatePreview.penalties_ar : (templatePreview.penalties_en || templatePreview.penalties_ar) },
                { key: 'notes', label: isRTL ? 'ملاحظات' : 'Notes', content: isRTL ? templatePreview.notes_ar : (templatePreview.notes_en || templatePreview.notes_ar) },
              ].filter(s => s.content).map(section => (
                <div key={section.key} className="p-3.5 rounded-xl border border-border/40 bg-muted/20">
                  <h4 className="font-semibold text-xs mb-2 flex items-center gap-1.5"><FileCheck className="w-3.5 h-3.5 text-accent" />{section.label}</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{section.content}</p>
                </div>
              ))}
              <Button variant="hero" className="w-full gap-2 h-11 shadow-lg" onClick={() => applyTemplate(templatePreview)}>
                <Zap className="w-4 h-4" />{isRTL ? 'استخدام القالب وإنشاء عقد' : 'Use Template & Create Contract'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ═══ Create/Edit Form ═══ */}
        {viewSection === 'create' && (
          <Card className="border-accent/20 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {editingId ? <Edit3 className="w-4 h-4 text-accent" /> : <Plus className="w-4 h-4 text-accent" />}
                {editingId ? (isRTL ? 'تعديل العقد' : 'Edit Contract') : (isRTL ? 'إنشاء عقد جديد' : 'Create New Contract')}
                {selectedTemplate && <Badge variant="secondary" className="text-[9px] gap-0.5"><Sparkles className="w-2.5 h-2.5" />{isRTL ? 'من قالب' : 'From template'}</Badge>}
              </CardTitle>
              {!editingId && (() => {
                const steps = [
                  { key: 'client',   ar: 'العميل',       en: 'Client',   done: !!(selectedClient || form.client_email || pendingInvite) },
                  { key: 'work',     ar: 'نوع العمل',    en: 'Work type', done: !!selectedWorkType && workTypeTouched },
                  { key: 'template', ar: 'القالب',       en: 'Template',  done: !!effectiveVersion },
                  { key: 'details',  ar: 'التفاصيل',     en: 'Details',   done: !!form.title_ar && !!form.total_amount && Number(form.total_amount) > 0 },
                  { key: 'pricing',  ar: 'التسعير/VAT',  en: 'Pricing/VAT', done: !!form.vat_rate },
                  { key: 'review',   ar: 'المراجعة',     en: 'Review',    done: false },
                ] as Array<{ key: StepKey; ar: string; en: string; done: boolean }>;
                return (
                  <div className="mt-3 flex items-center gap-1 overflow-x-auto no-scrollbar" role="list" aria-label={isRTL ? 'خطوات إنشاء العقد' : 'Contract creation steps'}>
                    {steps.map((s, i) => (
                      <React.Fragment key={s.key}>
                        <button
                          type="button"
                          onClick={() => goToStep(s.key)}
                          aria-current={activeStep === s.key ? 'step' : undefined}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] whitespace-nowrap transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                            activeStep === s.key
                              ? 'border-primary/60 bg-primary/10 text-primary'
                              : s.done
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                : 'border-border/40 bg-muted/30 text-muted-foreground'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-full inline-flex items-center justify-center text-[9px] font-bold ${s.done ? 'bg-success text-success-foreground' : activeStep === s.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {s.done ? '✓' : i + 1}
                          </span>
                          {isRTL ? s.ar : s.en}
                        </button>
                        {i < steps.length - 1 && <span className="text-muted-foreground/40 text-[10px]">·</span>}
                      </React.Fragment>
                    ))}
                  </div>
                );
              })()}
            </CardHeader>
            <CardContent className="space-y-4">
              <div ref={stepRefs.client} className="space-y-4 scroll-mt-24">
              {/* CT4C.5 — Accepted invitations awaiting contract completion */}
              {!editingId && inviteMode === 'idle' && acceptedInvitations.length > 0 && (
                <div className="p-4 rounded-xl border-2 border-emerald-500/40 bg-emerald-500/5 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <CircleCheck className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-semibold">
                        {isRTL ? 'دعوات مقبولة بانتظار إصدار العقد' : 'Accepted invitations awaiting contract'}
                      </span>
                      <Badge variant="secondary" className="text-[9px]">{acceptedInvitations.length}</Badge>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => refetchAcceptedInvites()}>
                      <RefreshCw className="w-3 h-3 me-1" />
                      {isRTL ? 'تحديث' : 'Refresh'}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {acceptedInvitations.map((inv) => {
                      const wt = inv.work_type ? getWorkType(inv.work_type as WorkTypeKey) : null;
                      return (
                        <div key={inv.id} className="p-3 rounded-lg border border-emerald-500/20 bg-background flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[9px] tech-content">{inv.ref_id}</Badge>
                              {wt && <Badge variant="secondary" className="text-[9px]">{isRTL ? wt.ar : wt.en}</Badge>}
                              {inv.template_version_id && (
                                <Badge variant="secondary" className="text-[9px] gap-0.5">
                                  <Sparkles className="w-2.5 h-2.5" />{isRTL ? 'قالب جاهز' : 'Template ready'}
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                              <span dir="ltr" className="font-mono">{maskInviteEmail(inv.email_lower)}</span>
                              {inv.recipient_name && <span>· {inv.recipient_name}</span>}
                              {inv.accepted_at && (
                                <span dir="ltr">· {new Date(inv.accepted_at).toISOString().slice(0, 10)}</span>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="hero"
                            size="sm"
                            className="h-8 gap-1.5 text-[11px]"
                            disabled={!inv.template_version_id || completeFromInviteMutation.isPending}
                            onClick={() => completeFromInviteMutation.mutate(inv.id)}
                          >
                            {completeFromInviteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileCheck className="w-3 h-3" />}
                            {isRTL ? 'إكمال إصدار العقد' : 'Complete contract'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  {acceptedInvitations.some(i => !i.template_version_id) && (
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      {isRTL
                        ? 'بعض الدعوات لا تحتوي على قالب محفوظ — يلزم إنشاء العقد يدويًا.'
                        : 'Some invitations have no saved template — these require manual contract creation.'}
                    </p>
                  )}
                </div>
              )}

              {/* CT4B — Step 1: Client (search picker with email fallback) */}
              {!editingId && inviteMode === 'idle' && (
                <ClientPicker
                  isRTL={isRTL}
                  selected={selectedClient}
                  onSelect={setSelectedClient}
                  fallbackEmail={form.client_email}
                  onFallbackEmail={(v) => setForm(f => ({ ...f, client_email: v }))}
                  onRequestInvite={(prefill) => {
                    setInviteForm({ email: prefill.includes('@') ? prefill : '', name: '', phone: '' });
                    setInviteMode('composing');
                  }}
                />
              )}

              {/* CT4C.3 — Compose invitation */}
              {!editingId && inviteMode === 'composing' && (
                <div className="p-4 rounded-xl border-2 border-info/40 bg-info/5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-info" />
                      {isRTL ? 'إرسال دعوة لعميل جديد' : 'Invite a new client'}
                    </Label>
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => { setInviteMode('idle'); setInviteForm({ email: '', name: '', phone: '' }); }}>
                      <X className="w-3 h-3 me-1" />
                      {isRTL ? 'إلغاء' : 'Cancel'}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1 sm:col-span-1">
                      <Label className="text-[10px]">{isRTL ? 'البريد الإلكتروني' : 'Email'} <span className="text-destructive">*</span></Label>
                      <Input dir="ltr" type="email" className="h-9 text-xs" value={inviteForm.email} onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="client@email.com" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">{isRTL ? 'الاسم (اختياري)' : 'Name (optional)'}</Label>
                      <Input className="h-9 text-xs" value={inviteForm.name} onChange={(e) => setInviteForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">{isRTL ? 'الجوال (اختياري)' : 'Phone (optional)'}</Label>
                      <Input dir="ltr" className="h-9 text-xs" value={inviteForm.phone} onChange={(e) => setInviteForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {isRTL
                      ? 'سيتم إرسال رابط آمن للعميل لإنشاء حسابه أو تسجيل الدخول. لن يتم إنشاء العقد إلا بعد قبول الدعوة.'
                      : 'A secure link will be emailed to the client to create their account or sign in. The contract is not created until the invitation is accepted.'}
                  </p>
                  <Button type="button" variant="hero" size="sm" className="h-9 gap-1.5 text-xs" disabled={!inviteForm.email.trim() || sendInviteMutation.isPending} onClick={() => sendInviteMutation.mutate()}>
                    {sendInviteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {isRTL ? 'إرسال الدعوة' : 'Send invitation'}
                  </Button>
                </div>
              )}

              {/* CT4C.3 — Awaiting acceptance */}
              {!editingId && inviteMode === 'awaiting' && pendingInvite && (
                <div className="p-4 rounded-xl border-2 border-warning/40 bg-warning/5 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {pendingInviteAccepted ? <CircleCheck className="w-4 h-4 text-emerald-600" /> : <Clock className="w-4 h-4 text-warning" />}
                      <span className="text-xs font-semibold">
                        {pendingInviteAccepted
                          ? (isRTL ? 'تم قبول الدعوة — جاهزة لإصدار العقد' : 'Invitation accepted — ready to issue contract')
                          : (isRTL ? 'بانتظار قبول الدعوة' : 'Awaiting invitation acceptance')}
                      </span>
                      <Badge variant="secondary" className="text-[9px]">{pendingInvite.ref_id}</Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[9px]">
                        {pendingInviteAccepted ? (isRTL ? 'مقبولة' : 'Accepted') : (isRTL ? 'قيد الانتظار' : 'Pending')}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-[10px]"
                        onClick={() => { queryClient.invalidateQueries({ queryKey: ['pending-invite-status', pendingInvite.id] }); refetchAcceptedInvites(); }}
                      >
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <div className="text-muted-foreground text-[9px]">{isRTL ? 'البريد' : 'Email'}</div>
                      <div dir="ltr" className="font-mono">{maskInviteEmail(pendingInvite.email_lower)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-[9px]">{isRTL ? 'صالحة حتى' : 'Valid until'}</div>
                      <div dir="ltr">{new Date(pendingInvite.expires_at).toISOString().slice(0, 10)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-[9px]">{isRTL ? 'التذكيرات' : 'Reminders'}</div>
                      <div>{pendingInvite.reminder_count} / 2</div>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {pendingInviteAccepted
                      ? (isRTL
                        ? 'قبل العميل الدعوة. يمكنك الآن إكمال إصدار العقد.'
                        : 'The client accepted the invitation. You can now finalise the contract.')
                      : (isRTL
                        ? 'بعد قبول العميل للدعوة، يمكنك إنشاء العقد أو سيتم ربط المسودة حسب الخطوة التالية.'
                        : 'After the client accepts the invitation, you can create the contract or the draft will be linked in the next step.')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {pendingInviteAccepted ? (
                      <Button
                        type="button"
                        variant="hero"
                        size="sm"
                        className="h-8 gap-1.5 text-[11px]"
                        disabled={completeFromInviteMutation.isPending}
                        onClick={() => completeFromInviteMutation.mutate(pendingInvite.id)}
                      >
                        {completeFromInviteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileCheck className="w-3 h-3" />}
                        {isRTL ? 'إكمال إصدار العقد' : 'Complete contract'}
                      </Button>
                    ) : (
                      <>
                        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-[11px]" disabled={resendInviteMutation.isPending || pendingInvite.reminder_count >= 2} onClick={() => resendInviteMutation.mutate()}>
                          {resendInviteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          {isRTL ? 'إعادة إرسال' : 'Resend'}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 text-[11px] text-destructive" disabled={cancelInviteMutation.isPending} onClick={() => cancelInviteMutation.mutate()}>
                          {cancelInviteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                          {isRTL ? 'إلغاء الدعوة' : 'Cancel invitation'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
              </div>

              {/* CT4B — Step 2: Work / service type (auto-suggests template) */}
              <div ref={stepRefs.work} className="scroll-mt-24">
              {!editingId && (
                <div className="p-4 rounded-xl border border-border/40 bg-muted/20 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-primary" />
                    <Label className="text-xs font-semibold">{isRTL ? 'نوع العمل / الخدمة' : 'Work / Service Type'} <span className="text-destructive">*</span></Label>
                  </div>
                  <Select
                    value={selectedWorkType}
                    onValueChange={(v) => { setSelectedWorkType(v as WorkTypeKey); setWorkTypeTouched(true); setSelectedVersionId(null); setSelectedPricingMethod(null); }}
                  >
                    <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WORK_TYPES.map(w => (
                        <SelectItem key={w.key} value={w.key} className="text-xs">{isRTL ? w.ar : w.en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[9px] text-muted-foreground">
                    {isRTL ? 'سيتم استخدام قالب عقد مناسب لنوع العمل المحدد.' : 'A contract template matching the selected work type will be used.'}
                  </p>
                  {workTypeTouched && (() => {
                    const w = getWorkType(selectedWorkType);
                    if (!w || w.defaultBoqGroups.length === 0) return null;
                    return (
                      <div className="flex flex-wrap gap-1 pt-1">
                        <span className="text-[9px] text-muted-foreground me-1">{isRTL ? 'مجموعات BOQ المقترحة:' : 'Suggested BOQ groups:'}</span>
                        {w.defaultBoqGroups.map(g => {
                          const meta = BOQ_GROUPS.find(b => b.key === g);
                          return <Badge key={g} variant="outline" className="text-[9px]">{meta ? (isRTL ? meta.ar : meta.en) : g}</Badge>;
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
              </div>

              {/* CT4 — Template selector (new contracts only) */}
              <div ref={stepRefs.template} className="scroll-mt-24">
              {!editingId && publishedVersions.length > 0 && (
                <div className="p-4 rounded-xl border border-border/40 bg-muted/20 space-y-3">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    <Label className="text-xs font-semibold">{isRTL ? 'قالب العقد الرسمي' : 'Official Contract Template'}</Label>
                    {effectiveVersion && (
                      <Badge variant="secondary" className="text-[9px] gap-0.5">v{effectiveVersion.version_number}</Badge>
                    )}
                  </div>
                  <Select
                    value={effectiveVersion?.version_id ?? ''}
                    onValueChange={(v) => { setSelectedVersionId(v); setSelectedPricingMethod(null); }}
                  >
                    <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {publishedVersions.map(v => {
                        const cfg = templateCategoryConfig[v.category];
                        const label = isRTL ? v.name_ar : (v.name_en || v.name_ar);
                        const catLabel = cfg ? cfg[isRTL ? 'ar' : 'en'] : v.category;
                        return (
                          <SelectItem key={v.version_id} value={v.version_id} className="text-xs">
                            {label} · {catLabel} · v{v.version_number}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {effectiveVersion && effectiveVersion.pricing_methods.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">{isRTL ? 'طريقة التسعير' : 'Pricing Method'}</Label>
                      <Select value={selectedPricingMethod ?? ''} onValueChange={(v) => setSelectedPricingMethod(v || null)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={isRTL ? 'اختياري' : 'Optional'} /></SelectTrigger>
                        <SelectContent>
                          {effectiveVersion.pricing_methods.map(m => (
                            <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {effectiveVersion && effectiveVersion.required_field_count > 0 && (
                    <p className="text-[10px] text-warning bg-warning/10 border border-warning/20 rounded-lg p-2">
                      {isRTL
                        ? `هذا القالب يحتوي على ${effectiveVersion.required_field_count} حقل مطلوب سيتم دعمها بالكامل في CT5.`
                        : `This template has ${effectiveVersion.required_field_count} required fields — full support arrives in CT5.`}
                    </p>
                  )}
                </div>
              )}
              </div>

              {/* Titles + descriptions + dates + supervisor + terms = Details step */}
              <div ref={stepRefs.details} className="space-y-4 scroll-mt-24">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-xs">{isRTL ? 'عنوان العقد (عربي)' : 'Title (Arabic)'} <span className="text-destructive">*</span></Label>
                    <FieldAiActions value={form.title_ar} lang="ar" onImproved={v => setForm(f => ({ ...f, title_ar: v }))} fieldType="title" />
                  </div>
                  <Input value={form.title_ar} onChange={e => setForm({ ...form, title_ar: e.target.value })} className="h-10" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-xs">{isRTL ? 'عنوان العقد (إنجليزي)' : 'Title (English)'}</Label>
                    <FieldAiActions value={form.title_en} lang="en" onTranslated={v => setForm(f => ({ ...f, title_en: v }))} onImproved={v => setForm(f => ({ ...f, title_en: v }))} fieldType="title" />
                  </div>
                  <Input value={form.title_en} onChange={e => setForm({ ...form, title_en: e.target.value })} dir="ltr" className="h-10" />
                </div>
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-xs">{isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                    <FieldAiActions value={form.description_ar} lang="ar" onImproved={v => setForm(f => ({ ...f, description_ar: v }))} fieldType="description" />
                  </div>
                  <Textarea value={form.description_ar} onChange={e => setForm({ ...form, description_ar: e.target.value })} rows={3} className="text-xs" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-xs">{isRTL ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
                    <FieldAiActions value={form.description_en} lang="en" onTranslated={v => setForm(f => ({ ...f, description_en: v }))} onImproved={v => setForm(f => ({ ...f, description_en: v }))} fieldType="description" />
                  </div>
                  <Textarea value={form.description_en} onChange={e => setForm({ ...form, description_en: e.target.value })} rows={3} dir="ltr" className="text-xs" />
                </div>
              </div>

              {/* Financial & Dates */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{isRTL ? 'المبلغ' : 'Amount'} <span className="text-destructive">*</span></Label>
                  <Input type="number" value={form.total_amount} onChange={e => setForm({ ...form, total_amount: e.target.value })} dir="ltr" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{isRTL ? 'العملة' : 'Currency'}</Label>
                  <Select value={form.currency_code} onValueChange={v => setForm({ ...form, currency_code: v })}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAR">SAR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{isRTL ? 'تاريخ البدء' : 'Start Date'}</Label>
                  <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} dir="ltr" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{isRTL ? 'تاريخ الانتهاء' : 'End Date'}</Label>
                  <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} dir="ltr" className="h-10" />
                </div>
              </div>
              </div>

              {/* VAT Settings — Pricing/VAT step */}
              <div ref={stepRefs.pricing} className="space-y-4 scroll-mt-24">
              <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
                <h4 className="text-xs font-semibold flex items-center gap-1.5"><Percent className="w-3.5 h-3.5 text-primary" />{isRTL ? 'ضريبة القيمة المضافة' : 'Value Added Tax (VAT)'}</h4>
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.vat_inclusive} onChange={e => setForm(f => ({ ...f, vat_inclusive: e.target.checked }))} className="w-4 h-4 rounded border-border accent-accent" />
                    <span className="text-xs">{isRTL ? 'الأسعار شاملة الضريبة' : 'Prices include VAT'}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">{isRTL ? 'نسبة الضريبة' : 'VAT Rate'}</Label>
                    <Input type="number" value={form.vat_rate} onChange={e => setForm(f => ({ ...f, vat_rate: e.target.value }))} dir="ltr" className="h-8 w-20 text-xs" />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground">{form.vat_inclusive ? (isRTL ? 'جميع الأسعار والمبالغ في العقد شاملة ضريبة القيمة المضافة' : 'All prices and amounts include VAT') : (isRTL ? 'ستُضاف ضريبة القيمة المضافة على المجموع النهائي' : 'VAT will be added to the final total')}</p>
              </div>
              {/* Supervisor */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
                <h4 className="text-xs font-semibold flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-primary" />{isRTL ? 'مشرف المشروع' : 'Project Supervisor'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input placeholder={isRTL ? 'الاسم' : 'Name'} value={form.supervisor_name} onChange={e => setForm({ ...form, supervisor_name: e.target.value })} className="h-10 text-xs" />
                  <Input placeholder={isRTL ? 'الجوال' : 'Phone'} value={form.supervisor_phone} onChange={e => setForm({ ...form, supervisor_phone: e.target.value })} dir="ltr" className="h-10 text-xs" />
                  <Input placeholder={isRTL ? 'البريد' : 'Email'} value={form.supervisor_email} onChange={e => setForm({ ...form, supervisor_email: e.target.value })} dir="ltr" className="h-10 text-xs" />
                </div>
              </div>

              {/* Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-xs">{isRTL ? 'الشروط والأحكام (عربي)' : 'Terms (Arabic)'}</Label>
                    <FieldAiActions value={form.terms_ar} lang="ar" onImproved={v => setForm(f => ({ ...f, terms_ar: v }))} fieldType="content" />
                  </div>
                  <Textarea value={form.terms_ar} onChange={e => setForm({ ...form, terms_ar: e.target.value })} rows={6} className="text-xs" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-xs">{isRTL ? 'الشروط والأحكام (إنجليزي)' : 'Terms (English)'}</Label>
                    <FieldAiActions value={form.terms_en} lang="en" onTranslated={v => setForm(f => ({ ...f, terms_en: v }))} onImproved={v => setForm(f => ({ ...f, terms_en: v }))} fieldType="content" />
                  </div>
                  <Textarea value={form.terms_en} onChange={e => setForm({ ...form, terms_en: e.target.value })} rows={6} dir="ltr" className="text-xs" />
                </div>
              </div>
              </div>

              {/* CT4B — Review summary + status guidance before submit. */}
              <div ref={stepRefs.review} className="space-y-4 scroll-mt-24">
              {!editingId && (() => {
                const guide = getStatusGuidance('draft');
                const w = getWorkType(selectedWorkType);
                const missing: string[] = [];
                if (!selectedClient && !form.client_email) missing.push(isRTL ? 'العميل' : 'Client');
                if (!form.title_ar) missing.push(isRTL ? 'عنوان العقد' : 'Title');
                if (!form.total_amount || Number(form.total_amount) <= 0) missing.push(isRTL ? 'المبلغ' : 'Amount');
                if (!effectiveVersion) missing.push(isRTL ? 'قالب عقد منشور' : 'Published template');
                return (
                  <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5"><FileCheck className="w-3.5 h-3.5 text-primary" />{isRTL ? 'مراجعة قبل الحفظ' : 'Review before saving'}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div><span className="text-muted-foreground">{isRTL ? 'العميل:' : 'Client:'}</span> {selectedClient?.full_name || form.client_email || '—'}</div>
                      <div><span className="text-muted-foreground">{isRTL ? 'نوع العمل:' : 'Work type:'}</span> {w ? (isRTL ? w.ar : w.en) : '—'}</div>
                      <div><span className="text-muted-foreground">{isRTL ? 'القالب:' : 'Template:'}</span> {effectiveVersion ? `${isRTL ? effectiveVersion.name_ar : (effectiveVersion.name_en || effectiveVersion.name_ar)} · v${effectiveVersion.version_number}` : '—'}</div>
                      <div><span className="text-muted-foreground">{isRTL ? 'طريقة التسعير:' : 'Pricing method:'}</span> {selectedPricingMethod || (isRTL ? 'افتراضي' : 'Default')}</div>
                      <div><span className="text-muted-foreground">{isRTL ? 'المبلغ:' : 'Amount:'}</span> {form.total_amount ? `${form.total_amount} ${form.currency_code}` : '—'}</div>
                      <div><span className="text-muted-foreground">{isRTL ? 'الضريبة:' : 'VAT:'}</span> {form.vat_inclusive ? (isRTL ? `شاملة ${form.vat_rate}%` : `Inclusive ${form.vat_rate}%`) : (isRTL ? `تُضاف ${form.vat_rate}%` : `Added ${form.vat_rate}%`)}</div>
                      <div><span className="text-muted-foreground">{isRTL ? 'تاريخ البدء/الانتهاء:' : 'Dates:'}</span> {(form.start_date || '—') + ' → ' + (form.end_date || '—')}</div>
                    </div>
                    {missing.length > 0 && (
                      <div className="text-[10px] text-warning bg-warning/10 border border-warning/20 rounded-lg p-2">
                        {isRTL ? 'حقول مطلوبة ناقصة: ' : 'Missing required fields: '}{missing.join(' · ')}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground border-t border-border/30 pt-2">
                      <strong className="text-foreground">{isRTL ? 'الحالة الأولى:' : 'Initial status:'}</strong> {isRTL ? 'مسودة' : 'Draft'} — {isRTL ? guide.meaning_ar : guide.meaning_en}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(isRTL ? guide.next_actions_ar : guide.next_actions_en).map((a) => (
                        <Badge key={a} variant="outline" className="text-[9px]">{a}</Badge>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Provider Contract UX 2 — Part A: Back / Next + Save Draft inline. */}
              {(() => {
                const idx = stepOrder.indexOf(activeStep);
                const prev = idx > 0 ? stepOrder[idx - 1] : null;
                const next = idx < stepOrder.length - 1 ? stepOrder[idx + 1] : null;
                const saveDisabled = !form.title_ar || !form.total_amount || (!editingId && !selectedClient && !form.client_email) || createContractMutation.isPending;
                return (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button type="button" variant="outline" size="sm" className="h-9 text-xs" disabled={!prev} onClick={() => prev && goToStep(prev)}>
                      {isRTL ? '→ السابق' : '← Back'}
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-9 text-xs" disabled={!next} onClick={() => next && goToStep(next)}>
                      {isRTL ? 'التالي ←' : 'Next →'}
                    </Button>
                    <div className="flex-1" />
                    <Button variant="hero" className="gap-2 h-10 shadow-lg" disabled={saveDisabled} onClick={() => createContractMutation.mutate()}>
                      {createContractMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {editingId ? (isRTL ? 'تحديث العقد' : 'Update Contract') : (isRTL ? 'حفظ المسودة' : 'Save Draft')}
                    </Button>
                  </div>
                );
              })()}
              </div>

              {/* Provider Contract UX 2 — Part D: sticky mobile action bar. */}
              <div className="lg:hidden sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-background/95 backdrop-blur border-t border-border/40 flex items-center gap-2 z-20">
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] text-muted-foreground leading-none">{isRTL ? 'الإجمالي' : 'Total'}</div>
                  <div className="text-xs font-bold tech-content truncate">
                    {form.total_amount ? `${Number(form.total_amount).toLocaleString()} ${form.currency_code}` : '—'}
                    <span className="ms-1 text-[9px] text-muted-foreground font-normal">
                      {form.vat_inclusive ? (isRTL ? `شاملة ${form.vat_rate}%` : `incl. ${form.vat_rate}%`) : (isRTL ? `+${form.vat_rate}%` : `+${form.vat_rate}%`)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="hero"
                  size="sm"
                  className="h-10 text-xs gap-1.5"
                  disabled={!form.title_ar || !form.total_amount || (!editingId && !selectedClient && !form.client_email) || createContractMutation.isPending}
                  onClick={() => createContractMutation.mutate()}
                >
                  {createContractMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {editingId ? (isRTL ? 'تحديث' : 'Update') : (isRTL ? 'حفظ المسودة' : 'Save Draft')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Contracts List ═══ */}
        {viewSection === 'list' && (
          <>
            {/* Role Tabs */}
            <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl border border-border/30 w-fit">
              {[
                { key: 'all' as const, label: isRTL ? 'الكل' : 'All', count: stats.total, icon: LayoutGrid },
                { key: 'provider' as const, label: isRTL ? 'كمزود خدمة' : 'As Provider', count: stats.asProvider, icon: Briefcase },
                { key: 'client' as const, label: isRTL ? 'كعميل' : 'As Client', count: stats.asClient, icon: User },
              ].map(tab => (
                <button key={tab.key} onClick={() => startTransition(() => setRoleFilter(tab.key))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${roleFilter === tab.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4">{tab.count}</Badge>
                </button>
              ))}
            </div>

            {/* Filters & Sort */}
            <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'all', label: isRTL ? 'الكل' : 'All', count: stats.total },
                  { key: 'active', label: isRTL ? 'نشط' : 'Active', count: stats.active },
                  { key: 'pending_approval', label: isRTL ? 'بانتظار' : 'Pending', count: stats.pendingApproval },
                  { key: 'completed', label: isRTL ? 'مكتمل' : 'Done', count: stats.completed },
                  { key: 'draft', label: isRTL ? 'مسودة' : 'Draft', count: stats.draft },
                ].map(f => (
                  <Button key={f.key} variant={statusFilter === f.key ? 'default' : 'outline'} size="sm" className="text-[10px] gap-1 h-8 px-3 rounded-lg" onClick={() => startTransition(() => setStatusFilter(f.key))}>
                    {f.label}
                    <Badge variant={statusFilter === f.key ? 'outline' : 'secondary'} className="text-[8px] px-1 py-0 h-4 ms-0.5">{f.count}</Badge>
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="h-8 text-[10px] w-28 px-2.5 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date" className="text-xs">{isRTL ? 'التاريخ' : 'Date'}</SelectItem>
                    <SelectItem value="amount" className="text-xs">{isRTL ? 'المبلغ' : 'Amount'}</SelectItem>
                    <SelectItem value="status" className="text-xs">{isRTL ? 'الحالة' : 'Status'}</SelectItem>
                    <SelectItem value="health" className="text-xs">{isRTL ? 'الصحة' : 'Health'}</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative sm:max-w-xs w-full">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder={isRTL ? 'بحث بالعنوان، الرقم...' : 'Search title, number...'} value={searchQuery} onChange={e => startTransition(() => setSearchQuery(e.target.value))} className="ps-9 h-8 text-xs rounded-lg" />
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 gap-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
            ) : filtered.length === 0 ? (
              <Card className="border-dashed border-2 bg-gradient-to-br from-muted/20 to-transparent">
                <CardContent className="flex flex-col items-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 shadow-inner">
                    <FileText className="w-8 h-8 text-accent" />
                  </div>
                  <h3 className="text-lg font-heading font-bold mb-2">{isRTL ? 'لا توجد عقود' : 'No contracts yet'}</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm">{isRTL ? 'ابدأ بإنشاء أول عقد احترافي لإدارة أعمالك' : 'Start by creating your first professional contract'}</p>
                  <Button variant="hero" size="lg" className="gap-2 shadow-lg" onClick={() => setViewSection('create')}>
                    <Plus className="w-5 h-5" />{isRTL ? 'إنشاء عقد جديد' : 'Create New Contract'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filtered.map((c) => {
                  const milestones = allMilestones.filter((m) => m.contract_id === c.id);
                  const notes = allNotes.filter((n) => n.contract_id === c.id);
                  const attachments = allAttachments.filter((a) => a.contract_id === c.id);
                  const payments = allPayments.filter((p) => p.contract_id === c.id);
                  const measurements = allMeasurements.filter((m) => m.contract_id === c.id);
                  const lineItems = allLineItems.filter((li) => li.contract_id === c.id);
                  const warranties = allWarranties.filter((w) => w.contract_id === c.id);
                  const maintenance = allMaintenanceRequests.filter((r) => r.contract_id === c.id);
                  const amendments = allAmendments.filter((a) => a.contract_id === c.id);
                  const isExpanded = expandedId === c.id;
                  const locked = isContractLocked(c);
                  const isProvider = user?.id === c.provider_id;
                  // Sourced from measurements + line_items (line_items table currently empty — see C2/C3).
                  const measurementTotal = calculateMeasurementsTotal(measurements);
                  const lineItemTotal = calculateLineItemsTotal(lineItems);
                  const subtotal = measurementTotal + lineItemTotal;
                  const _vat = calculateVatBreakdown({ amount: subtotal, vatRate: c.vat_rate, vatInclusive: c.vat_inclusive });
                  const vatRate = _vat.vatRate;
                  const vatAmount = _vat.vatAmount;
                  const grandTotal = _vat.total;

                  /* ── CT5G.2 — Derived per-line VAT breakdown (display only). ── */
                  const cTpl = (c as { template_version_id?: string | null }).template_version_id ?? null;
                  const lineVatRulesMap = cTpl ? vatHandlingByVersionMethod.get(cTpl) : undefined;
                  const resolveLineVatHandling = (method: string | null | undefined): string => {
                    const m = (method || 'unit');
                    return lineVatRulesMap?.get(m) || 'inherit';
                  };
                  const lineVatRows = lineItems.map((li) => ({
                    id: li.id,
                    breakdown: calculateLineVatBreakdown({
                      amount: li.total_cost,
                      vatHandling: resolveLineVatHandling((li as { pricing_method?: string | null }).pricing_method),
                      contractVatRate: c.vat_rate,
                      contractVatInclusive: c.vat_inclusive,
                    }),
                  }));
                  const lineVatById = new Map(lineVatRows.map(r => [r.id, r.breakdown]));
                  const lineVatTotals = sumLineVatBreakdowns(lineVatRows.map(r => r.breakdown));
                  const hasAnyLineVat = lineVatTotals.vat > 0 || lineVatRows.some(r => r.breakdown.vatHandling !== 'inherit');

                  return (
                    <div key={c.id} className="space-y-0">
                      <ContractCard
                        c={c} isRTL={isRTL} user={user} milestones={milestones} notes={notes}
                        attachments={attachments} payments={payments} measurements={measurements} profiles={profiles}
                        isExpanded={isExpanded} onExpand={setExpandedId} onNavigate={navigate}
                        onExportPDF={handleExportPDF}
                        onApprove={(contract) => setApproveConfirm(contract)}
                        onSendForApproval={(contract) => setSendConfirm(contract)}
                        onDuplicate={handleDuplicate}
                        onShare={handleShareContract}
                        onEdit={openEditContract}
                      />

                      {/* ── Expanded Detail Panel ── */}
                      {isExpanded && (
                        <Card className="border-t-0 rounded-t-none border-border/40 bg-gradient-to-b from-muted/10 to-transparent">
                          <CardContent className="p-4 sm:p-5">
                            {/* Lock Banner */}
                            {locked && (
                              <div className="flex items-center gap-2.5 p-3 mb-4 rounded-xl bg-warning/80 dark:bg-warning/20 border border-warning/60 dark:border-warning/30">
                                <Shield className="w-4 h-4 text-warning shrink-0" />
                                <p className="text-[11px] text-warning dark:text-warning">{isRTL ? 'العقد معتمد — التعديل يتطلب ملحق عقد رسمي وموافقة الطرفين' : 'Contract approved — changes require a formal amendment with both parties\' approval'}</p>
                              </div>
                            )}

                            <Tabs defaultValue="milestones">
                              <TabsList className="w-full justify-start bg-muted/40 rounded-xl p-1 h-auto flex-wrap gap-0.5 mb-4">
                                {[
                                  { value: 'milestones', icon: ListChecks, label: isRTL ? 'المراحل' : 'Milestones', count: milestones.length },
                                  { value: 'payments', icon: CreditCard, label: isRTL ? 'الدفعات' : 'Payments', count: payments.length },
                                  { value: 'measurements', icon: Ruler, label: isRTL ? 'المقاسات' : 'Sizes', count: measurements.length },
                                  { value: 'warranty', icon: ShieldCheck, label: isRTL ? 'الضمان' : 'Warranty', count: warranties.length },
                                  { value: 'maintenance', icon: WrenchIcon, label: isRTL ? 'صيانة' : 'Maint.', count: maintenance.length },
                                  { value: 'notes', icon: StickyNote, label: isRTL ? 'ملاحظات' : 'Notes', count: notes.length },
                                  { value: 'attachments', icon: Paperclip, label: isRTL ? 'مرفقات' : 'Files', count: attachments.length },
                                  { value: 'amendments', icon: FileText, label: isRTL ? 'ملاحق' : 'Amendments', count: amendments.length },
                                  { value: 'actions', icon: Zap, label: isRTL ? 'إجراءات' : 'Actions' },
                                ].map(tab => (
                                  <TabsTrigger key={tab.value} value={tab.value} className="text-[10px] px-3 py-1.5 gap-1 rounded-lg data-[state=active]:shadow-sm">
                                    <tab.icon className="w-3 h-3" />{tab.label}
                                    {tab.count !== undefined && <Badge variant="secondary" className="text-[7px] px-1 py-0 h-3.5">{tab.count}</Badge>}
                                  </TabsTrigger>
                                ))}
                              </TabsList>

                              {/* ═══ Milestones Tab ═══ */}
                              <TabsContent value="milestones" className="mt-0">
                                {!locked && isProvider && (
                                  <div className="mb-3">
                                    {showAddMilestone === c.id ? (
                                      <div className="p-4 rounded-xl border-2 border-dashed border-accent/30 bg-accent/5 space-y-3">
                                        <h4 className="text-xs font-semibold">{isRTL ? 'إضافة مرحلة جديدة' : 'Add Milestone'}</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                          <Input placeholder={isRTL ? 'اسم المرحلة' : 'Title'} value={milestoneForm.title_ar} onChange={e => setMilestoneForm(f => ({ ...f, title_ar: e.target.value }))} className="h-9 text-xs" />
                                          <Input type="number" placeholder={isRTL ? 'المبلغ' : 'Amount'} value={milestoneForm.amount} onChange={e => setMilestoneForm(f => ({ ...f, amount: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                          <Input type="date" value={milestoneForm.due_date} onChange={e => setMilestoneForm(f => ({ ...f, due_date: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                        </div>
                                        <div className="flex gap-2">
                                          <Button size="sm" className="h-8 text-xs gap-1" disabled={!milestoneForm.title_ar || !milestoneForm.amount || addMilestoneMutation.isPending} onClick={() => addMilestoneMutation.mutate({ contractId: c.id })}>
                                            {addMilestoneMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}{isRTL ? 'إضافة' : 'Add'}
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowAddMilestone(null)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowAddMilestone(c.id)}>
                                        <Plus className="w-3.5 h-3.5" />{isRTL ? 'إضافة مرحلة' : 'Add Milestone'}
                                      </Button>
                                    )}
                                  </div>
                                )}
                                {milestones.length > 0 ? (
                                  <div className="relative">
                                    <div className="absolute top-0 bottom-0 start-4 w-0.5 bg-gradient-to-b from-accent/40 via-border/40 to-transparent" />
                                    <div className="space-y-2.5">
                                      {milestones.map((m, idx) => {
                                        const mTitle = isRTL ? m.title_ar : (m.title_en || m.title_ar);
                                        const isCompleted = m.status === 'completed';
                                        const isInProgress = (m.status as string) === 'in_progress';
                                        return (
                                          <div key={m.id} className="relative ps-10">
                                            <div className={`absolute top-2 start-1 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold z-10 transition-all ${isCompleted ? 'bg-success text-success-foreground shadow-lg shadow-success/30' : isInProgress ? 'bg-accent text-accent-foreground ring-2 ring-accent/30 shadow-md' : 'bg-card text-muted-foreground border-2 border-border'}`}>
                                              {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                                            </div>
                                            <div className={`p-3 rounded-xl border transition-all ${isCompleted ? 'border-success/50 bg-success/30 dark:border-success/20 dark:bg-success/10' : isInProgress ? 'border-accent/30 bg-accent/5' : 'border-border/40 bg-card hover:border-border'}`}>
                                              <div className="flex items-center justify-between gap-2">
                                                <h4 className="font-semibold text-xs">{mTitle}</h4>
                                                <div className="flex items-center gap-1">
                                                  {isProvider && !isCompleted && (
                                                    <Select value={m.status} onValueChange={v => updateMilestoneMutation.mutate({ id: m.id, status: v })}>
                                                      <SelectTrigger className="h-6 text-[8px] w-20 px-1.5 border-0 bg-transparent"><SelectValue /></SelectTrigger>
                                                      <SelectContent>
                                                        <SelectItem value="pending" className="text-[10px]">{isRTL ? 'قادم' : 'Pending'}</SelectItem>
                                                        <SelectItem value="in_progress" className="text-[10px]">{isRTL ? 'جاري' : 'In Progress'}</SelectItem>
                                                        <SelectItem value="completed" className="text-[10px]">{isRTL ? 'مكتمل' : 'Done'}</SelectItem>
                                                      </SelectContent>
                                                    </Select>
                                                  )}
                                                  <Badge variant={isCompleted ? 'default' : isInProgress ? 'secondary' : 'outline'} className="text-[8px] shrink-0">{isCompleted ? (isRTL ? 'مكتمل' : 'Done') : isInProgress ? (isRTL ? 'جاري' : 'Progress') : (isRTL ? 'قادم' : 'Pending')}</Badge>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                                                <span className="font-medium text-foreground"><DollarSign className="w-3 h-3 inline text-accent" />{Number(m.amount).toLocaleString()} {c.currency_code}</span>
                                                {m.due_date && <span><Calendar className="w-3 h-3 inline" /> {formatDate(m.due_date)}</span>}
                                                {m.completed_at && <span className="text-success"><CheckCircle2 className="w-3 h-3 inline" /> {formatDate(m.completed_at)}</span>}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : <p className="text-center py-8 text-muted-foreground text-xs">{isRTL ? 'لا توجد مراحل بعد' : 'No milestones yet'}</p>}
                              </TabsContent>

                              {/* ═══ Payments Tab ═══ */}
                              <TabsContent value="payments" className="mt-0">
                                {isProvider && (
                                  <div className="mb-3">
                                    {showAddPayment === c.id ? (
                                      <div className="p-4 rounded-xl border-2 border-dashed border-accent/30 bg-accent/5 space-y-3">
                                        <h4 className="text-xs font-semibold">{isRTL ? 'إضافة دفعة جديدة' : 'Add Payment'}</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                          <Input type="number" placeholder={isRTL ? 'المبلغ' : 'Amount'} value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                          <Input type="date" placeholder={isRTL ? 'تاريخ الاستحقاق' : 'Due Date'} value={paymentForm.due_date} onChange={e => setPaymentForm(f => ({ ...f, due_date: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                          <Input placeholder={isRTL ? 'ملاحظات' : 'Notes'} value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} className="h-9 text-xs" />
                                        </div>
                                        <div className="flex gap-2">
                                          <Button size="sm" className="h-8 text-xs gap-1" disabled={!paymentForm.amount || !paymentForm.due_date || addPaymentMutation.isPending} onClick={() => addPaymentMutation.mutate({ contractId: c.id })}>
                                            {addPaymentMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}{isRTL ? 'إضافة' : 'Add'}
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowAddPayment(null)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowAddPayment(c.id)}>
                                        <Plus className="w-3.5 h-3.5" />{isRTL ? 'إضافة دفعة' : 'Add Payment'}
                                      </Button>
                                    )}
                                  </div>
                                )}
                                {payments.length > 0 ? (
                                  <div className="space-y-2">
                                    {payments.sort((a, b) => a.installment_number - b.installment_number).map((p) => (
                                      <div key={p.id} className={`p-3 rounded-xl border transition-all ${p.status === 'paid' ? 'border-success/50 bg-success/20 dark:border-success/20 dark:bg-success/10' : p.status === 'overdue' ? 'border-destructive/50 bg-destructive/20 dark:border-destructive/20' : 'border-border/40 bg-card'}`}>
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-bold ${p.status === 'paid' ? 'bg-success text-success-foreground' : p.status === 'overdue' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'}`}>
                                              {p.status === 'paid' ? <CheckCircle2 className="w-4 h-4" /> : p.installment_number}
                                            </div>
                                            <div>
                                              <p className="text-xs font-semibold">{isRTL ? `الدفعة ${p.installment_number}` : `Payment #${p.installment_number}`}</p>
                                              <p className="text-[10px] text-muted-foreground">{isRTL ? 'استحقاق:' : 'Due:'} {formatDate(p.due_date)}</p>
                                              {p.paid_at && <p className="text-[9px] text-success">{isRTL ? 'دفع:' : 'Paid:'} {formatDate(p.paid_at)}</p>}
                                              {p.notes && <p className="text-[9px] text-muted-foreground mt-0.5">{p.notes}</p>}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <div className="text-end">
                                              <p className="text-sm font-bold">{Number(p.amount).toLocaleString()} {c.currency_code}</p>
                                              <Badge variant={p.status === 'paid' ? 'default' : p.status === 'overdue' ? 'destructive' : 'secondary'} className="text-[8px] mt-0.5">
                                                {p.status === 'paid' ? (isRTL ? 'مدفوع' : 'Paid') : p.status === 'overdue' ? (isRTL ? 'متأخر' : 'Overdue') : (isRTL ? 'معلق' : 'Pending')}
                                              </Badge>
                                            </div>
                                            {p.status !== 'paid' && isProvider && (
                                              <Button variant="ghost" size="icon" className="h-8 w-8 text-success hover:bg-success/10 dark:hover:bg-success/20 focus-visible:ring-2 focus-visible:ring-success/40" onClick={() => markPaidMutation.mutate({ paymentId: p.id })} aria-label={isRTL ? 'تأكيد السداد' : 'Mark as paid'} title={isRTL ? 'تأكيد السداد' : 'Mark as paid'}>
                                                <Banknote className="w-4 h-4" aria-hidden="true" />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                    {/* Payment Summary */}
                                    <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] text-muted-foreground">{isRTL ? 'الإجمالي المدفوع' : 'Total Paid'}</span>
                                        <span className="text-xs font-bold text-success">{payments.filter((p)=>p.status==='paid').reduce((s:number, p)=>s+Number(p.amount),0).toLocaleString()} / {Number(c.total_amount).toLocaleString()} {c.currency_code}</span>
                                      </div>
                                      <Progress value={Number(c.total_amount) > 0 ? (payments.filter((p)=>p.status==='paid').reduce((s:number, p)=>s+Number(p.amount),0) / Number(c.total_amount)) * 100 : 0} className="h-1.5 [&>div]:bg-success" aria-label={isRTL ? 'نسبة المدفوع من إجمالي العقد' : 'Paid out of contract total'} />
                                    </div>
                                  </div>
                                ) : <p className="text-center py-8 text-muted-foreground text-xs">{isRTL ? 'لا توجد دفعات' : 'No payments yet'}</p>}
                              </TabsContent>

                              {/* ═══ Measurements & Line Items Tab ═══ */}
                              <TabsContent value="measurements" className="mt-0 space-y-4">
                                {/* Measurement Form */}
                                {!locked && isProvider && (
                                  <div className="mb-3">
                                    {showAddMeasurement === c.id ? (
                                      <div className="p-4 rounded-xl border-2 border-dashed border-accent/30 bg-accent/5 space-y-3">
                                        <h4 className="text-xs font-semibold">{isRTL ? 'إضافة قطعة مقاس' : 'Add Measurement'}</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                          <Input placeholder={isRTL ? 'اسم القطعة' : 'Piece Name'} value={measurementForm.name_ar} onChange={e => setMeasurementForm(f => ({ ...f, name_ar: e.target.value }))} className="h-9 text-xs" />
                                          <Input placeholder={isRTL ? 'رقم القطعة' : 'Piece #'} value={measurementForm.piece_number} onChange={e => setMeasurementForm(f => ({ ...f, piece_number: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                          <Select value={measurementForm.floor_label} onValueChange={v => setMeasurementForm(f => ({ ...f, floor_label: v }))}>
                                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="ground_floor">{isRTL ? 'أرضي' : 'Ground'}</SelectItem>
                                              <SelectItem value="first_floor">{isRTL ? 'أول' : '1st'}</SelectItem>
                                              <SelectItem value="second_floor">{isRTL ? 'ثاني' : '2nd'}</SelectItem>
                                              <SelectItem value="third_floor">{isRTL ? 'ثالث' : '3rd'}</SelectItem>
                                              <SelectItem value="roof">{isRTL ? 'سطح' : 'Roof'}</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <Input placeholder={isRTL ? 'الموقع' : 'Location'} value={measurementForm.location_ar} onChange={e => setMeasurementForm(f => ({ ...f, location_ar: e.target.value }))} className="h-9 text-xs" />
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                          <Input type="number" placeholder={isRTL ? 'الطول (مم)' : 'Length mm'} value={measurementForm.length_mm} onChange={e => setMeasurementForm(f => ({ ...f, length_mm: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                          <Input type="number" placeholder={isRTL ? 'العرض (مم)' : 'Width mm'} value={measurementForm.width_mm} onChange={e => setMeasurementForm(f => ({ ...f, width_mm: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                          <Input type="number" placeholder={isRTL ? 'الكمية' : 'Qty'} value={measurementForm.quantity} onChange={e => setMeasurementForm(f => ({ ...f, quantity: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                          <Input type="number" placeholder={isRTL ? 'سعر الوحدة' : 'Unit Price'} value={measurementForm.unit_price} onChange={e => setMeasurementForm(f => ({ ...f, unit_price: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                        </div>
                                        {measurementForm.length_mm && measurementForm.width_mm && measurementForm.unit_price && (
                                          <div className="flex items-center gap-4 text-[11px] p-2.5 bg-muted/40 rounded-lg border border-border/30">
                                            <span>{isRTL ? 'المساحة:' : 'Area:'} <strong className="text-accent">{((Number(measurementForm.length_mm) * Number(measurementForm.width_mm)) / 1000000).toFixed(2)} م²</strong></span>
                                            <span>{isRTL ? 'التكلفة:' : 'Cost:'} <strong className="text-accent">{(Number(measurementForm.unit_price) * Number(measurementForm.quantity || 1)).toLocaleString()} {c.currency_code}</strong></span>
                                          </div>
                                        )}
                                        <div className="flex gap-2">
                                          <Button size="sm" className="h-8 text-xs gap-1" disabled={!measurementForm.name_ar || !measurementForm.piece_number || !measurementForm.length_mm || addMeasurementMutation.isPending} onClick={() => addMeasurementMutation.mutate({ contractId: c.id })}>
                                            {addMeasurementMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}{isRTL ? 'إضافة' : 'Add'}
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowAddMeasurement(null)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowAddMeasurement(c.id)}><Plus className="w-3.5 h-3.5" />{isRTL ? 'مقاس' : 'Measurement'}</Button>
                                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowAddLineItem(c.id)}><Plus className="w-3.5 h-3.5" />{isRTL ? 'بند إضافي' : 'Line Item'}</Button>
                                        {(() => {
                                          const cv = (c as { template_version_id?: string | null }).template_version_id ?? null;
                                          const cat = cv ? (publishedVersions.find(v => v.version_id === cv)?.category ?? 'general') : 'general';
                                          return (
                                            <Button
                                              variant="outline" size="sm" className="h-8 text-xs gap-1.5"
                                              disabled={addStarterBoqMutation.isPending}
                                              onClick={() => addStarterBoqMutation.mutate({ contractId: c.id, category: cat })}
                                              title={isRTL ? 'إضافة مجموعة بنود مقترحة حسب نوع العمل' : 'Add suggested BOQ groups for this work type'}
                                            >
                                              {addStarterBoqMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardList className="w-3.5 h-3.5" />}
                                              {isRTL ? 'مجموعة بنود مقترحة' : 'Suggested BOQ'}
                                            </Button>
                                          );
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Line Item Form */}
                                {showAddLineItem === c.id && !locked && isProvider && (
                                  (() => {
                                    const cTemplateVersion = (c as { template_version_id?: string | null }).template_version_id ?? null;
                                    const templateAllowed = cTemplateVersion ? allowedMethodsByVersion.get(cTemplateVersion) : undefined;
                                    const hasAllowList = !!templateAllowed && templateAllowed.length > 0;
                                    const methodOptions = hasAllowList
                                      ? SUPPORTED_PRICING_METHODS.filter(m => templateAllowed!.includes(m))
                                      : SUPPORTED_PRICING_METHODS;
                                    // Auto-correct selected method if it's not allowed.
                                    if (hasAllowList && methodOptions.length > 0 && !methodOptions.includes(lineItemForm.pricing_method)) {
                                      // Defer state update to next tick to avoid setState-during-render warning.
                                      queueMicrotask(() => setLineItemForm(f => ({ ...f, pricing_method: methodOptions[0] })));
                                    }
                                    return (
                                  <div className="p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 space-y-3">
                                    <h4 className="text-xs font-semibold">{isRTL ? 'إضافة بند إضافي (خدمة/مادة)' : 'Add Line Item (Service/Material)'}</h4>
                                    {hasAllowList && (
                                      <p className="text-[10px] text-muted-foreground">
                                        {isRTL ? 'طرق التسعير المتاحة حسب قالب العقد.' : 'Pricing methods available per contract template.'}
                                      </p>
                                    )}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                      <Input placeholder={isRTL ? 'اسم البند' : 'Item Name'} value={lineItemForm.name_ar} onChange={e => setLineItemForm(f => ({ ...f, name_ar: e.target.value }))} className="h-9 text-xs" />
                                      <Select value={lineItemForm.item_type} onValueChange={v => setLineItemForm(f => ({ ...f, item_type: v }))}>
                                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="service">{isRTL ? 'خدمة' : 'Service'}</SelectItem>
                                          <SelectItem value="material">{isRTL ? 'مادة' : 'Material'}</SelectItem>
                                          <SelectItem value="installation">{isRTL ? 'تركيب' : 'Installation'}</SelectItem>
                                          <SelectItem value="other">{isRTL ? 'أخرى' : 'Other'}</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Select value={lineItemForm.pricing_method} onValueChange={v => setLineItemForm(f => ({ ...f, pricing_method: v as PricingMethod }))}>
                                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          {methodOptions.map(m => (
                                            <SelectItem key={m} value={m}>{formatPricingMethodLabel(m, isRTL ? 'ar' : 'en')}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      {lineItemForm.pricing_method !== 'lump_sum' && (
                                        <Input type="number" min="0" placeholder={isRTL ? 'الكمية' : 'Qty'} value={lineItemForm.quantity} onChange={e => setLineItemForm(f => ({ ...f, quantity: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                      )}
                                    </div>
                                    {/* BOQ group selector — auto-suggests pricing method when group has one. */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                      <Select
                                        value={lineItemForm.boq_group_key}
                                        onValueChange={(v) => setLineItemForm(f => {
                                          const suggested = getSuggestedPricingMethod(v) as PricingMethod | undefined;
                                          // Only auto-apply when user has not customized pricing or is still on default 'unit'.
                                          const next: typeof f = { ...f, boq_group_key: v as BoqGroupKey };
                                          if (suggested && SUPPORTED_PRICING_METHODS.includes(suggested) && f.pricing_method === 'unit') {
                                            next.pricing_method = suggested;
                                          }
                                          return next;
                                        })}
                                      >
                                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={isRTL ? 'مجموعة البند' : 'BOQ Group'} /></SelectTrigger>
                                        <SelectContent>
                                          {BOQ_GROUPS.map(g => (
                                            <SelectItem key={g.key} value={g.key}>{isRTL ? g.ar : g.en}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    {/* Conditional dimension/weight inputs per method */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                      {(lineItemForm.pricing_method === 'linear_meter' || lineItemForm.pricing_method === 'square_meter' || lineItemForm.pricing_method === 'cubic_meter') && (
                                        <Input type="number" min="0" placeholder={isRTL ? 'الطول (مم)' : 'Length (mm)'} value={lineItemForm.length_mm} onChange={e => setLineItemForm(f => ({ ...f, length_mm: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                      )}
                                      {(lineItemForm.pricing_method === 'square_meter' || lineItemForm.pricing_method === 'cubic_meter') && (
                                        <Input type="number" min="0" placeholder={isRTL ? 'العرض (مم)' : 'Width (mm)'} value={lineItemForm.width_mm} onChange={e => setLineItemForm(f => ({ ...f, width_mm: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                      )}
                                      {lineItemForm.pricing_method === 'cubic_meter' && (
                                        <Input type="number" min="0" placeholder={isRTL ? 'الارتفاع (مم)' : 'Height (mm)'} value={lineItemForm.height_mm} onChange={e => setLineItemForm(f => ({ ...f, height_mm: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                      )}
                                      {lineItemForm.pricing_method === 'kilogram' && (
                                        <Input type="number" min="0" placeholder={isRTL ? 'الوزن (كجم)' : 'Weight (kg)'} value={lineItemForm.weight_kg} onChange={e => setLineItemForm(f => ({ ...f, weight_kg: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                      )}
                                      {lineItemForm.pricing_method === 'ton' && (
                                        <Input type="number" min="0" placeholder={isRTL ? 'الوزن (طن)' : 'Weight (t)'} value={lineItemForm.weight_ton} onChange={e => setLineItemForm(f => ({ ...f, weight_ton: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                      )}
                                      {lineItemForm.pricing_method === 'lump_sum' ? (
                                        <Input type="number" min="0" placeholder={isRTL ? 'المبلغ المقطوع' : 'Lump Sum Amount'} value={lineItemForm.amount} onChange={e => setLineItemForm(f => ({ ...f, amount: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                      ) : (
                                        <Input type="number" min="0" placeholder={isRTL ? `سعر / ${formatUnitOfMeasure(lineItemForm.pricing_method)}` : `Price / ${formatUnitOfMeasure(lineItemForm.pricing_method)}`} value={lineItemForm.unit_price} onChange={e => setLineItemForm(f => ({ ...f, unit_price: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                      )}
                                    </div>
                                    <DimensionHelper
                                      isRTL={isRTL}
                                      method={lineItemForm.pricing_method}
                                      lengthMm={lineItemForm.length_mm}
                                      widthMm={lineItemForm.width_mm}
                                      heightMm={lineItemForm.height_mm}
                                      weightKg={lineItemForm.weight_kg}
                                      weightTon={lineItemForm.weight_ton}
                                      amount={lineItemForm.amount}
                                    />
                                    <Input placeholder={isRTL ? 'وصف البند (اختياري)' : 'Description (optional)'} value={lineItemForm.description_ar} onChange={e => setLineItemForm(f => ({ ...f, description_ar: e.target.value }))} className="h-9 text-xs" />
                                    {(() => {
                                      const fi: Record<string, number> = {};
                                      const set = (k: string, v: string) => { if (v !== '' && Number.isFinite(Number(v))) fi[k] = Number(v); };
                                      set('length_mm', lineItemForm.length_mm); set('width_mm', lineItemForm.width_mm); set('height_mm', lineItemForm.height_mm);
                                      set('weight_kg', lineItemForm.weight_kg); set('weight_ton', lineItemForm.weight_ton); set('amount', lineItemForm.amount);
                                      const calc = calculateLineTotal({
                                        pricing_method: lineItemForm.pricing_method,
                                        quantity: lineItemForm.quantity || 1,
                                        unit_price: lineItemForm.unit_price || 0,
                                        formula_inputs: fi,
                                      });
                                      if (calc.ok && calc.total > 0) {
                                        return <p className="text-[11px] text-muted-foreground">{isRTL ? 'التكلفة:' : 'Cost:'} <strong className="text-accent">{calc.total.toLocaleString()} {c.currency_code}</strong></p>;
                                      }
                                      if (!calc.ok && calc.errorCode === 'negative_value') {
                                        return <p className="text-[11px] text-destructive">{isRTL ? 'لا يمكن إدخال قيم سالبة' : 'Negative values not allowed'}</p>;
                                      }
                                      if (!calc.ok && calc.errorCode === 'value_too_large') {
                                        return <p className="text-[11px] text-destructive">{isRTL ? 'القيم كبيرة جداً' : 'Values are too large'}</p>;
                                      }
                                      return null;
                                    })()}
                                    <div className="flex gap-2">
                                      {(() => {
                                        const fi: Record<string, number> = {};
                                        const set = (k: string, v: string) => { if (v !== '' && Number.isFinite(Number(v))) fi[k] = Number(v); };
                                        set('length_mm', lineItemForm.length_mm); set('width_mm', lineItemForm.width_mm); set('height_mm', lineItemForm.height_mm);
                                        set('weight_kg', lineItemForm.weight_kg); set('weight_ton', lineItemForm.weight_ton); set('amount', lineItemForm.amount);
                                        const calc = calculateLineTotal({
                                          pricing_method: lineItemForm.pricing_method,
                                          quantity: lineItemForm.quantity || 1,
                                          unit_price: lineItemForm.unit_price || 0,
                                          formula_inputs: fi,
                                        });
                                        const disabled = !lineItemForm.name_ar || !calc.ok || calc.total <= 0 || addLineItemMutation.isPending;
                                        return (
                                          <Button size="sm" className="h-8 text-xs gap-1" disabled={disabled} onClick={() => addLineItemMutation.mutate({ contractId: c.id })}>
                                            {addLineItemMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}{isRTL ? 'إضافة' : 'Add'}
                                          </Button>
                                        );
                                      })()}
                                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowAddLineItem(null)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                                    </div>
                                  </div>
                                    );
                                  })()
                                )}

                                {/* Measurements List */}
                                {measurements.length > 0 && (
                                  <div className="space-y-2">
                                    <h5 className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1"><Ruler className="w-3 h-3" />{isRTL ? 'المقاسات' : 'Measurements'}</h5>
                                    {measurements.map((m) => (
                                      <div key={m.id} className="p-3 rounded-xl bg-card border border-border/30 flex items-center justify-between gap-3 hover:border-accent/20 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                          <Badge variant="outline" className="text-[9px] shrink-0 font-mono px-2 py-0.5">{m.piece_number}</Badge>
                                          <div className="min-w-0">
                                            <p className="text-xs font-medium truncate">{isRTL ? m.name_ar : (m.name_en || m.name_ar)}</p>
                                            <p className="text-[9px] text-muted-foreground">{m.floor_label} • {isRTL ? m.location_ar : (m.location_en || m.location_ar)} • {isRTL ? 'كمية:' : 'Qty:'} {m.quantity}</p>
                                          </div>
                                        </div>
                                        <div className="text-end shrink-0">
                                          <p className="text-[10px] font-mono text-muted-foreground">{m.length_mm}×{m.width_mm} mm</p>
                                          <p className="text-xs font-bold">{Number(m.total_cost || 0).toLocaleString()} {c.currency_code}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Line Items List */}
                                {lineItems.length > 0 && (
                                  <div className="space-y-2">
                                    {(() => {
                                      const typeLabels: Record<string, string> = { service: isRTL ? 'خدمة' : 'Service', material: isRTL ? 'مادة' : 'Material', installation: isRTL ? 'تركيب' : 'Install', other: isRTL ? 'أخرى' : 'Other' };
                                      const groups = groupLineItemsByBoqGroup(lineItems);
                                      const mixed = hasMixedPricing(lineItems);
                                      const methodsUsed = listPricingMethodsUsed(lineItems);
                                      return (
                                        <>
                                          <div className="flex items-center justify-between flex-wrap gap-2">
                                            <h5 className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                                              <ClipboardList className="w-3 h-3" />{isRTL ? 'بنود إضافية' : 'Additional Items'}
                                            </h5>
                                            {mixed && (
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <Badge variant="outline" className="text-[9px] border-accent/40 text-accent">
                                                  {isRTL ? 'تسعير مختلط' : 'Mixed pricing'}
                                                </Badge>
                                                <span className="text-[9px] text-muted-foreground">
                                                  {methodsUsed.map(m => formatPricingMethodLabel(m, isRTL ? 'ar' : 'en')).join(' • ')}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                          {groups.map((g) => (
                                            <div key={g.key} className="space-y-1.5">
                                              <div className="flex items-center justify-between px-2">
                                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                                                  {isRTL ? g.label_ar : g.label_en}
                                                </span>
                                                <span className="text-[10px] font-bold text-accent">
                                                  {g.subtotal.toLocaleString()} {c.currency_code}
                                                </span>
                                              </div>
                                              {(() => {
                                                const groupVat = sumLineVatBreakdowns(
                                                  g.items.map(it => lineVatById.get(it.id)).filter((b): b is NonNullable<typeof b> => !!b)
                                                );
                                                if (groupVat.vat <= 0 && groupVat.gross <= 0) return null;
                                                return (
                                                  <div className="px-2 flex items-center justify-end gap-3 text-[9px] text-muted-foreground">
                                                    <span>{isRTL ? 'الصافي' : 'Net'}: <span className="font-mono text-foreground/80">{groupVat.net.toLocaleString()}</span></span>
                                                    <span>{isRTL ? 'الضريبة' : 'VAT'}: <span className="font-mono text-foreground/80">{groupVat.vat.toLocaleString()}</span></span>
                                                    <span>{isRTL ? 'الإجمالي' : 'Gross'}: <span className="font-mono text-accent">{groupVat.gross.toLocaleString()}</span></span>
                                                  </div>
                                                );
                                              })()}
                                              {g.items.map((li) => (
                                                <div key={li.id} className="p-3 rounded-xl bg-card border border-border/30 flex items-center justify-between gap-3 hover:border-primary/20 transition-colors">
                                                  <div className="flex items-center gap-3 min-w-0">
                                                    <Badge variant="secondary" className="text-[8px] shrink-0">{typeLabels[li.item_type] || li.item_type}</Badge>
                                                    <div className="min-w-0">
                                                      <p className="text-xs font-medium truncate">{li.name_ar}</p>
                                                      {li.description_ar && <p className="text-[9px] text-muted-foreground truncate">{li.description_ar}</p>}
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <div className="text-end shrink-0">
                                                      <p className="text-[10px] text-muted-foreground">
                                                        {li.pricing_method && li.pricing_method !== 'unit' ? `${formatPricingMethodLabel(li.pricing_method, isRTL ? 'ar' : 'en')} • ` : ''}
                                                        {li.quantity} × {Number(li.unit_price).toLocaleString()}
                                                      </p>
                                                      <p className="text-xs font-bold">{Number(li.total_cost || 0).toLocaleString()} {c.currency_code}</p>
                                                      {(() => {
                                                        const b = lineVatById.get(li.id);
                                                        if (!b) return null;
                                                        const handlingLabel = formatVatHandlingLabel(b.vatHandling, isRTL ? 'ar' : 'en');
                                                        if (b.vatHandling === 'exempt' || b.vat <= 0) {
                                                          return <p className="text-[9px] text-muted-foreground mt-0.5">{handlingLabel}</p>;
                                                        }
                                                        return (
                                                          <p className="text-[9px] text-muted-foreground mt-0.5 font-mono">
                                                            {handlingLabel} • {isRTL ? 'صافي' : 'Net'} {b.net.toLocaleString()} • {isRTL ? 'ض' : 'VAT'} {b.vat.toLocaleString()}
                                                          </p>
                                                        );
                                                      })()}
                                                    </div>
                                                    {!locked && isProvider && (
                                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive/40" onClick={() => deleteLineItemMutation.mutate({ id: li.id, contractId: c.id })} aria-label={isRTL ? 'حذف البند' : 'Delete line item'} title={isRTL ? 'حذف البند' : 'Delete line item'}>
                                                        <X className="w-3 h-3" aria-hidden="true" />
                                                      </Button>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ))}
                                        </>
                                      );
                                    })()}
                                  </div>
                                )}

                                {measurements.length === 0 && lineItems.length === 0 && <p className="text-center py-8 text-muted-foreground text-xs">{isRTL ? 'لا توجد مقاسات أو بنود' : 'No measurements or items'}</p>}

                                {/* Financial Summary with VAT */}
                                {(measurements.length > 0 || lineItems.length > 0) && (
                                  <div className="p-4 rounded-xl bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 space-y-2">
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="text-muted-foreground">{isRTL ? 'المقاسات' : 'Measurements'} ({measurements.length})</span>
                                      <span className="font-semibold">{measurementTotal.toLocaleString()} {c.currency_code}</span>
                                    </div>
                                    {lineItems.length > 0 && (
                                      <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-muted-foreground">{isRTL ? 'بنود إضافية' : 'Line Items'} ({lineItems.length})</span>
                                        <span className="font-semibold">{lineItemTotal.toLocaleString()} {c.currency_code}</span>
                                      </div>
                                    )}
                                    <Separator className="my-1" />
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="text-muted-foreground">{isRTL ? 'المجموع الفرعي' : 'Subtotal'}</span>
                                      <span className="font-bold">{subtotal.toLocaleString()} {c.currency_code}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="text-muted-foreground flex items-center gap-1"><Percent className="w-3 h-3" />{isRTL ? `ضريبة القيمة المضافة (${vatRate}%)` : `VAT (${vatRate}%)`} {c.vat_inclusive ? (isRTL ? '(شاملة)' : '(incl.)') : ''}</span>
                                      <span className="font-semibold">{vatAmount.toFixed(2)} {c.currency_code}</span>
                                    </div>
                                    <Separator className="my-1" />
                                    <div className="flex items-center justify-between text-sm font-bold text-accent">
                                      <span>{isRTL ? 'الإجمالي النهائي' : 'Grand Total'}</span>
                                      <span>{grandTotal.toLocaleString()} {c.currency_code}</span>
                                    </div>
                                  </div>
                                )}

                                {/* CT5G.2 — Derived per-line/per-group VAT breakdown (display only). */}
                                {lineItems.length > 0 && (
                                  <div className="p-3 rounded-xl bg-muted/30 border border-border/30 space-y-1.5">
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                      <span className="font-semibold">{isRTL ? 'تفصيل ضريبة البنود (تقديري للعرض فقط)' : 'Line VAT Breakdown (display only)'}</span>
                                    </div>
                                    {hasAnyLineVat ? (
                                      <>
                                        <div className="flex items-center justify-between text-[11px]">
                                          <span className="text-muted-foreground">{isRTL ? 'إجمالي الصافي' : 'Total Net'}</span>
                                          <span className="font-mono">{lineVatTotals.net.toLocaleString()} {c.currency_code}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px]">
                                          <span className="text-muted-foreground">{isRTL ? 'إجمالي الضريبة' : 'Total VAT'}</span>
                                          <span className="font-mono">{lineVatTotals.vat.toLocaleString()} {c.currency_code}</span>
                                        </div>
                                        <Separator className="my-1" />
                                        <div className="flex items-center justify-between text-[11px] font-semibold">
                                          <span>{isRTL ? 'الإجمالي شامل الضريبة' : 'Total Gross'}</span>
                                          <span className="font-mono">{lineVatTotals.gross.toLocaleString()} {c.currency_code}</span>
                                        </div>
                                      </>
                                    ) : (
                                      <p className="text-[10px] text-muted-foreground">{isRTL ? 'لا توجد ضريبة على البنود' : 'No VAT applied to line items'}</p>
                                    )}
                                  </div>
                                )}
                              </TabsContent>

                              {/* ═══ Warranty Tab ═══ */}
                              <TabsContent value="warranty" className="mt-0">
                                {warranties.length > 0 ? (
                                  <div className="space-y-2.5">
                                    {warranties.map((w) => {
                                      const daysLeft = w.end_date ? Math.ceil((new Date(w.end_date).getTime() - Date.now()) / (1000*60*60*24)) : null;
                                      return (
                                        <div key={w.id} className="p-3.5 rounded-xl border border-border/40 bg-card">
                                          <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-xs font-semibold flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-success" />{isRTL ? (w.title_ar || 'شهادة الضمان') : (w.title_en || w.title_ar || 'Warranty')}</h4>
                                            {daysLeft !== null && (
                                              <Badge variant={daysLeft > 90 ? 'default' : daysLeft > 0 ? 'secondary' : 'destructive'} className="text-[9px]">
                                                {daysLeft > 0 ? (isRTL ? `${daysLeft} يوم` : `${daysLeft}d`) : (isRTL ? 'منتهي' : 'Expired')}
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                                            <div><span className="text-muted-foreground">{isRTL ? 'البداية:' : 'Start:'}</span> {formatDate(w.start_date)}</div>
                                            <div><span className="text-muted-foreground">{isRTL ? 'النهاية:' : 'End:'}</span> {formatDate(w.end_date)}</div>
                                          </div>
                                          {(w as any).coverage_description_ar && <p className="text-[10px] text-muted-foreground mt-2 line-clamp-2">{isRTL ? (w as any).coverage_description_ar : ((w as any).coverage_description_en || (w as any).coverage_description_ar)}</p>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : <p className="text-center py-8 text-muted-foreground text-xs">{isRTL ? 'لا يوجد ضمان' : 'No warranty'}</p>}
                              </TabsContent>

                              {/* ═══ Maintenance Tab ═══ */}
                              <TabsContent value="maintenance" className="mt-0">
                                {maintenance.length > 0 ? (
                                  <div className="space-y-2">
                                    {maintenance.map((r) => (
                                      <div key={r.id} className="p-3 rounded-xl border border-border/40 bg-card">
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                          <h4 className="text-xs font-semibold truncate">{isRTL ? r.title_ar : (r.title_en || r.title_ar)}</h4>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <Badge variant={r.priority === 'urgent' ? 'destructive' : 'outline'} className="text-[8px]">{r.priority}</Badge>
                                            <Badge variant={r.status === 'completed' ? 'default' : 'secondary'} className="text-[8px]">{r.status}</Badge>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                          <span className="font-mono">{r.request_number}</span>
                                          {r.scheduled_date && <span><Calendar className="w-3 h-3 inline" /> {formatDate(r.scheduled_date)}</span>}
                                        </div>
                                        {r.description_ar && <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-2">{isRTL ? r.description_ar : (r.description_en || r.description_ar)}</p>}
                                      </div>
                                    ))}
                                  </div>
                                ) : <p className="text-center py-8 text-muted-foreground text-xs">{isRTL ? 'لا توجد طلبات صيانة' : 'No maintenance requests'}</p>}
                              </TabsContent>

                              {/* ═══ Notes Tab ═══ */}
                              <TabsContent value="notes" className="mt-0">
                                <div className="flex gap-2 mb-3">
                                  <Input placeholder={isRTL ? 'اكتب ملاحظة...' : 'Write a note...'} value={expandedId === c.id ? noteText : ''} onChange={e => setNoteText(e.target.value)} className="text-xs h-9" />
                                  <Button variant="default" size="sm" className="h-9 gap-1.5 text-xs shrink-0" disabled={!noteText.trim() || addNoteMutation.isPending} onClick={() => addNoteMutation.mutate({ contractId: c.id, content: noteText })}>
                                    {addNoteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}{isRTL ? 'إرسال' : 'Send'}
                                  </Button>
                                </div>
                                {notes.length > 0 ? (
                                  <div className="space-y-2 max-h-52 overflow-y-auto">
                                    {notes.map((n) => (
                                      <div key={n.id} className="p-3 rounded-xl bg-card border border-border/30">
                                        <div className="flex items-center justify-between mb-1">
                                          <div className="flex items-center gap-1.5">
                                            <Avatar className="w-5 h-5">
                                              <AvatarFallback className="text-[7px] bg-accent/10">{(profiles.find((p) => p.user_id === n.user_id)?.full_name || '?').charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-[10px] font-medium">{n.user_id === user?.id ? (isRTL ? 'أنت' : 'You') : (profiles.find((p) => p.user_id === n.user_id)?.full_name || '-')}</span>
                                            {n.note_type !== 'note' && <Badge variant="outline" className="text-[7px] px-1 h-3.5">{n.note_type}</Badge>}
                                          </div>
                                          <span className="text-[9px] text-muted-foreground">{formatDate(n.created_at)}</span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">{n.content}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : <p className="text-center py-8 text-muted-foreground text-xs">{isRTL ? 'لا توجد ملاحظات' : 'No notes yet'}</p>}
                              </TabsContent>

                              {/* ═══ Attachments Tab ═══ */}
                              <TabsContent value="attachments" className="mt-0">
                                <div className="mb-3">
                                  <input type="file" ref={fileInputRef} className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file && uploadingContractId) uploadAttachmentMutation.mutate({ contractId: uploadingContractId, file }); e.target.value = ''; }} />
                                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" disabled={uploadAttachmentMutation.isPending} onClick={() => { setUploadingContractId(c.id); fileInputRef.current?.click(); }}>
                                    {uploadAttachmentMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                    {isRTL ? 'رفع مرفق' : 'Upload File'}
                                  </Button>
                                </div>
                                {attachments.length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {attachments.map((a) => (
                                      <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer" className="p-3 rounded-xl border border-border/40 bg-card hover:border-accent/30 hover:shadow-sm transition-all flex items-center gap-3 group">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg ${a.file_type === 'image' ? 'bg-info/10' : 'bg-urgent/10'}`}>
                                          {a.file_type === 'image' ? '🖼️' : '📄'}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-[11px] font-medium truncate group-hover:text-accent transition-colors">{a.file_name}</p>
                                          <p className="text-[9px] text-muted-foreground">{formatDate(a.created_at)}</p>
                                        </div>
                                        <Download className="w-3.5 h-3.5 text-muted-foreground shrink-0 group-hover:text-accent transition-colors" />
                                      </a>
                                    ))}
                                  </div>
                                ) : <p className="text-center py-8 text-muted-foreground text-xs">{isRTL ? 'لا توجد مرفقات' : 'No attachments'}</p>}
                              </TabsContent>

                              {/* ═══ Amendments Tab ═══ */}
                              <TabsContent value="amendments" className="mt-0">
                                {locked && (
                                  <div className="mb-3">
                                    {showAddAmendment === c.id ? (
                                      <div className="p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 space-y-3">
                                        <h4 className="text-xs font-semibold">{isRTL ? 'طلب ملحق عقد' : 'Request Amendment'}</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                          <Input placeholder={isRTL ? 'عنوان التعديل' : 'Amendment title'} value={amendmentForm.title_ar} onChange={e => setAmendmentForm(f => ({ ...f, title_ar: e.target.value }))} className="h-9 text-xs" />
                                          <Select value={amendmentForm.amendment_type} onValueChange={v => setAmendmentForm(f => ({ ...f, amendment_type: v }))}>
                                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="scope_change">{isRTL ? 'تعديل نطاق العمل' : 'Scope Change'}</SelectItem>
                                              <SelectItem value="financial">{isRTL ? 'تعديل مالي' : 'Financial'}</SelectItem>
                                              <SelectItem value="extension">{isRTL ? 'تمديد المدة' : 'Extension'}</SelectItem>
                                              <SelectItem value="other">{isRTL ? 'أخرى' : 'Other'}</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <Textarea placeholder={isRTL ? 'وصف التعديل المطلوب...' : 'Describe the amendment...'} value={amendmentForm.description_ar} onChange={e => setAmendmentForm(f => ({ ...f, description_ar: e.target.value }))} rows={2} className="text-xs" />
                                        {amendmentForm.amendment_type === 'financial' && (
                                          <Input type="number" placeholder={isRTL ? 'المبلغ الجديد' : 'New Amount'} value={amendmentForm.new_amount} onChange={e => setAmendmentForm(f => ({ ...f, new_amount: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                        )}
                                        <div className="flex gap-2">
                                          <Button size="sm" className="h-8 text-xs gap-1" disabled={!amendmentForm.title_ar || addAmendmentMutation.isPending} onClick={() => addAmendmentMutation.mutate({ contractId: c.id })}>
                                            {addAmendmentMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}{isRTL ? 'إرسال الطلب' : 'Submit'}
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowAddAmendment(null)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowAddAmendment(c.id)}>
                                        <Plus className="w-3.5 h-3.5" />{isRTL ? 'طلب ملحق عقد' : 'Request Amendment'}
                                      </Button>
                                    )}
                                  </div>
                                )}
                                {!locked && <p className="text-center py-4 text-muted-foreground text-[11px]">{isRTL ? 'العقد لم يُعتمد بعد — يمكنك تعديله مباشرة' : 'Contract not yet approved — you can edit it directly'}</p>}
                                {amendments.length > 0 ? (
                                  <div className="space-y-2">
                                    {amendments.map((a) => {
                                      const canApproveAmendment = a.status === 'pending' && (
                                        (user?.id === c.client_id && !a.client_approved_at) ||
                                        (user?.id === c.provider_id && !a.provider_approved_at)
                                      );
                                      const typeLabels: Record<string, string> = { scope_change: isRTL ? 'نطاق العمل' : 'Scope', financial: isRTL ? 'مالي' : 'Financial', extension: isRTL ? 'تمديد' : 'Extension', other: isRTL ? 'أخرى' : 'Other' };
                                      return (
                                        <div key={a.id} className={`p-3.5 rounded-xl border ${a.status === 'approved' ? 'border-success/50 bg-success/20 dark:border-success/20 dark:bg-success/10' : a.status === 'rejected' ? 'border-destructive/50 bg-destructive/20' : 'border-warning/50 bg-warning/20 dark:border-warning/20'}`}>
                                          <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <h4 className="text-xs font-semibold truncate">{a.title_ar}</h4>
                                            <div className="flex items-center gap-1 shrink-0">
                                              <Badge variant="outline" className="text-[8px]">{typeLabels[a.amendment_type] || a.amendment_type}</Badge>
                                              <Badge variant={a.status === 'approved' ? 'default' : a.status === 'rejected' ? 'destructive' : 'secondary'} className="text-[8px]">
                                                {a.status === 'approved' ? (isRTL ? 'معتمد' : 'Approved') : a.status === 'rejected' ? (isRTL ? 'مرفوض' : 'Rejected') : (isRTL ? 'بانتظار' : 'Pending')}
                                              </Badge>
                                            </div>
                                          </div>
                                          {a.description_ar && <p className="text-[10px] text-muted-foreground mb-2">{a.description_ar}</p>}
                                          <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
                                            {a.new_amount && <span className="font-medium">{isRTL ? 'المبلغ الجديد:' : 'New:'} {Number(a.new_amount).toLocaleString()} {c.currency_code}</span>}
                                            <span>{isRTL ? 'العميل:' : 'Client:'} {a.client_approved_at ? '✅' : '⏳'}</span>
                                            <span>{isRTL ? 'المزود:' : 'Provider:'} {a.provider_approved_at ? '✅' : '⏳'}</span>
                                            <span>{formatDate(a.created_at)}</span>
                                          </div>
                                          {canApproveAmendment && (
                                            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 mt-2.5 text-success border-success hover:bg-success" onClick={() => approveAmendmentMutation.mutate({ amendmentId: a.id, contract: c })}>
                                              <CircleCheck className="w-3.5 h-3.5" />{isRTL ? 'موافقة على الملحق' : 'Approve Amendment'}
                                            </Button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : locked && <p className="text-center py-4 text-muted-foreground text-xs">{isRTL ? 'لا توجد ملاحق بعد' : 'No amendments yet'}</p>}
                              </TabsContent>

                              {/* ═══ Actions Tab ═══ */}
                              <TabsContent value="actions" className="mt-0">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                  {[
                                    { icon: Download, label: isRTL ? 'تصدير PDF' : 'Export PDF', onClick: () => handleExportPDF(c), disabled: isExporting, show: true },
                                    { icon: Copy, label: isRTL ? 'نسخ العقد' : 'Duplicate', onClick: () => handleDuplicate(c), show: true },
                                    { icon: Share2, label: isRTL ? 'مشاركة' : 'Share', onClick: () => handleShareContract(c), show: true },
                                    { icon: Send, label: isRTL ? 'إرسال للمراجعة' : 'Send for Review', onClick: () => setSendConfirm(c), show: c.status === 'draft' && user?.id === c.provider_id, className: 'text-primary border-primary/30' },
                                    { icon: CircleCheck, label: isRTL ? 'موافقة' : 'Approve', onClick: () => setApproveConfirm(c), show: ((user?.id === c.client_id && !c.client_accepted_at) || (user?.id === c.provider_id && !c.provider_accepted_at)) && c.status !== 'completed' && c.status !== 'cancelled', className: 'text-success border-success' },
                                    { icon: Edit3, label: isRTL ? 'تعديل' : 'Edit', onClick: () => openEditContract(c), show: !locked && user?.id === c.provider_id },
                                    { icon: FileText, label: isRTL ? 'طلب ملحق' : 'Amendment', onClick: () => setShowAddAmendment(c.id), show: locked, className: 'text-warning border-warning' },
                                    { icon: ExternalLink, label: isRTL ? 'عرض كامل' : 'Full View', onClick: () => navigate(`/contracts/${c.id}`), show: true },
                                  ].filter(a => a.show).map((action, i) => (
                                    <Button key={i} variant="outline" size="sm" className={`gap-2 text-xs h-10 ${action.className || ''}`} onClick={action.onClick} disabled={action.disabled}>
                                      <action.icon className="w-4 h-4" />{action.label}
                                    </Button>
                                  ))}
                                </div>
                              </TabsContent>
                            </Tabs>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Approve Confirmation */}
      <AlertDialog open={!!approveConfirm} onOpenChange={() => setApproveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? 'الموافقة على العقد' : 'Approve Contract'}</AlertDialogTitle>
            <AlertDialogDescription>{isRTL ? 'هل تريد الموافقة على هذا العقد؟ هذا الإجراء لا يمكن التراجع عنه.' : 'Approve this contract? This action cannot be undone.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction className="bg-success text-success-foreground hover:bg-success/90" onClick={() => approveConfirm && approveMutation.mutate(approveConfirm)}>
              <CircleCheck className="w-4 h-4 me-2" />{isRTL ? 'موافقة' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Confirmation */}
      <AlertDialog open={!!sendConfirm} onOpenChange={() => setSendConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? 'إرسال العقد للمراجعة' : 'Send for Review'}</AlertDialogTitle>
            <AlertDialogDescription>{isRTL ? 'سيتم إرسال إشعار للعميل لمراجعة العقد والموافقة عليه.' : 'A notification will be sent to the client to review and approve.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={() => sendConfirm && sendForApprovalMutation.mutate(sendConfirm)}>
              <Send className="w-4 h-4 me-2" />{isRTL ? 'إرسال' : 'Send'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default DashboardContracts;
