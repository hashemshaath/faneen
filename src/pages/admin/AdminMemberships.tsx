import { pickBi } from '@/components/common/Bilingual';
import React, { useState, useMemo, useCallback, useTransition } from 'react';
import type { Database } from '@/integrations/supabase/types';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ReferenceBadge } from '@/components/reference/ReferenceBadge';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { listAdminBusinesses, listBusinessesByIds } from '@/modules/businesses';
import { listProfilesByUserIds } from '@/modules/users';
import {
  cancelSubscription,
  adminUpgradeSubscription,
  subscribeToPlan,
  listAdminMembershipPlans,
  listAdminMembershipSubscriptions,
  adminListMembershipUsage,
  insertMembershipPlan,
  updateMembershipPlanById,
} from '@/modules/memberships';
import { sendTransactionalEmail } from '@/modules/notifications/services/sendTransactionalEmail';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Crown, Pencil, Loader2, Users, CreditCard, X, Check, Save,
  Zap, Building2, AlertTriangle, Clock, Ban,
  RefreshCw, BarChart3, Search, UserCheck, CalendarDays, DollarSign, Shield, ArrowUpCircle,
  Download, Hash, Activity, Layers, Settings2, Eye, Sparkles, Plus, Lock,
} from 'lucide-react';
import { TIERS, tierIcons, tierColors, statusConfig } from '@/lib/membership-tiers';
import { LIMIT_FIELDS, LIMIT_CATEGORIES, parseLimits, limitsToJson, getExtraLimitKeys } from '@/lib/membership-limits';
import { AdminUpgradeRequestsPanel } from '@/components/membership/AdminUpgradeRequestsPanel';
import { AdminPromoCodesPanel } from '@/components/membership/AdminPromoCodesPanel';
import { AdminKpiCard } from '@/components/admin/AdminKpiCard';

import { useNoIndex } from "@/hooks/useNoIndex";
type Tab = 'overview' | 'plans' | 'subscriptions' | 'requests' | 'businesses' | 'usage';

/* ─── Admin Memberships local types (no `any`) ─── */
type AdminMembershipPlanRow = Database['public']['Tables']['membership_plans']['Row'];
type AdminMembershipSubscriptionRow = Database['public']['Tables']['membership_subscriptions']['Row'];

type AdminMembershipLimitsInput = Record<string, unknown> | undefined;

interface AdminMembershipSubscriptionWithPlan extends AdminMembershipSubscriptionRow {
  plan: { name_ar: string | null; name_en: string | null; tier: string | null } | null;
}

type AdminMembershipProfileLite = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  membership_tier: string | null;
};

type AdminMembershipBusinessLite = {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  membership_tier: string | null;
  logo_url: string | null;
  is_verified: boolean | null;
  is_active: boolean | null;
};

interface AdminMembershipEnrichedSubscription extends AdminMembershipSubscriptionWithPlan {
  profile: AdminMembershipProfileLite | null;
  business: AdminMembershipBusinessLite | null;
}

/**
 * Editing state shape used by the inline plan form.
 * - On edit: a full plan row is loaded.
 * - On create: only `tier` + `_new: true` are set, the form fields drive the rest.
 */
type AdminMembershipEditingPlan = Partial<AdminMembershipPlanRow> & {
  tier: AdminMembershipPlanRow['tier'];
  _new?: boolean;
};

interface AdminMembershipPlanCardProps {
  plan: AdminMembershipPlanRow;
  isRTL: boolean;
  language: string;
  subsCount: number;
  onEdit: (p: AdminMembershipPlanRow) => void;
}

interface AdminMembershipSubRowProps {
  sub: AdminMembershipEnrichedSubscription;
  isRTL: boolean;
  language: string;
  plans: AdminMembershipPlanRow[];
  onCancel: (id: string) => void;
  onRenew: (sub: AdminMembershipEnrichedSubscription) => void;
  onUpgrade: (sub: AdminMembershipEnrichedSubscription) => void;
}

/* ─── Admin Usage Report ─── */
type UsageReportRow = {
  business_id: string;
  business_name_ar: string | null;
  business_name_en: string | null;
  owner_user_id: string;
  tier: string | null;
  metric: string;
  used: number;
  limit_value: number;
  period: string;
  near_cap: boolean;
  over_limit: boolean;
};

/* ─── Plan Card ─── */
/* ─── Integrated Command Hub: Plan Card ─── */
const PLAN_TIER_RAIL: Record<string, string> = {
  free: 'border-e-muted-foreground/40',
  basic: 'border-e-info',
  premium: 'border-e-accent',
  enterprise: 'border-e-secondary',
};
const PLAN_TIER_PROGRESS: Record<string, string> = {
  free: 'bg-muted-foreground/40',
  basic: 'bg-info',
  premium: 'bg-accent',
  enterprise: 'bg-secondary',
};

