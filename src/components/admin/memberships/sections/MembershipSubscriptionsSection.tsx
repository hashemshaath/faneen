/**
 * Presentational subscriptions tab for AdminMemberships.
 * Contains the internal SubRow presentational sub-component.
 * Pure UI — receives data, filter state, and callbacks from the parent.
 * No Supabase, no queries, no mutations.
 */
import React from 'react';
import type { Database } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { pickBi } from '@/components/common/Bilingual';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ReferenceBadge } from '@/components/reference/ReferenceBadge';
import {
  Loader2, Users, X, Zap, Building2, AlertTriangle, Clock, Ban,
  RefreshCw, Search, CalendarDays, ArrowUpCircle, Hash,
} from 'lucide-react';
import { TIERS, tierIcons, tierColors, statusConfig } from '@/lib/membership-tiers';
import { cn } from '@/lib/utils';

type AdminMembershipPlanRow = Database['public']['Tables']['membership_plans']['Row'];
type AdminMembershipSubscriptionRow = Database['public']['Tables']['membership_subscriptions']['Row'];

export type AdminMembershipProfileLite = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  membership_tier: string | null;
};

export type AdminMembershipBusinessLite = {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  membership_tier: string | null;
  logo_url: string | null;
  is_verified: boolean | null;
  is_active: boolean | null;
};

export interface AdminMembershipEnrichedSubscription extends AdminMembershipSubscriptionRow {
  plan: { name_ar: string | null; name_en: string | null; tier: string | null } | null;
  profile: AdminMembershipProfileLite | null;
  business: AdminMembershipBusinessLite | null;
}

/* ─── Internal: Subscription Row ─── */
interface SubRowProps {
  sub: AdminMembershipEnrichedSubscription;
  isRTL: boolean;
  language: string;
  plans: AdminMembershipPlanRow[];
  onCancel: (id: string) => void;
  onRenew: (sub: AdminMembershipEnrichedSubscription) => void;
  onUpgrade: (sub: AdminMembershipEnrichedSubscription) => void;
}

const SubRow = React.memo(({ sub, isRTL, onCancel, onRenew, onUpgrade }: SubRowProps) => {
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
                {sub.billing_cycle === 'yearly' ? pickBi(isRTL, 'سنوي', 'Yearly') : pickBi(isRTL, 'شهري', 'Monthly')}
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
                    <AvatarImage src={profile.avatar_url ?? undefined} />
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

/* ─── Section ─── */
export interface MembershipSubscriptionsSectionProps {
  filteredSubs: AdminMembershipEnrichedSubscription[];
  loadingSubs: boolean;
  plans: AdminMembershipPlanRow[];
  isRTL: boolean;
  language: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  tierFilter: string;
  onTierFilterChange: (value: string) => void;
  upgradeSub: AdminMembershipEnrichedSubscription | null;
  onCloseUpgrade: () => void;
  upgradeTargetPlan: string;
  onUpgradeTargetPlanChange: (value: string) => void;
  upgradeCycle: string;
  onUpgradeCycleChange: (value: string) => void;
  isUpgrading: boolean;
  onUpgradeConfirm: () => void;
  onCancelSub: (sub: AdminMembershipEnrichedSubscription) => void;
  onRenewSub: (sub: AdminMembershipEnrichedSubscription) => void;
  onOpenUpgrade: (sub: AdminMembershipEnrichedSubscription) => void;
}

export const MembershipSubscriptionsSection: React.FC<MembershipSubscriptionsSectionProps> = ({
  filteredSubs, loadingSubs, plans, isRTL, language,
  searchQuery, onSearchChange,
  statusFilter, onStatusFilterChange, tierFilter, onTierFilterChange,
  upgradeSub, onCloseUpgrade, upgradeTargetPlan, onUpgradeTargetPlanChange,
  upgradeCycle, onUpgradeCycleChange, isUpgrading, onUpgradeConfirm,
  onCancelSub, onRenewSub, onOpenUpgrade,
}) => {
  return (
    <div className="space-y-4">
      {upgradeSub && (
        <Card className="border-accent/30 bg-accent/5 shadow-lg animate-in slide-in-from-top-2 duration-300">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                <ArrowUpCircle className="w-4 h-4 text-accent" />
                {pickBi(isRTL, 'ترقية الاشتراك', 'Upgrade Subscription')}
              </h3>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCloseUpgrade} aria-label="Action"><X className="w-4 h-4" /></Button>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 mb-4">
              <Avatar className="w-8 h-8">
                <AvatarImage src={upgradeSub.profile?.avatar_url ?? undefined} />
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
                <Select value={upgradeTargetPlan} onValueChange={onUpgradeTargetPlanChange}>
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
                <Select value={upgradeCycle} onValueChange={onUpgradeCycleChange}>
                  <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">{pickBi(isRTL, 'شهري', 'Monthly')}</SelectItem>
                    <SelectItem value="yearly">{pickBi(isRTL, 'سنوي', 'Yearly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" className="text-xs h-8" onClick={onCloseUpgrade}>{pickBi(isRTL, 'إلغاء', 'Cancel')}</Button>
              <Button size="sm" className="text-xs h-8 gap-1.5" onClick={onUpgradeConfirm} disabled={!upgradeTargetPlan || isUpgrading}>
                {isUpgrading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUpCircle className="w-3 h-3" />}
                {pickBi(isRTL, 'تأكيد الترقية', 'Confirm Upgrade')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder={pickBi(isRTL, 'بحث بالمعرف، الاسم، البريد...', 'Search by ref, name, email...')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 text-xs ps-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="h-9 w-[120px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{pickBi(isRTL, 'جميع الحالات', 'All Status')}</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{isRTL ? v.label_ar : v.label_en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={onTierFilterChange}>
          <SelectTrigger className="h-9 w-[120px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{pickBi(isRTL, 'جميع الباقات', 'All Tiers')}</SelectItem>
            {TIERS.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
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
            <SubRow
              key={sub.id}
              sub={sub}
              isRTL={isRTL}
              language={language}
              plans={plans}
              onCancel={() => onCancelSub(sub)}
              onRenew={onRenewSub}
              onUpgrade={onOpenUpgrade}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MembershipSubscriptionsSection;