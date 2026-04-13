import React, { useState, useMemo, useCallback, useTransition } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  Download, Hash, Activity, Layers, Settings2, Megaphone, Eye, Sparkles,
} from 'lucide-react';
import { TIERS, tierIcons, tierColors, statusConfig } from '@/lib/membership-tiers';
import { LIMIT_FIELDS, LIMIT_CATEGORIES, parseLimits, limitsToJson } from '@/lib/membership-limits';

type Tab = 'overview' | 'plans' | 'subscriptions' | 'businesses';

/* ─── Plan Card ─── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PlanCard = React.memo(({ plan, isRTL, language, subsCount, onEdit }: { plan: any; isRTL: boolean; language: string; subsCount: number; onEdit: (p: any) => void }) => {
  const Icon = tierIcons[plan.tier] || Zap;
  const colors = tierColors[plan.tier] || tierColors.free;
  const features = Array.isArray(plan.features) ? plan.features : [];
  const limits = parseLimits(plan.limits as Record<string, any> | undefined);
  const enabledBoolLimits = LIMIT_FIELDS.filter(f => f.type === 'boolean' && limits[f.key] === true).length;
  const totalBoolLimits = LIMIT_FIELDS.filter(f => f.type === 'boolean').length;
  const benefitPct = totalBoolLimits > 0 ? Math.round((enabledBoolLimits / totalBoolLimits) * 100) : 0;
  const savingPct = plan.price_monthly > 0 && plan.price_yearly > 0
    ? Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100) : 0;

  const isPremium = plan.tier === 'premium';
  const isEnterprise = plan.tier === 'enterprise';

  return (
    <Card className={cn(
      'relative transition-all duration-300 group border overflow-hidden',
      colors.border, colors.bg,
      isPremium && 'ring-1 ring-accent/30 shadow-md shadow-accent/5',
      isEnterprise && 'ring-1 ring-purple-500/20',
      !plan.is_active && 'opacity-40 grayscale',
      'hover:shadow-xl hover:-translate-y-0.5'
    )}>
      {/* Top accent stripe */}
      <div className={cn(
        'absolute top-0 inset-x-0 h-1',
        plan.tier === 'free' && 'bg-muted-foreground/30',
        plan.tier === 'basic' && 'bg-blue-500',
        isPremium && 'bg-gradient-to-r from-accent via-accent/80 to-accent',
        isEnterprise && 'bg-gradient-to-r from-purple-500 via-purple-400 to-purple-600',
      )} />

      {/* Popular badge */}
      {isPremium && (
        <div className="absolute -top-0 end-4 z-10">
          <div className="bg-accent text-accent-foreground text-[8px] font-bold px-3 py-1 rounded-b-lg shadow-lg shadow-accent/20 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            {isRTL ? 'الأكثر شعبية' : 'Most Popular'}
          </div>
        </div>
      )}

      <CardContent className="p-5 sm:p-6 pt-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3.5">
            <div className={cn(
              'w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105',
              colors.badge,
              isPremium && 'shadow-accent/20',
            )}>
              <Icon className="w-5.5 h-5.5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base leading-tight">{isRTL ? plan.name_ar : plan.name_en}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge className={cn('text-[7px] px-1.5 py-0 h-3.5 uppercase font-bold tracking-wider', colors.badge)}>
                  {plan.tier}
                </Badge>
                {!plan.is_active && (
                  <Badge variant="outline" className="text-[7px] h-3.5 bg-destructive/5 text-destructive border-destructive/20">
                    {isRTL ? 'معطل' : 'Inactive'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon"
            className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-accent/10"
            onClick={() => onEdit(plan)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Description */}
        <p className="text-[11px] text-muted-foreground mb-5 line-clamp-2 min-h-[2.25rem] leading-relaxed">
          {isRTL ? plan.description_ar : plan.description_en}
        </p>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <div className={cn(
            'p-3.5 rounded-xl border text-center transition-colors',
            'bg-background/60 border-border/15 hover:bg-background/90'
          )}>
            <p className="text-[8px] text-muted-foreground mb-1 uppercase tracking-wider font-medium">
              {isRTL ? 'شهري' : 'Monthly'}
            </p>
            <p className={cn('font-bold text-xl leading-none', colors.text)}>
              {plan.price_monthly === 0
                ? (isRTL ? 'مجاناً' : 'Free')
                : <>{plan.price_monthly}<span className="text-[9px] text-muted-foreground font-normal ms-0.5">{plan.currency_code}</span></>
              }
            </p>
          </div>
          <div className={cn(
            'p-3.5 rounded-xl border text-center relative transition-colors',
            'bg-background/60 border-border/15 hover:bg-background/90'
          )}>
            <p className="text-[8px] text-muted-foreground mb-1 uppercase tracking-wider font-medium">
              {isRTL ? 'سنوي' : 'Yearly'}
            </p>
            <p className={cn('font-bold text-xl leading-none', colors.text)}>
              {plan.price_yearly === 0
                ? (isRTL ? 'مجاناً' : 'Free')
                : <>{plan.price_yearly}<span className="text-[9px] text-muted-foreground font-normal ms-0.5">{plan.currency_code}</span></>
              }
            </p>
            {savingPct > 0 && (
              <Badge className="absolute -top-1.5 -end-1.5 bg-emerald-500 text-white text-[7px] px-1.5 py-0 h-4 shadow-sm">
                -{savingPct}%
              </Badge>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-muted/25 border border-border/10">
            <div className="w-7 h-7 rounded-lg bg-background/80 flex items-center justify-center shadow-sm">
              <Users className="w-3 h-3 text-muted-foreground" />
            </div>
            <div>
              <p className={cn('text-sm font-bold leading-none', colors.text)}>{subsCount}</p>
              <p className="text-[8px] text-muted-foreground mt-0.5">{isRTL ? 'مشترك' : 'Subscribers'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-muted/25 border border-border/10">
            <div className="w-7 h-7 rounded-lg bg-background/80 flex items-center justify-center shadow-sm">
              <Settings2 className="w-3 h-3 text-muted-foreground" />
            </div>
            <div>
              <p className={cn('text-sm font-bold leading-none', colors.text)}>{enabledBoolLimits}<span className="text-muted-foreground font-normal">/{totalBoolLimits}</span></p>
              <p className="text-[8px] text-muted-foreground mt-0.5">{isRTL ? 'مزايا' : 'Benefits'}</p>
            </div>
          </div>
        </div>

        {/* Benefits progress */}
        <div className="mb-4 px-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] text-muted-foreground font-medium uppercase tracking-wider">
              {isRTL ? 'المزايا المفعّلة' : 'Benefits Enabled'}
            </span>
            <span className={cn('text-[9px] font-bold', colors.text)}>{benefitPct}%</span>
          </div>
          <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500',
                plan.tier === 'free' ? 'bg-muted-foreground/40' :
                plan.tier === 'basic' ? 'bg-blue-500' :
                isPremium ? 'bg-accent' : 'bg-purple-500'
              )}
              style={{ width: `${benefitPct}%` }}
            />
          </div>
        </div>

        {/* Features List */}
        {features.length > 0 && (
          <div className="mb-4">
            <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
              {isRTL ? 'المميزات' : 'Features'}
            </p>
            <div className="space-y-1.5">
              {features.slice(0, 5).map((f: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-[11px] group/feat">
                  <div className={cn('w-4 h-4 rounded-md flex items-center justify-center shrink-0', colors.badge)}>
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span className="truncate text-foreground/80 group-hover/feat:text-foreground transition-colors">{f}</span>
                </div>
              ))}
              {features.length > 5 && (
                <p className="text-[9px] text-muted-foreground ps-6 font-medium">
                  +{features.length - 5} {isRTL ? 'ميزة أخرى' : 'more'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Key Limits */}
        <div className="pt-3 border-t border-border/15">
          <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
            {isRTL ? 'الحدود الرئيسية' : 'Key Limits'}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {LIMIT_FIELDS.filter(f => f.type === 'number').slice(0, 6).map(field => {
              const val = limits[field.key] as number;
              return (
                <div key={field.key} className="flex items-center justify-between px-2 py-1 rounded-lg bg-muted/15 border border-border/5">
                  <span className="text-[8px] text-muted-foreground truncate">{isRTL ? field.label.ar : field.label.en}</span>
                  <span className={cn('text-[10px] font-bold ms-1.5', val === 0 ? 'text-muted-foreground' : colors.text)}>
                    {val === 0 ? '∞' : val}
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
const SubRow = React.memo(({ sub, isRTL, language, plans, onCancel, onRenew, onUpgrade }: {
  sub: any; isRTL: boolean; language: string; plans: any[]; onCancel: (id: string) => void; onRenew: (sub: any) => void; onUpgrade: (sub: any) => void;
}) => {
  const plan = sub.plan;
  const Icon = tierIcons[plan?.tier] || Zap;
  const colors = tierColors[plan?.tier] || tierColors.free;
  const status = statusConfig[sub.status] || statusConfig.expired;
  const isExpiringSoon = sub.status === 'active' && sub.expires_at && new Date(sub.expires_at) < new Date(Date.now() + 7 * 86400000);
  const daysLeft = sub.expires_at ? Math.max(0, Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86400000)) : null;
  const profile = sub.profile;
  const business = sub.business;

  return (
    <Card className={cn('transition-all hover:shadow-md border', isExpiringSoon ? 'border-amber-400/50 bg-amber-50/5' : 'border-border/30')}>
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
                {sub.billing_cycle === 'yearly' ? (isRTL ? 'سنوي' : 'Yearly') : (isRTL ? 'شهري' : 'Monthly')}
              </Badge>
              {isExpiringSoon && (
                <Badge className="bg-amber-500/10 text-amber-600 text-[7px] px-1.5 py-0 h-3.5 gap-0.5 animate-pulse">
                  <AlertTriangle className="w-2 h-2" />
                  {isRTL ? `ينتهي خلال ${daysLeft} يوم` : `Expires in ${daysLeft}d`}
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
              <span className="tech-content font-mono">{sub.ref_id}</span>
              <span className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {format(new Date(sub.starts_at), 'dd/MM/yyyy')} → {sub.expires_at ? format(new Date(sub.expires_at), 'dd/MM/yyyy') : '∞'}
              </span>
              {daysLeft !== null && sub.status === 'active' && (
                <span className={cn('font-medium', daysLeft <= 7 ? 'text-amber-600' : daysLeft <= 30 ? 'text-foreground' : 'text-emerald-600')}>
                  {daysLeft} {isRTL ? 'يوم متبقي' : 'days left'}
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
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-accent hover:bg-accent/10" onClick={() => onUpgrade(sub)}>
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px]">{isRTL ? 'ترقية' : 'Upgrade'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => onCancel(sub.id)}>
                      <Ban className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px]">{isRTL ? 'إلغاء' : 'Cancel'}</TooltipContent>
                </Tooltip>
              </>
            )}
            {(sub.status === 'expired' || sub.status === 'cancelled') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/10" onClick={() => onRenew(sub)}>
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-[10px]">{isRTL ? 'تجديد' : 'Renew'}</TooltipContent>
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
  const { isRTL, language } = useLanguage();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [editingPlan, setEditingPlan] = useState<Record<string, unknown> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deferredSearch, setDeferredSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [featuresText, setFeaturesText] = useState('');
  const [editLimits, setEditLimits] = useState<Record<string, number | boolean>>({});
  const [upgradeSub, setUpgradeSub] = useState<Record<string, unknown> | null>(null);
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
  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['admin-membership-plans'],
    queryFn: async () => {
      const { data, error } = await supabase.from('membership_plans').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: subscriptions = [], isLoading: loadingSubs } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('membership_subscriptions')
        .select('*, plan:membership_plans(name_ar, name_en, tier)')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const userIds = useMemo(() => [...new Set(subscriptions.map((s) => s.user_id))], [subscriptions]);
  const businessIds = useMemo(() => [...new Set(subscriptions.filter((s) => s.business_id).map((s) => s.business_id))], [subscriptions]);

  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-sub-profiles', userIds],
    queryFn: async () => {
      if (!userIds.length) return [];
      const { data } = await supabase.from('profiles').select('user_id, full_name, email, avatar_url, membership_tier').in('user_id', userIds);
      return data ?? [];
    },
    enabled: userIds.length > 0,
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['admin-sub-businesses', businessIds],
    queryFn: async () => {
      if (!businessIds.length) return [];
      const { data } = await supabase.from('businesses').select('id, name_ar, name_en, membership_tier, logo_url, is_verified, is_active').in('id', businessIds);
      return data ?? [];
    },
    enabled: businessIds.length > 0,
  });

  const { data: allBusinesses = [], isLoading: loadingBiz } = useQuery({
    queryKey: ['admin-all-businesses-tiers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('businesses')
        .select('id, name_ar, name_en, membership_tier, logo_url, is_verified, is_active, username, rating_avg, rating_count, created_at')
        .order('membership_tier', { ascending: false });
      return data ?? [];
    },
    enabled: activeTab === 'businesses',
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
      const limits = limitsToJson(editLimits);
      const { error } = await supabase.from('membership_plans').update({
        name_ar: form.name_ar, name_en: form.name_en,
        description_ar: form.description_ar || null, description_en: form.description_en || null,
        price_monthly: form.price_monthly, price_yearly: form.price_yearly,
        is_active: form.is_active, sort_order: form.sort_order,
        features, limits,
      }).eq('id', (editingPlan as any).id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-membership-plans'] });
      queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
      queryClient.invalidateQueries({ queryKey: ['membership-plans-comparison'] });
      setEditingPlan(null);
      toast.success(isRTL ? 'تم تحديث الخطة بنجاح' : 'Plan updated successfully');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelSubMutation = useMutation({
    mutationFn: async (subId: string) => {
      const { error } = await supabase.rpc('cancel_subscription' , { _subscription_id: subId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-businesses-tiers'] });
      toast.success(isRTL ? 'تم إلغاء الاشتراك' : 'Subscription cancelled');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      if (!upgradeSub || !upgradeTargetPlan) return;
      const { error } = await supabase.rpc('admin_upgrade_subscription' , {
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
      toast.success(isRTL ? 'تمت الترقية بنجاح' : 'Upgrade completed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleRenew = useCallback(async (sub: any) => {
    if (!sub.plan_id || !sub.user_id) return;
    try {
      const { error } = await supabase.rpc('subscribe_to_plan' , {
        _user_id: sub.user_id,
        _plan_id: sub.plan_id,
        _business_id: sub.business_id || null,
        _billing_cycle: sub.billing_cycle,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-businesses-tiers'] });
      toast.success(isRTL ? 'تم تجديد الاشتراك' : 'Subscription renewed');
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
  }, [isRTL, queryClient]);

  const openEdit = useCallback((plan: any) => {
    setEditingPlan(plan);
    const features = Array.isArray(plan.features) ? (plan.features as string[]).join('\n') : '';
    setFeaturesText(features);
    setEditLimits(parseLimits(plan.limits as Record<string, any> | undefined));
    setForm({
      name_ar: plan.name_ar, name_en: plan.name_en,
      description_ar: plan.description_ar || '', description_en: plan.description_en || '',
      price_monthly: plan.price_monthly, price_yearly: plan.price_yearly,
      is_active: plan.is_active, sort_order: plan.sort_order,
    });
  }, []);

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
    toast.success(isRTL ? 'تم التصدير' : 'Exported');
  }, [enrichedSubs, isRTL]);

  const tabs: { key: Tab; icon: React.ElementType; label: string; count?: number }[] = [
    { key: 'overview', icon: BarChart3, label: isRTL ? 'نظرة عامة' : 'Overview' },
    { key: 'plans', icon: CreditCard, label: isRTL ? 'الخطط' : 'Plans', count: plans.length },
    { key: 'subscriptions', icon: Users, label: isRTL ? 'الاشتراكات' : 'Subscriptions', count: stats.active },
    { key: 'businesses', icon: Building2, label: isRTL ? 'الجهات' : 'Businesses' },
  ];

  if (!isAdmin) return null;

  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={200}>
        <div className="space-y-5 max-w-5xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
                <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                {isRTL ? 'إدارة العضويات والاشتراكات' : 'Membership Management'}
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                {isRTL ? 'إدارة شاملة للخطط والحدود والمزايا والاشتراكات والترقيات' : 'Plans, limits, benefits, subscriptions & upgrades'}
              </p>
            </div>
            {activeTab === 'subscriptions' && (
              <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5" onClick={exportCSV}>
                <Download className="w-3 h-3" />{isRTL ? 'تصدير CSV' : 'Export CSV'}
              </Button>
            )}
          </div>

          {/* Tab Nav */}
          <div className="flex gap-1 bg-muted/30 rounded-xl p-0.5 overflow-x-auto no-scrollbar">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all shrink-0',
                  activeTab === t.key ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50')}>
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
                {t.count !== undefined && <Badge variant="secondary" className="text-[8px] h-4 px-1">{t.count}</Badge>}
              </button>
            ))}
          </div>

          {/* ═══════ OVERVIEW ═══════ */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: Users, label: isRTL ? 'إجمالي الاشتراكات' : 'Total Subscriptions', value: stats.total, color: 'text-foreground', bg: 'bg-muted/30' },
                  { icon: UserCheck, label: isRTL ? 'نشط حالياً' : 'Currently Active', value: stats.active, color: 'text-emerald-600', bg: 'bg-emerald-500/5' },
                  { icon: DollarSign, label: isRTL ? 'الإيراد الشهري' : 'Monthly Revenue', value: `${Math.round(stats.revenue)} SAR`, color: 'text-accent', bg: 'bg-accent/5' },
                  { icon: AlertTriangle, label: isRTL ? 'ينتهي قريباً' : 'Expiring Soon', value: stats.expiringSoon, color: 'text-amber-600', bg: 'bg-amber-500/5' },
                ].map((s, i) => (
                  <Card key={i} className={cn('border-border/30', s.bg)}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-background/70 flex items-center justify-center shrink-0 shadow-sm">
                        <s.icon className={cn('w-4 h-4', s.color)} />
                      </div>
                      <div>
                        <p className={cn('font-bold text-xl leading-none', s.color)}>{s.value}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{s.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Card className="border-border/30">
                  <CardContent className="p-4 sm:p-5">
                    <h3 className="font-heading font-bold text-sm mb-4 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-accent" />
                      {isRTL ? 'توزيع العضويات' : 'Tier Distribution'}
                    </h3>
                    <div className="space-y-3">
                      {stats.tierDist.map(({ tier, count }) => {
                        const colors = tierColors[tier];
                        const Icon = tierIcons[tier];
                        const pct = stats.active > 0 ? Math.round((count / stats.active) * 100) : 0;
                        return (
                          <div key={tier} className="flex items-center gap-3">
                            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', colors.badge)}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium capitalize">{tier}</span>
                                <span className="text-[10px] text-muted-foreground">{count} ({pct}%)</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div className={cn('h-full rounded-full transition-all', tier === 'free' ? 'bg-muted-foreground/40' : tier === 'basic' ? 'bg-blue-500' : tier === 'premium' ? 'bg-accent' : 'bg-purple-500')}
                                  style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/30">
                  <CardContent className="p-4 sm:p-5">
                    <h3 className="font-heading font-bold text-sm mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-accent" />
                      {isRTL ? 'ملخص الحالة' : 'Status Summary'}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 text-center">
                        <p className="text-lg font-bold text-blue-600">{stats.monthly}</p>
                        <p className="text-[9px] text-muted-foreground">{isRTL ? 'شهري نشط' : 'Active Monthly'}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-accent/5 border border-accent/10 text-center">
                        <p className="text-lg font-bold text-accent">{stats.yearly}</p>
                        <p className="text-[9px] text-muted-foreground">{isRTL ? 'سنوي نشط' : 'Active Yearly'}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: isRTL ? 'ملغي' : 'Cancelled', value: stats.cancelled, color: 'text-destructive' },
                        { label: isRTL ? 'منتهي' : 'Expired', value: stats.expired, color: 'text-muted-foreground' },
                        { label: isRTL ? 'ينتهي خلال أسبوع' : 'Expiring (7d)', value: stats.expiringSoon, color: 'text-amber-600' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-muted/20">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className={cn('font-bold', item.color)}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ═══════ PLANS ═══════ */}
          {activeTab === 'plans' && (
            <div className="space-y-4">
              {/* Inline Edit Form */}
              {editingPlan && (
                <Card className="border-accent/30 bg-accent/5 shadow-lg">
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                        <Pencil className="w-4 h-4 text-accent" />
                        {isRTL ? 'تعديل الخطة' : 'Edit Plan'}
                        <Badge className={cn('text-[9px]', tierColors[editingPlan.tier]?.badge)}>{editingPlan.tier}</Badge>
                      </h3>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingPlan(null)}><X className="w-4 h-4" /></Button>
                    </div>

                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-[10px]">{isRTL ? 'الاسم (عربي)' : 'Name (AR)'}</Label><Input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} className="h-9 text-xs mt-1" /></div>
                      <div><Label className="text-[10px]">{isRTL ? 'الاسم (إنجليزي)' : 'Name (EN)'}</Label><Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} className="h-9 text-xs mt-1" /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label className="text-[10px]">{isRTL ? 'السعر الشهري' : 'Monthly Price'}</Label><Input type="number" value={form.price_monthly} onChange={e => setForm(f => ({ ...f, price_monthly: parseFloat(e.target.value) || 0 }))} className="h-9 text-xs mt-1" /></div>
                      <div><Label className="text-[10px]">{isRTL ? 'السعر السنوي' : 'Yearly Price'}</Label><Input type="number" value={form.price_yearly} onChange={e => setForm(f => ({ ...f, price_yearly: parseFloat(e.target.value) || 0 }))} className="h-9 text-xs mt-1" /></div>
                      <div><Label className="text-[10px]">{isRTL ? 'الترتيب' : 'Sort Order'}</Label><Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className="h-9 text-xs mt-1" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-[10px]">{isRTL ? 'الوصف (عربي)' : 'Description (AR)'}</Label><Textarea value={form.description_ar} onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))} rows={2} className="text-xs mt-1" /></div>
                      <div><Label className="text-[10px]">{isRTL ? 'الوصف (إنجليزي)' : 'Description (EN)'}</Label><Textarea value={form.description_en} onChange={e => setForm(f => ({ ...f, description_en: e.target.value }))} rows={2} className="text-xs mt-1" /></div>
                    </div>

                    {/* Features text */}
                    <div>
                      <Label className="text-[10px]">{isRTL ? 'المميزات النصية (سطر لكل ميزة)' : 'Text Features (one per line)'}</Label>
                      <Textarea value={featuresText} onChange={e => setFeaturesText(e.target.value)} rows={4} className="text-xs mt-1" />
                    </div>

                    {/* ── Structured Limits Editor ── */}
                    <div className="border border-border/30 rounded-xl p-4 bg-background/50">
                      <div className="flex items-center gap-2 mb-4">
                        <Settings2 className="w-4 h-4 text-accent" />
                        <h4 className="font-heading font-bold text-sm">{isRTL ? 'حدود ومزايا الباقة' : 'Plan Limits & Benefits'}</h4>
                        <Badge variant="outline" className="text-[8px] ms-auto">
                          {LIMIT_FIELDS.filter(f => f.type === 'boolean' && editLimits[f.key] === true).length}/{LIMIT_FIELDS.filter(f => f.type === 'boolean').length} {isRTL ? 'مفعّل' : 'enabled'}
                        </Badge>
                      </div>
                      <LimitsEditor limits={editLimits} onChange={setEditLimits} isRTL={isRTL} language={language} />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                        <Label className="text-xs">{isRTL ? 'مفعّل' : 'Active'}</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setEditingPlan(null)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                        <Button size="sm" className="text-xs h-8 gap-1.5" onClick={() => updatePlanMutation.mutate()} disabled={updatePlanMutation.isPending}>
                          {updatePlanMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          {isRTL ? 'حفظ التعديلات' : 'Save Changes'}
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
                        {isRTL ? 'ترقية الاشتراك' : 'Upgrade Subscription'}
                      </h3>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setUpgradeSub(null)}><X className="w-4 h-4" /></Button>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 mb-4">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={upgradeSub.profile?.avatar_url} />
                        <AvatarFallback className="text-[10px]">{upgradeSub.profile?.full_name?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-medium">{upgradeSub.profile?.full_name || '—'}</p>
                        <p className="text-[9px] text-muted-foreground">
                          {isRTL ? 'الخطة الحالية:' : 'Current:'} {upgradeSub.plan?.name_ar || upgradeSub.plan?.name_en}
                          {upgradeSub.business && ` • ${isRTL ? upgradeSub.business.name_ar : (upgradeSub.business.name_en || upgradeSub.business.name_ar)}`}
                        </p>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 mb-4">
                      <div>
                        <Label className="text-[10px]">{isRTL ? 'الخطة الجديدة' : 'New Plan'}</Label>
                        <Select value={upgradeTargetPlan} onValueChange={setUpgradeTargetPlan}>
                          <SelectTrigger className="h-9 text-xs mt-1"><SelectValue placeholder={isRTL ? 'اختر الخطة...' : 'Select plan...'} /></SelectTrigger>
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
                        <Label className="text-[10px]">{isRTL ? 'دورة الفوترة' : 'Billing Cycle'}</Label>
                        <Select value={upgradeCycle} onValueChange={setUpgradeCycle}>
                          <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">{isRTL ? 'شهري' : 'Monthly'}</SelectItem>
                            <SelectItem value="yearly">{isRTL ? 'سنوي' : 'Yearly'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setUpgradeSub(null)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                      <Button size="sm" className="text-xs h-8 gap-1.5" onClick={() => upgradeMutation.mutate()} disabled={!upgradeTargetPlan || upgradeMutation.isPending}>
                        {upgradeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUpCircle className="w-3 h-3" />}
                        {isRTL ? 'تأكيد الترقية' : 'Confirm Upgrade'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Filters */}
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder={isRTL ? 'بحث بالمعرف، الاسم، البريد...' : 'Search by ref, name, email...'}
                    value={searchQuery} onChange={e => handleSearchChange(e.target.value)} className="h-9 text-xs ps-8" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRTL ? 'جميع الحالات' : 'All Status'}</SelectItem>
                    {Object.entries(statusConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{isRTL ? v.label_ar : v.label_en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger className="h-9 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRTL ? 'جميع الباقات' : 'All Tiers'}</SelectItem>
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
                  {isRTL ? 'لا توجد اشتراكات مطابقة' : 'No matching subscriptions'}
                </CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {filteredSubs.map((sub) => (
                    <SubRow key={sub.id} sub={sub} isRTL={isRTL} language={language} plans={plans}
                      onCancel={(id) => cancelSubMutation.mutate(id)}
                      onRenew={handleRenew}
                      onUpgrade={(s) => { setUpgradeSub(s); setUpgradeTargetPlan(''); }} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════ BUSINESSES ═══════ */}
          {activeTab === 'businesses' && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder={isRTL ? 'بحث عن جهة...' : 'Search businesses...'} value={searchQuery}
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
                              {biz.is_verified && <Shield className="w-3 h-3 text-emerald-500 shrink-0" />}
                              {!biz.is_active && <Badge variant="outline" className="text-[7px] h-3 px-1 text-destructive">{isRTL ? 'معطل' : 'Inactive'}</Badge>}
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
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
};

export default AdminMemberships;