const PlanCard = React.memo(({ plan, isRTL, language, subsCount, onEdit }: AdminMembershipPlanCardProps) => {
  const Icon = tierIcons[plan.tier] || Zap;
  const colors = tierColors[plan.tier] || tierColors.free;
  const features = Array.isArray(plan.features) ? plan.features : [];
  const limits = parseLimits(plan.limits as AdminMembershipLimitsInput);
  const extraKeys = getExtraLimitKeys(plan.limits as AdminMembershipLimitsInput);
  const enabledBoolLimits = LIMIT_FIELDS.filter(f => f.type === 'boolean' && limits[f.key] === true).length;
  const totalBoolLimits = LIMIT_FIELDS.filter(f => f.type === 'boolean').length;
  const benefitPct = totalBoolLimits > 0 ? Math.round((enabledBoolLimits / totalBoolLimits) * 100) : 0;
  const savingPct = plan.price_monthly > 0 && plan.price_yearly > 0
    ? Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100) : 0;

  const isPremium = plan.tier === 'premium';
  const isFree = plan.price_monthly === 0 && plan.price_yearly === 0;
  const tierName = isRTL ? plan.name_ar : plan.name_en;
  const tierDesc = isRTL ? plan.description_ar : plan.description_en;

  return (
    <Card className={cn(
      'group relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm',
      'border-e-4 transition-all hover:shadow-md hover:-translate-y-0.5',
      PLAN_TIER_RAIL[plan.tier] || PLAN_TIER_RAIL.free,
      !plan.is_active && 'opacity-70',
    )}>
      {/* Popular ribbon */}
      {isPremium && (
        <div className="absolute top-3 start-3 z-10">
          <div className="bg-accent text-accent-foreground text-[9px] font-bold px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            {pickBi(isRTL, 'الأكثر شعبية', 'Most Popular')}
          </div>
        </div>
      )}
      {!plan.is_active && (
        <div className="absolute top-3 start-3 z-10 bg-destructive/10 text-destructive text-[9px] font-bold px-2 py-0.5 rounded-md border border-destructive/20">
          {pickBi(isRTL, 'معطّلة', 'Inactive')}
        </div>
      )}

      <CardContent className="p-5 space-y-4">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', colors.badge)}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-bold text-base leading-tight truncate">{tierName}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn('text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded', colors.badge)}>
                  {plan.tier}
                </span>
                <span className="text-[10px] text-muted-foreground tech-content">{plan.currency_code}</span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-muted shrink-0"
            onClick={() => onEdit(plan)}
            aria-label={pickBi(isRTL, 'تعديل الخطة', 'Edit plan')}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* ── Description (one line) ── */}
        {tierDesc && (
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 min-h-[2rem]">{tierDesc}</p>
        )}

        {/* ── Pricing hero ── */}
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5">
          {isFree ? (
            <div className="flex items-baseline justify-between">
              <span className={cn('text-3xl font-bold leading-none tech-content', colors.text)}>
                {pickBi(isRTL, 'مجاناً', 'Free')}
              </span>
              <span className="text-[10px] text-muted-foreground">{pickBi(isRTL, 'بدون التزام', 'No commitment')}</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-baseline gap-1.5">
                <span className={cn('text-3xl font-bold leading-none tech-content tabular-nums', colors.text)}>
                  {plan.price_monthly}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">{plan.currency_code}</span>
                <span className="text-[10px] text-muted-foreground">/ {pickBi(isRTL, 'شهر', 'mo')}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                <span className="tech-content tabular-nums">
                  {plan.price_yearly > 0
                    ? `${plan.price_yearly} ${plan.currency_code} / ${pickBi(isRTL, 'سنة', 'yr')}`
                    : (pickBi(isRTL, 'بدون خطة سنوية', 'No yearly'))}
                </span>
                {savingPct > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-success/10 text-success border border-success/20">
                    -{savingPct}%
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Metric chips ── */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 bg-background">
            <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <div className={cn('text-sm font-bold leading-none tabular-nums', subsCount > 0 ? colors.text : 'text-muted-foreground')}>
                {subsCount}
              </div>
              <div className="text-[9px] text-muted-foreground mt-0.5 truncate">{pickBi(isRTL, 'مشترك', 'Subscribers')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 bg-background">
            <Settings2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <div className={cn('text-sm font-bold leading-none tabular-nums', enabledBoolLimits > 0 ? colors.text : 'text-muted-foreground')}>
                {enabledBoolLimits}<span className="text-muted-foreground font-normal">/{totalBoolLimits}</span>
              </div>
              <div className="text-[9px] text-muted-foreground mt-0.5 truncate">{pickBi(isRTL, 'مزايا مفعّلة', 'Benefits on')}</div>
            </div>
          </div>
        </div>

        {/* ── Benefits bar ── */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground font-medium">{pickBi(isRTL, 'تغطية المزايا', 'Benefit coverage')}</span>
            <span className={cn('font-bold tabular-nums', benefitPct > 0 ? colors.text : 'text-muted-foreground')}>{benefitPct}%</span>
          </div>
          <div className={cn('h-1.5 rounded-full overflow-hidden', benefitPct === 0 ? 'bg-muted/30 border border-dashed border-border/60' : 'bg-muted/40')}>
            <div
              className={cn('h-full rounded-full transition-all duration-500', PLAN_TIER_PROGRESS[plan.tier] || PLAN_TIER_PROGRESS.free)}
              style={{ width: `${benefitPct}%` }}
            />
          </div>
        </div>

        {/* ── Features ── */}
        {features.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
              {pickBi(isRTL, 'المميزات', 'Features')}
            </p>
            <ul className="space-y-1">
              {features.slice(0, 5).map((f: string, i: number) => (
                <li key={i} className="flex items-center gap-2 text-[11px] text-foreground/80">
                  <Check className={cn('w-3 h-3 shrink-0', colors.text)} />
                  <span className="truncate">{f}</span>
                </li>
              ))}
              {features.length > 5 && (
                <li className="text-[10px] text-muted-foreground ps-5 font-medium">
                  +{features.length - 5} {pickBi(isRTL, 'ميزة أخرى', 'more')}
                </li>
              )}
            </ul>
          </div>
        )}

        {/* ── Key Limits grid ── */}
        <div className="pt-3 border-t border-border/40">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
              {pickBi(isRTL, 'الحدود الرئيسية', 'Key Limits')}
            </p>
            {extraKeys.length > 0 && (
              <span
                className="text-[9px] text-muted-foreground/80 italic"
                title={extraKeys.join(', ')}
              >
                +{extraKeys.length} {pickBi(isRTL, 'إضافي', 'extra')}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {LIMIT_FIELDS.filter(f => f.type === 'number').slice(0, 6).map(field => {
              const val = limits[field.key] as number;
              const unlimited = val === 0;
              return (
                <div
                  key={field.key}
                  className={cn(
                    'flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg border',
                    unlimited
                      ? 'bg-muted/20 border-dashed border-border/50'
                      : 'bg-background border-border/60',
                  )}
                >
                  <span className="text-[9px] text-muted-foreground truncate">{isRTL ? field.label.ar : field.label.en}</span>
                  <span className={cn('text-[11px] font-bold tabular-nums tech-content shrink-0', unlimited ? 'text-muted-foreground' : colors.text)}>
                    {unlimited ? '∞' : val}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
PlanCard.displayName = 'PlanCard';

/* ─── Structured Limits Editor ─── */
const LimitsEditor = React.memo(({ limits, onChange, isRTL, language }: {
  limits: Record<string, number | boolean>;
  onChange: (limits: Record<string, number | boolean>) => void;
  isRTL: boolean;
  language: string;
}) => {
  const updateField = useCallback((key: string, value: number | boolean) => {
    onChange({ ...limits, [key]: value });
  }, [limits, onChange]);

  return (
    <div className="space-y-4">
      {LIMIT_CATEGORIES.map(cat => {
        const fields = LIMIT_FIELDS.filter(f => f.category === cat.key);
        return (
          <div key={cat.key}>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              {cat.key === 'visibility' && <Eye className="w-3 h-3" />}
              {cat.key === 'content' && <Sparkles className="w-3 h-3" />}
              {cat.key === 'operations' && <Settings2 className="w-3 h-3" />}
              {cat.key === 'support' && <Shield className="w-3 h-3" />}
              {language === 'ar' ? cat.label.ar : cat.label.en}
            </h4>
            <div className="space-y-2">
              {fields.map(field => (
                <div key={field.key} className="flex items-center gap-3 py-1.5 px-2 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{language === 'ar' ? field.label.ar : field.label.en}</p>
                    <p className="text-[9px] text-muted-foreground line-clamp-1">{language === 'ar' ? field.description.ar : field.description.en}</p>
                  </div>
                  {field.type === 'boolean' ? (
                    <Switch
                      checked={!!limits[field.key]}
                      onCheckedChange={v => updateField(field.key, v)}
                    />
                  ) : (
                    <Input
                      type="number"
                      min={0}
                      value={limits[field.key] as number}
                      onChange={e => updateField(field.key, parseInt(e.target.value) || 0)}
                      className="w-20 h-7 text-xs text-center"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
});
LimitsEditor.displayName = 'LimitsEditor';

/* ─── Subscription Row ─── */
const SubRow = React.memo(({ sub, isRTL, language, plans, onCancel, onRenew, onUpgrade }: AdminMembershipSubRowProps) => {
  const plan = sub.plan;
  const Icon = tierIcons[plan?.tier] || Zap;
  const colors = tierColors[plan?.tier] || tierColors.free;
  const status = statusConfig[sub.status] || statusConfig.expired;
  const isExpiringSoon = sub.status === 'active' && sub.expires_at && new Date(sub.expires_at) < new Date(Date.now() + 7 * 86400000);
  const daysLeft = sub.expires_at ? Math.max(0, Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86400000)) : null;
  const profile = sub.profile;
  const business = sub.business;

  return (
    <Card className={cn('transition-all hover:shadow-md border', isExpiringSoon ? 'border-warning/50 bg-warning/5' : 'border-border/30')}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm', colors.badge)}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-heading font-bold text-sm">{isRTL ? plan?.name_ar : plan?.name_en}</span>
              <Badge className={cn('text-[7px] px-1.5 py-0 h-3.5', status.badge)}>{isRTL ? status.label_ar : status.label_en}</Badge>
              <Badge variant="outline" className="text-[7px] px-1.5 py-0 h-3.5 gap-0.5">
                <CalendarDays className="w-2 h-2" />
                {sub.billing_cycle === 'yearly' ? (pickBi(isRTL, 'سنوي', 'Yearly')) : (pickBi(isRTL, 'شهري', 'Monthly'))}
              </Badge>
              {isExpiringSoon && (
                <Badge className="bg-warning/10 text-warning text-[7px] px-1.5 py-0 h-3.5 gap-0.5 animate-pulse">
                  <AlertTriangle className="w-2 h-2" />
                  {pickBi(isRTL, `ينتهي خلال ${daysLeft} يوم`, `Expires in ${daysLeft}d`)}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 flex-wrap text-[10px]">
              {profile && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="text-[8px] bg-muted">{profile.full_name?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">{profile.full_name || '—'}</span>
                  {profile.email && <span className="text-muted-foreground hidden sm:inline">({profile.email})</span>}
                </div>
              )}
              {business && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="w-3 h-3" />
                  <span className="font-medium text-foreground">{isRTL ? business.name_ar : (business.name_en || business.name_ar)}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 text-[9px] text-muted-foreground flex-wrap">
              <ReferenceBadge refId={sub.ref_id} />
              <span className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {format(new Date(sub.starts_at), 'dd/MM/yyyy')} → {sub.expires_at ? format(new Date(sub.expires_at), 'dd/MM/yyyy') : '∞'}
              </span>
              {daysLeft !== null && sub.status === 'active' && (
                <span className={cn('font-medium', daysLeft <= 7 ? 'text-warning' : daysLeft <= 30 ? 'text-foreground' : 'text-success')}>
                  {daysLeft} {pickBi(isRTL, 'يوم متبقي', 'days left')}
                </span>
              )}
            </div>
            {sub.status === 'active' && sub.expires_at && (
              <div className="pt-0.5">
                <Progress 
                  value={Math.max(0, Math.min(100, ((Date.now() - new Date(sub.starts_at).getTime()) / (new Date(sub.expires_at).getTime() - new Date(sub.starts_at).getTime())) * 100))}
                  className="h-1"
                />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            {sub.status === 'active' && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-accent hover:bg-accent/10" onClick={() => onUpgrade(sub)} aria-label="Action">
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px]">{pickBi(isRTL, 'ترقية', 'Upgrade')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => onCancel(sub.id)} aria-label="Refresh">
                      <Ban className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px]">{pickBi(isRTL, 'إلغاء', 'Cancel')}</TooltipContent>
                </Tooltip>
              </>
            )}
            {(sub.status === 'expired' || sub.status === 'cancelled') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-success hover:bg-success/10" onClick={() => onRenew(sub)} aria-label="Refresh">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-[10px]">{pickBi(isRTL, 'تجديد', 'Renew')}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
SubRow.displayName = 'SubRow';

/* ═══════════════════════════════════════════════════════ */
/* ─── Main Component ─── */
/* ═══════════════════════════════════════════════════════ */
const AdminMemberships = () => {
  useNoIndex();
  const { isRTL, language } = useLanguage();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [editingPlan, setEditingPlan] = useState<AdminMembershipEditingPlan | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deferredSearch, setDeferredSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [featuresText, setFeaturesText] = useState('');
  const [editLimits, setEditLimits] = useState<Record<string, number | boolean>>({});
  const [upgradeSub, setUpgradeSub] = useState<AdminMembershipEnrichedSubscription | null>(null);
  const [upgradeTargetPlan, setUpgradeTargetPlan] = useState('');
  const [upgradeCycle, setUpgradeCycle] = useState('monthly');
  const [form, setForm] = useState({
    name_ar: '', name_en: '', description_ar: '', description_en: '',
    price_monthly: 0, price_yearly: 0, is_active: true, sort_order: 0,
  });

  const handleSearchChange = useCallback((val: string) => {
    setSearchQuery(val);
    startTransition(() => setDeferredSearch(val));
  }, []);

  /* ─── Queries ─── */
  type AdminPlanRow = Database['public']['Tables']['membership_plans']['Row'];
  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['admin-membership-plans'],
    queryFn: async () => {
      const { data, error } = await listAdminMembershipPlans<AdminPlanRow>();
      if (error) throw error;
      return data ?? [];
    },
  });

  type AdminSubRow = Database['public']['Tables']['membership_subscriptions']['Row'] & {
    plan: { name_ar: string | null; name_en: string | null; tier: string | null } | null;
  };
  const { data: subscriptions = [], isLoading: loadingSubs } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data, error } = await listAdminMembershipSubscriptions<AdminSubRow>();
      if (error) throw error;
      return data ?? [];
    },
  });

  const userIds = useMemo(() => [...new Set(subscriptions.map((s) => s.user_id))], [subscriptions]);
  const businessIds = useMemo(() => [...new Set(subscriptions.filter((s) => s.business_id).map((s) => s.business_id))], [subscriptions]);

  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-sub-profiles', userIds],
    queryFn: async () => {
      if (!userIds.length) return [];
      const { data } = await listProfilesByUserIds<{ user_id: string; full_name: string | null; email: string | null; avatar_url: string | null; membership_tier: string | null }>({
        userIds,
        select: 'user_id, full_name, email, avatar_url, membership_tier',
      });
      return data ?? [];
    },
    enabled: userIds.length > 0,
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['admin-sub-businesses', businessIds],
    queryFn: async () => {
      if (!businessIds.length) return [];
      const { data } = await listBusinessesByIds<{
        id: string;
        name_ar: string | null;
        name_en: string | null;
        membership_tier: string | null;
        logo_url: string | null;
        is_verified: boolean | null;
        is_active: boolean | null;
      }>({
        ids: businessIds,
        select: 'id, name_ar, name_en, membership_tier, logo_url, is_verified, is_active',
      });
      return data ?? [];
    },
    enabled: businessIds.length > 0,
  });

  const { data: allBusinesses = [], isLoading: loadingBiz } = useQuery({
    queryKey: ['admin-all-businesses-tiers'],
    queryFn: async () => {
      const { data } = await listAdminBusinesses<{
        id: string;
        name_ar: string | null;
        name_en: string | null;
        membership_tier: string | null;
        logo_url: string | null;
        is_verified: boolean | null;
        is_active: boolean | null;
        username: string | null;
        rating_avg: number | null;
        rating_count: number | null;
        created_at: string;
      }>({
        select: 'id, name_ar, name_en, membership_tier, logo_url, is_verified, is_active, username, rating_avg, rating_count, created_at',
        orderBy: { column: 'membership_tier', ascending: false },
      });
      return data ?? [];
    },
    enabled: activeTab === 'businesses',
  });

  /* ─── M3A: Admin usage report (over-limit & near-cap) ─── */
  const [usageOnlyFlagged, setUsageOnlyFlagged] = useState(true);
  const { data: usageReport = [], isLoading: loadingUsage } = useQuery({
    queryKey: ['admin-membership-usage', usageOnlyFlagged],
    queryFn: async () => {
      const { data, error } = await adminListMembershipUsage({
        _only_over_or_near: usageOnlyFlagged,
        _limit: 500,
      });
      if (error) throw error;
      return (data ?? []) as UsageReportRow[];
    },
    enabled: activeTab === 'usage' && isAdmin,
    staleTime: 60 * 1000,
  });

  /* ─── Enriched subscriptions ─── */
  const enrichedSubs = useMemo(() => {
    const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
    const bizMap = new Map(businesses.map((b) => [b.id, b]));
    return subscriptions.map((s) => ({
      ...s,
      profile: profileMap.get(s.user_id) || null,
      business: s.business_id ? bizMap.get(s.business_id) || null : null,
    }));
  }, [subscriptions, profiles, businesses]);

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const active = enrichedSubs.filter((s) => s.status === 'active');
    const cancelled = enrichedSubs.filter((s) => s.status === 'cancelled').length;
    const expired = enrichedSubs.filter((s) => s.status === 'expired').length;
    const expiringSoon = active.filter((s) => s.expires_at && new Date(s.expires_at) < new Date(Date.now() + 7 * 86400000)).length;
    const monthly = active.filter((s) => s.billing_cycle === 'monthly').length;
    const yearly = active.filter((s) => s.billing_cycle === 'yearly').length;
    const tierDist = TIERS.map(t => ({
      tier: t,
      count: active.filter((s) => s.plan?.tier === t).length,
    }));
    const revenue = active.reduce((sum: number, s) => {
      const plan = plans.find((p) => p.id === s.plan_id);
      if (!plan) return sum;
      return sum + (s.billing_cycle === 'yearly' ? plan.price_yearly / 12 : plan.price_monthly);
    }, 0);
    const planSubCounts: Record<string, number> = {};
    active.forEach((s) => {
      planSubCounts[s.plan_id] = (planSubCounts[s.plan_id] || 0) + 1;
    });
    return { total: enrichedSubs.length, active: active.length, cancelled, expired, expiringSoon, monthly, yearly, tierDist, revenue, planSubCounts };
  }, [enrichedSubs, plans]);

  /* ─── Filtered subscriptions ─── */
  const filteredSubs = useMemo(() => {
    return enrichedSubs.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (tierFilter !== 'all' && s.plan?.tier !== tierFilter) return false;
      if (deferredSearch) {
        const q = deferredSearch.toLowerCase();
        return s.ref_id?.toLowerCase().includes(q)
          || s.plan?.name_ar?.toLowerCase().includes(q)
          || s.plan?.name_en?.toLowerCase().includes(q)
          || s.profile?.full_name?.toLowerCase().includes(q)
          || s.profile?.email?.toLowerCase().includes(q)
          || s.business?.name_ar?.toLowerCase().includes(q)
          || s.business?.name_en?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [enrichedSubs, statusFilter, tierFilter, deferredSearch]);

  /* ─── Filtered businesses ─── */
  const filteredBiz = useMemo(() => {
    if (!deferredSearch) return allBusinesses;
    const q = deferredSearch.toLowerCase();
    return allBusinesses.filter((b) => b.name_ar?.toLowerCase().includes(q) || b.name_en?.toLowerCase().includes(q) || b.username?.toLowerCase().includes(q));
  }, [allBusinesses, deferredSearch]);

  /* ─── Mutations ─── */
  const updatePlanMutation = useMutation({
    mutationFn: async () => {
      if (!editingPlan) return;
      const features = featuresText.split('\n').map(l => l.trim()).filter(Boolean);
      const originalLimits = (editingPlan.limits ?? null) as Record<string, unknown> | null;
      const limits = limitsToJson(editLimits, originalLimits);
      const isNew = !editingPlan.id;
      if (isNew) {
        const tier = editingPlan.tier || 'free';
        const { error } = await insertMembershipPlan({
          tier,
          name_ar: form.name_ar, name_en: form.name_en,
          description_ar: form.description_ar || null, description_en: form.description_en || null,
          price_monthly: form.price_monthly, price_yearly: form.price_yearly,
          is_active: form.is_active, sort_order: form.sort_order,
          features, limits,
        });
        if (error) throw error;
      } else {
        const { error } = await updateMembershipPlanById({
          id: editingPlan.id as string,
          values: {
            name_ar: form.name_ar, name_en: form.name_en,
            description_ar: form.description_ar || null, description_en: form.description_en || null,
            price_monthly: form.price_monthly, price_yearly: form.price_yearly,
            is_active: form.is_active, sort_order: form.sort_order,
            features, limits,
          },
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-membership-plans'] });
      queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
      queryClient.invalidateQueries({ queryKey: ['membership-plans-comparison'] });
      queryClient.invalidateQueries({ queryKey: ['home-membership-plans'] });
      setEditingPlan(null);
      toast.success(pickBi(isRTL, 'تم حفظ الخطة بنجاح', 'Plan saved successfully'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelSubMutation = useMutation({
    mutationFn: async (sub: { id: string; profile?: { email?: string | null; full_name?: string | null } | null; business?: { name_ar?: string | null; name_en?: string | null } | null }) => {
      const { error } = await cancelSubscription({ _subscription_id: sub.id });
      if (error) throw error;
      // R4F-4-APPLY: fail-soft immediate-cancel email.
      const email = sub.profile?.email ?? undefined;
      if (email) {
        try {
          await sendTransactionalEmail({
            templateName: 'membership-cancelled-immediately',
            recipientEmail: email,
            idempotencyKey: `membership-cancelled-immediate-${sub.id}`,
            templateData: {
              recipientName: sub.profile?.full_name ?? undefined,
              businessName: sub.business?.name_ar || sub.business?.name_en || undefined,
            },
          });
        } catch (err) {
           
          console.warn('[AdminMemberships] immediate-cancel email failed', err);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-businesses-tiers'] });
      toast.success(pickBi(isRTL, 'تم إلغاء الاشتراك', 'Subscription cancelled'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      if (!upgradeSub || !upgradeTargetPlan) return;
      const { error } = await adminUpgradeSubscription({
        _subscription_id: upgradeSub.id,
        _new_plan_id: upgradeTargetPlan,
        _billing_cycle: upgradeCycle,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-businesses-tiers'] });
      setUpgradeSub(null);
      setUpgradeTargetPlan('');
      toast.success(pickBi(isRTL, 'تمت الترقية بنجاح', 'Upgrade completed'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleRenew = useCallback(async (sub: AdminMembershipEnrichedSubscription) => {
    if (!sub.plan_id || !sub.user_id) return;
    try {
      const { error } = await subscribeToPlan({
        _user_id: sub.user_id,
        _plan_id: sub.plan_id,
        _business_id: sub.business_id || null,
        _billing_cycle: sub.billing_cycle,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-businesses-tiers'] });
      toast.success(pickBi(isRTL, 'تم تجديد الاشتراك', 'Subscription renewed'));
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
  }, [isRTL, queryClient]);

  const openEdit = useCallback((plan: AdminMembershipPlanRow) => {
    setEditingPlan(plan);
    const features = Array.isArray(plan.features) ? (plan.features as string[]).join('\n') : '';
    setFeaturesText(features);
    setEditLimits(parseLimits(plan.limits as AdminMembershipLimitsInput));
    setForm({
      name_ar: plan.name_ar, name_en: plan.name_en,
      description_ar: plan.description_ar || '', description_en: plan.description_en || '',
      price_monthly: plan.price_monthly, price_yearly: plan.price_yearly,
      is_active: plan.is_active, sort_order: plan.sort_order,
    });
  }, []);

  const openCreate = useCallback((tier: typeof TIERS[number]) => {
    setEditingPlan({ tier, _new: true });
    setFeaturesText('');
    setEditLimits(parseLimits(undefined));
    setForm({
      name_ar: '', name_en: '',
      description_ar: '', description_en: '',
      price_monthly: 0, price_yearly: 0,
      is_active: true, sort_order: plans.length,
    });
  }, [plans.length]);

  /* ─── CSV Export ─── */
  const exportCSV = useCallback(() => {
    const bom = '\uFEFF';
    const headers = ['Ref ID', 'User', 'Email', 'Business', 'Plan', 'Tier', 'Status', 'Cycle', 'Starts', 'Expires'];
    const rows = enrichedSubs.map((s) => [
      s.ref_id, s.profile?.full_name || '', s.profile?.email || '',
      s.business?.name_ar || '', s.plan?.name_en || s.plan?.name_ar || '', s.plan?.tier || '',
      s.status, s.billing_cycle,
      format(new Date(s.starts_at), 'yyyy-MM-dd'), s.expires_at ? format(new Date(s.expires_at), 'yyyy-MM-dd') : '',
    ]);
    const csv = bom + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `subscriptions-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(pickBi(isRTL, 'تم التصدير', 'Exported'));
  }, [enrichedSubs, isRTL]);

  const tabs: { key: Tab; icon: React.ElementType; label: string; count?: number }[] = [
    { key: 'overview', icon: BarChart3, label: pickBi(isRTL, 'نظرة عامة', 'Overview') },
    { key: 'plans', icon: CreditCard, label: pickBi(isRTL, 'الخطط', 'Plans'), count: plans.length },
    { key: 'subscriptions', icon: Users, label: pickBi(isRTL, 'الاشتراكات', 'Subscriptions'), count: stats.active },
    { key: 'requests', icon: ArrowUpCircle, label: pickBi(isRTL, 'طلبات الترقية', 'Upgrade Requests') },
    { key: 'businesses', icon: Building2, label: pickBi(isRTL, 'الجهات', 'Businesses') },
    { key: 'usage', icon: Activity, label: pickBi(isRTL, 'الاستخدام', 'Usage') },
  ];

  // Defense-in-depth: ProtectedRoute requireAdmin already gates this route,
  // but render an explicit unauthorized state if somehow reached without admin.
  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto mt-16 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
            <Lock className="w-6 h-6 text-destructive" />
          </div>
          <h2 className="font-heading font-bold text-base">
            {pickBi(isRTL, 'وصول غير مصرّح به', 'Unauthorized')}
          </h2>
          <p className="text-xs text-muted-foreground">
            {pickBi(isRTL, 'هذه الصفحة متاحة لمسؤولي النظام فقط.', 'This page is restricted to administrators.')}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={200}>
        <div className="space-y-5">
          {/* Sub-navigation pills — header is rendered once by TabbedShell to avoid duplication */}
          <div className="flex items-center justify-between gap-3 bg-background/60 backdrop-blur-sm border border-border/60 rounded-2xl p-1.5">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {tabs.map(t => {
                const isActive = activeTab === t.key;
                return (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    className={cn(
                      'h-10 px-4 rounded-xl text-xs font-semibold transition-all shrink-0 inline-flex items-center gap-1.5',
                      isActive
                        ? 'bg-card shadow-sm text-primary border border-border/50'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    )}>
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                    {t.count !== undefined && (
                      <span className={cn(
                        'text-[9px] font-bold px-1.5 py-0.5 rounded-md',
                        isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      )}>{t.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
            {activeTab === 'subscriptions' && (
              <Button variant="outline" size="sm" className="text-xs h-9 gap-1.5 shrink-0" onClick={exportCSV}>
                <Download className="w-3 h-3" />{pickBi(isRTL, 'تصدير CSV', 'Export CSV')}
              </Button>
            )}
          </div>

          {/* ═══════ OVERVIEW ═══════ */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <AdminKpiCard
                  icon={Users}
                  tone="primary"
                  label={pickBi(isRTL, 'إجمالي الاشتراكات', 'Total Subscriptions')}
                  value={stats.total}
                />
                <AdminKpiCard
                  icon={UserCheck}
                  tone="success"
                  label={pickBi(isRTL, 'نشط حالياً', 'Currently Active')}
                  value={stats.active}
                  trend={stats.active > 0 ? pickBi(isRTL, 'مباشر', 'LIVE') : undefined}
                />
                <AdminKpiCard
                  icon={DollarSign}
                  tone="info"
                  label={pickBi(isRTL, 'الإيراد الشهري', 'Monthly Revenue')}
                  value={`${Math.round(stats.revenue).toLocaleString(pickBi(isRTL, 'ar-SA-u-nu-latn', 'en-US'))} SAR`}
                />
                <AdminKpiCard
                  icon={AlertTriangle}
                  tone={stats.expiringSoon > 0 ? 'warning' : 'muted'}
                  label={pickBi(isRTL, 'ينتهي قريباً', 'Expiring Soon')}
                  value={stats.expiringSoon}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Card className="border border-border/60 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
                    <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      {pickBi(isRTL, 'توزيع العضويات', 'Tier Distribution')}
                    </h3>
                    <span className="px-2 py-0.5 bg-muted/40 text-muted-foreground rounded-md text-[9px] font-bold uppercase tracking-wide">
                      {pickBi(isRTL, 'تحديث تلقائي', 'Auto')}
                    </span>
                  </div>
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      {stats.tierDist.map(({ tier, count }) => {
                        const colors = tierColors[tier];
                        const Icon = tierIcons[tier];
                        const pct = stats.active > 0 ? Math.round((count / stats.active) * 100) : 0;
                        const isEmpty = count === 0;
                        return (
                          <div key={tier} className="flex items-center gap-3">
                            <div className={cn(
                              'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border',
                              isEmpty ? 'bg-muted/30 text-muted-foreground/50 border-dashed border-border' : cn(colors.badge, 'border-transparent')
                            )}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className={cn('text-xs font-bold capitalize', isEmpty && 'text-muted-foreground/70')}>{tier}</span>
                                <span className={cn(
                                  'text-[10px] font-bold tech-content tabular-nums',
                                  isEmpty ? 'text-muted-foreground/60' : 'text-primary'
                                )}>
                                  <span>{count}</span>
                                  <span className="text-muted-foreground mx-1">·</span>
                                  <span>{pct}%</span>
                                </span>
                              </div>
                              <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                                <div className={cn(
                                  'h-full rounded-full transition-all duration-500',
                                  tier === 'free' ? 'bg-muted-foreground/40' : tier === 'basic' ? 'bg-info' : tier === 'premium' ? 'bg-accent' : 'bg-secondary'
                                )} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border/60 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
                    <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      {pickBi(isRTL, 'ملخص الحالة', 'Status Summary')}
                    </h3>
                    <button
                      type="button"
                      onClick={exportCSV}
                      className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-wide"
                    >
                      {pickBi(isRTL, 'تصدير التقرير', 'Export')}
                    </button>
                  </div>
                  <CardContent className="p-5 space-y-4">
                    {[
                      { label: pickBi(isRTL, 'شهري نشط', 'Monthly Active'), value: stats.monthly, denom: stats.active, color: 'bg-info' },
                      { label: pickBi(isRTL, 'سنوي نشط', 'Yearly Active'), value: stats.yearly, denom: stats.active, color: 'bg-accent' },
                      { label: pickBi(isRTL, 'ينتهي خلال أسبوع', 'Expiring (7d)'), value: stats.expiringSoon, denom: stats.active, color: 'bg-warning' },
                      { label: pickBi(isRTL, 'ملغي', 'Cancelled'), value: stats.cancelled, denom: stats.total, color: 'bg-destructive' },
                      { label: pickBi(isRTL, 'منتهي', 'Expired'), value: stats.expired, denom: stats.total, color: 'bg-muted-foreground/50' },
                    ].map((row, i) => {
                      const pct = row.denom > 0 ? Math.round((row.value / row.denom) * 100) : 0;
                      const isEmpty = row.value === 0;
                      return (
                        <div key={i} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className={cn('font-medium', isEmpty ? 'text-muted-foreground/70' : 'text-foreground')}>{row.label}</span>
                            <span className={cn(
                              'font-bold tech-content tabular-nums',
                              isEmpty ? 'text-muted-foreground/50' : 'text-foreground'
                            )}>{row.value}</span>
                          </div>
                          <div className={cn('h-1.5 rounded-full overflow-hidden', isEmpty ? 'bg-muted/30 border border-dashed border-border/60' : 'bg-muted/40')}>
                            <div className={cn('h-full rounded-full transition-all duration-500', row.color)} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ═══════ PLANS ═══════ */}
          {activeTab === 'plans' && (
            <div className="space-y-4">
              {/* Create Plan toolbar — appears only when not editing */}
              {!editingPlan && (
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-[11px] text-muted-foreground">
                    {pickBi(isRTL, 'الخطط تُعرض على /membership تلقائياً عند تفعيلها.', 'Active plans are auto-listed on /membership.')}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-[10px] text-muted-foreground">{pickBi(isRTL, 'إنشاء بمستوى:', 'Create as:')}</Label>
                    <Select onValueChange={(v) => openCreate(v as typeof TIERS[number])}>
                      <SelectTrigger className="h-8 w-[140px] text-xs gap-1.5">
                        <Plus className="w-3 h-3" />
                        <SelectValue placeholder={pickBi(isRTL, 'اختر المستوى', 'Pick tier')} />
                      </SelectTrigger>
                      <SelectContent>
                        {TIERS.map(t => (
                          <SelectItem key={t} value={t} className="capitalize text-xs">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Inline Edit Form */}
              {editingPlan && (
                <Card className="border-accent/30 bg-accent/5 shadow-lg">
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                        {editingPlan._new ? <Plus className="w-4 h-4 text-accent" /> : <Pencil className="w-4 h-4 text-accent" />}
                        {editingPlan._new
                          ? (pickBi(isRTL, 'إنشاء خطة جديدة', 'Create Plan'))
                          : (pickBi(isRTL, 'تعديل الخطة', 'Edit Plan'))}
                        <Badge className={cn('text-[9px]', tierColors[editingPlan.tier]?.badge)}>{editingPlan.tier}</Badge>
                      </h3>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingPlan(null)} aria-label="Action"><X className="w-4 h-4" /></Button>
                    </div>

                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-[10px]">{pickBi(isRTL, 'الاسم (عربي)', 'Name (AR)')}</Label><Input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} className="h-9 text-xs mt-1" /></div>
                      <div><Label className="text-[10px]">{pickBi(isRTL, 'الاسم (إنجليزي)', 'Name (EN)')}</Label><Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} className="h-9 text-xs mt-1" /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label className="text-[10px]">{pickBi(isRTL, 'السعر الشهري', 'Monthly Price')}</Label><Input type="number" value={form.price_monthly} onChange={e => setForm(f => ({ ...f, price_monthly: parseFloat(e.target.value) || 0 }))} className="h-9 text-xs mt-1" /></div>
                      <div><Label className="text-[10px]">{pickBi(isRTL, 'السعر السنوي', 'Yearly Price')}</Label><Input type="number" value={form.price_yearly} onChange={e => setForm(f => ({ ...f, price_yearly: parseFloat(e.target.value) || 0 }))} className="h-9 text-xs mt-1" /></div>
                      <div><Label className="text-[10px]">{pickBi(isRTL, 'الترتيب', 'Sort Order')}</Label><Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className="h-9 text-xs mt-1" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-[10px]">{pickBi(isRTL, 'الوصف (عربي)', 'Description (AR)')}</Label><Textarea value={form.description_ar} onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))} rows={2} className="text-xs mt-1" /></div>
                      <div><Label className="text-[10px]">{pickBi(isRTL, 'الوصف (إنجليزي)', 'Description (EN)')}</Label><Textarea value={form.description_en} onChange={e => setForm(f => ({ ...f, description_en: e.target.value }))} rows={2} className="text-xs mt-1" /></div>
                    </div>

                    {/* Features text */}
                    <div>
                      <Label className="text-[10px]">{pickBi(isRTL, 'المميزات النصية (سطر لكل ميزة)', 'Text Features (one per line)')}</Label>
                      <Textarea value={featuresText} onChange={e => setFeaturesText(e.target.value)} rows={4} className="text-xs mt-1" />
                    </div>

                    {/* ── Structured Limits Editor ── */}
                    <div className="border border-border/30 rounded-xl p-4 bg-background/50">
                      <div className="flex items-center gap-2 mb-4">
                        <Settings2 className="w-4 h-4 text-accent" />
                        <h4 className="font-heading font-bold text-sm">{pickBi(isRTL, 'حدود ومزايا الباقة', 'Plan Limits & Benefits')}</h4>
                        <Badge variant="outline" className="text-[8px] ms-auto">
                          {LIMIT_FIELDS.filter(f => f.type === 'boolean' && editLimits[f.key] === true).length}/{LIMIT_FIELDS.filter(f => f.type === 'boolean').length} {pickBi(isRTL, 'مفعّل', 'enabled')}
                        </Badge>
                      </div>
                      <LimitsEditor limits={editLimits} onChange={setEditLimits} isRTL={isRTL} language={language} />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                        <Label className="text-xs">{pickBi(isRTL, 'مفعّل', 'Active')}</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setEditingPlan(null)}>{pickBi(isRTL, 'إلغاء', 'Cancel')}</Button>
                        <Button size="sm" className="text-xs h-8 gap-1.5" onClick={() => updatePlanMutation.mutate()} disabled={updatePlanMutation.isPending}>
                          {updatePlanMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          {pickBi(isRTL, 'حفظ التعديلات', 'Save Changes')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {loadingPlans ? (
                <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                  {plans.map((plan) => (
                    <PlanCard key={plan.id} plan={plan} isRTL={isRTL} language={language} subsCount={stats.planSubCounts[plan.id] || 0} onEdit={openEdit} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════ SUBSCRIPTIONS ═══════ */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-4">
              {upgradeSub && (
                <Card className="border-accent/30 bg-accent/5 shadow-lg animate-in slide-in-from-top-2 duration-300">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                        <ArrowUpCircle className="w-4 h-4 text-accent" />
                        {pickBi(isRTL, 'ترقية الاشتراك', 'Upgrade Subscription')}
                      </h3>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setUpgradeSub(null)} aria-label="Action"><X className="w-4 h-4" /></Button>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 mb-4">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={upgradeSub.profile?.avatar_url} />
                        <AvatarFallback className="text-[10px]">{upgradeSub.profile?.full_name?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-medium">{upgradeSub.profile?.full_name || '—'}</p>
                        <p className="text-[9px] text-muted-foreground">
                          {pickBi(isRTL, 'الخطة الحالية:', 'Current:')} {upgradeSub.plan?.name_ar || upgradeSub.plan?.name_en}
                          {upgradeSub.business && ` • ${isRTL ? upgradeSub.business.name_ar : (upgradeSub.business.name_en || upgradeSub.business.name_ar)}`}
                        </p>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 mb-4">
                      <div>
                        <Label className="text-[10px]">{pickBi(isRTL, 'الخطة الجديدة', 'New Plan')}</Label>
                        <Select value={upgradeTargetPlan} onValueChange={setUpgradeTargetPlan}>
                          <SelectTrigger className="h-9 text-xs mt-1"><SelectValue placeholder={pickBi(isRTL, 'اختر الخطة...', 'Select plan...')} /></SelectTrigger>
                          <SelectContent>
                            {plans.filter((p) => p.is_active && p.id !== upgradeSub.plan_id).map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                <div className="flex items-center gap-2">
                                  {React.createElement(tierIcons[p.tier] || Zap, { className: 'w-3 h-3' })}
                                  {isRTL ? p.name_ar : p.name_en} <span className="text-muted-foreground">({p.tier})</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px]">{pickBi(isRTL, 'دورة الفوترة', 'Billing Cycle')}</Label>
                        <Select value={upgradeCycle} onValueChange={setUpgradeCycle}>
                          <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">{pickBi(isRTL, 'شهري', 'Monthly')}</SelectItem>
                            <SelectItem value="yearly">{pickBi(isRTL, 'سنوي', 'Yearly')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setUpgradeSub(null)}>{pickBi(isRTL, 'إلغاء', 'Cancel')}</Button>
                      <Button size="sm" className="text-xs h-8 gap-1.5" onClick={() => upgradeMutation.mutate()} disabled={!upgradeTargetPlan || upgradeMutation.isPending}>
                        {upgradeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUpCircle className="w-3 h-3" />}
                        {pickBi(isRTL, 'تأكيد الترقية', 'Confirm Upgrade')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Filters */}
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder={pickBi(isRTL, 'بحث بالمعرف، الاسم، البريد...', 'Search by ref, name, email...')}
                    value={searchQuery} onChange={e => handleSearchChange(e.target.value)} className="h-9 text-xs ps-8" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{pickBi(isRTL, 'جميع الحالات', 'All Status')}</SelectItem>
                    {Object.entries(statusConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{isRTL ? v.label_ar : v.label_en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger className="h-9 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{pickBi(isRTL, 'جميع الباقات', 'All Tiers')}</SelectItem>
                    {TIERS.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="h-9 px-3 text-xs flex items-center gap-1.5 shrink-0">
                  <Hash className="w-3 h-3" />{filteredSubs.length}
                </Badge>
              </div>

              {loadingSubs ? (
                <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : filteredSubs.length === 0 ? (
                <Card className="border-border/30"><CardContent className="p-10 text-center text-muted-foreground text-sm">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  {pickBi(isRTL, 'لا توجد اشتراكات مطابقة', 'No matching subscriptions')}
                </CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {filteredSubs.map((sub) => (
                    <SubRow key={sub.id} sub={sub} isRTL={isRTL} language={language} plans={plans}
                      onCancel={(_id) => cancelSubMutation.mutate(sub)}
                      onRenew={handleRenew}
                      onUpgrade={(s) => { setUpgradeSub(s); setUpgradeTargetPlan(''); }} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════ UPGRADE REQUESTS ═══════ */}
          {activeTab === 'requests' && (
            <div className="space-y-6">
              <AdminUpgradeRequestsPanel isRTL={isRTL} />
              <AdminPromoCodesPanel isRTL={isRTL} />
            </div>
          )}

          {/* ═══════ BUSINESSES ═══════ */}
          {activeTab === 'businesses' && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder={pickBi(isRTL, 'بحث عن جهة...', 'Search businesses...')} value={searchQuery}
                    onChange={e => handleSearchChange(e.target.value)} className="h-9 text-xs ps-8" />
                </div>
                <Badge variant="outline" className="h-9 px-3 text-xs flex items-center gap-1.5 shrink-0">
                  <Building2 className="w-3 h-3" />{filteredBiz.length}
                </Badge>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {TIERS.map(tier => {
                  const Icon = tierIcons[tier];
                  const colors = tierColors[tier];
                  const count = allBusinesses.filter((b) => b.membership_tier === tier).length;
                  return (
                    <Card key={tier} className={cn('border', colors.border, colors.bg)}>
                      <CardContent className="p-3 text-center">
                        <div className={cn('w-8 h-8 rounded-lg mx-auto mb-1 flex items-center justify-center', colors.badge)}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <p className={cn('text-lg font-bold', colors.text)}>{count}</p>
                        <p className="text-[9px] text-muted-foreground capitalize">{tier}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {loadingBiz ? (
                <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="space-y-1.5">
                  {filteredBiz.map((biz) => {
                    const colors = tierColors[biz.membership_tier] || tierColors.free;
                    const Icon = tierIcons[biz.membership_tier] || Zap;
                    return (
                      <Card key={biz.id} className={cn('border-border/30 transition-all hover:shadow-sm')}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <Avatar className="w-9 h-9 shrink-0 rounded-xl">
                            <AvatarImage src={biz.logo_url} />
                            <AvatarFallback className="bg-muted text-muted-foreground rounded-xl text-xs">{biz.name_ar?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold truncate">{isRTL ? biz.name_ar : (biz.name_en || biz.name_ar)}</span>
                              {biz.is_verified && <Shield className="w-3 h-3 text-success shrink-0" />}
                              {!biz.is_active && <Badge variant="outline" className="text-[7px] h-3 px-1 text-destructive">{pickBi(isRTL, 'معطل', 'Inactive')}</Badge>}
                            </div>
                            <div className="flex items-center gap-2 text-[9px] text-muted-foreground mt-0.5">
                              <span className="tech-content">@{biz.username}</span>
                              <span>⭐ {biz.rating_avg?.toFixed(1)} ({biz.rating_count})</span>
                            </div>
                          </div>
                          <Badge className={cn('text-[8px] px-2 py-0.5 h-auto uppercase font-bold gap-1', colors.badge)}>
                            <Icon className="w-2.5 h-2.5" />
                            {biz.membership_tier}
                          </Badge>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════ USAGE (M3A read-only) ═══════ */}
          {activeTab === 'usage' && (
            <div className="space-y-3">
              <Card className="border-info/30 bg-info/5">
                <CardContent className="p-3 text-[11px] text-foreground/80 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-info shrink-0 mt-0.5" />
                  <span>
                    {pickBi(isRTL, 'هذه مؤشرات استخدام فقط. لا يتم فرض الحدود تلقائيًا بعد.', 'Usage indicators only. Limits are not enforced automatically yet.')}
                  </span>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={usageOnlyFlagged}
                    onCheckedChange={setUsageOnlyFlagged}
                  />
                  <Label className="text-xs">
                    {pickBi(isRTL, 'إظهار المتجاوزين/القريبين من الحد فقط', 'Show only over-limit / near-cap')}
                  </Label>
                </div>
                <Badge variant="outline" className="h-7 px-2 text-[10px] gap-1">
                  <Activity className="w-3 h-3" />
                  {usageReport.length}
                </Badge>
              </div>

              {loadingUsage ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : usageReport.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-xs text-muted-foreground">
                    {pickBi(isRTL, 'لا توجد جهات قريبة من الحد أو متجاوزة.', 'No businesses near or over their limits.')}
                  </CardContent>
                </Card>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/30 text-muted-foreground">
                        <th className="text-start p-2 font-semibold">{pickBi(isRTL, 'الجهة', 'Business')}</th>
                        <th className="text-start p-2 font-semibold">{pickBi(isRTL, 'الباقة', 'Tier')}</th>
                        <th className="text-start p-2 font-semibold">{pickBi(isRTL, 'المؤشر', 'Metric')}</th>
                        <th className="text-center p-2 font-semibold">{pickBi(isRTL, 'الاستخدام', 'Used / Limit')}</th>
                        <th className="text-start p-2 font-semibold">{pickBi(isRTL, 'الفترة', 'Period')}</th>
                        <th className="text-center p-2 font-semibold">{pickBi(isRTL, 'الحالة', 'Status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageReport.map((r, i) => {
                        const limText = r.limit_value === 0
                          ? (pickBi(isRTL, 'غير محدود', '∞'))
                          : String(r.limit_value);
                        return (
                          <tr key={`${r.business_id}-${r.metric}-${i}`} className="border-t border-border/30 hover:bg-muted/10">
                            <td className="p-2 truncate max-w-[180px]">
                              {isRTL ? r.business_name_ar : (r.business_name_en || r.business_name_ar)}
                            </td>
                            <td className="p-2 capitalize">{r.tier || '—'}</td>
                            <td className="p-2 capitalize">{r.metric}</td>
                            <td className="p-2 text-center tech-content font-bold">
                              {r.used} / {limText}
                            </td>
                            <td className="p-2 text-[10px] text-muted-foreground">{r.period}</td>
                            <td className="p-2 text-center">
                              {r.over_limit ? (
                                <Badge className="text-[9px] bg-destructive/15 text-destructive">
                                  {pickBi(isRTL, 'تجاوز الحد', 'Over limit')}
                                </Badge>
                              ) : r.near_cap ? (
                                <Badge className="text-[9px] bg-warning/15 text-warning">
                                  {pickBi(isRTL, 'اقترب من الحد', 'Near cap')}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px]">OK</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
};

export default AdminMemberships;
