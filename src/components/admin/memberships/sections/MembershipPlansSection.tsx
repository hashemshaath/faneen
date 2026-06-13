/**
 * Presentational plans tab for AdminMemberships.
 * Contains internal PlanCard and LimitsEditor presentational sub-components.
 * Pure UI — receives plans, form state and callbacks from the parent.
 * No Supabase, no queries, no mutations.
 */
import React, { useCallback } from 'react';
import type { Database } from '@/integrations/supabase/types';
import { pickBi } from '@/components/common/Bilingual';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Pencil, Loader2, Users, X, Check, Save, Zap, Settings2, Eye, Sparkles,
  Plus, Shield,
} from 'lucide-react';
import { TIERS, tierIcons, tierColors } from '@/lib/membership-tiers';
import { LIMIT_FIELDS, LIMIT_CATEGORIES, parseLimits, getExtraLimitKeys } from '@/lib/membership-limits';
import { cn } from '@/lib/utils';

type AdminMembershipPlanRow = Database['public']['Tables']['membership_plans']['Row'];
type AdminMembershipLimitsInput = Record<string, unknown> | undefined;

export type AdminMembershipEditingPlan = Partial<AdminMembershipPlanRow> & {
  tier: AdminMembershipPlanRow['tier'];
  _new?: boolean;
};

export interface MembershipPlanFormState {
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  price_monthly: number;
  price_yearly: number;
  is_active: boolean;
  sort_order: number;
}

/* ─── Internal: Plan Card ─── */
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

interface PlanCardProps {
  plan: AdminMembershipPlanRow;
  isRTL: boolean;
  language: string;
  subsCount: number;
  onEdit: (p: AdminMembershipPlanRow) => void;
}

const PlanCard = React.memo(({ plan, isRTL, subsCount, onEdit }: PlanCardProps) => {
  const Icon = tierIcons[plan.tier] || Zap;
  const colors = tierColors[plan.tier] || tierColors.free;
  const features = Array.isArray(plan.features) ? (plan.features as string[]) : [];
  const limits = parseLimits(plan.limits as AdminMembershipLimitsInput);
  const extraKeys = getExtraLimitKeys(plan.limits as AdminMembershipLimitsInput);
  const enabledBoolLimits = LIMIT_FIELDS.filter((f) => f.type === 'boolean' && limits[f.key] === true).length;
  const totalBoolLimits = LIMIT_FIELDS.filter((f) => f.type === 'boolean').length;
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

        {tierDesc && (
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 min-h-[2rem]">{tierDesc}</p>
        )}

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
                    : pickBi(isRTL, 'بدون خطة سنوية', 'No yearly')}
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

        <div className="pt-3 border-t border-border/40">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
              {pickBi(isRTL, 'الحدود الرئيسية', 'Key Limits')}
            </p>
            {extraKeys.length > 0 && (
              <span className="text-[9px] text-muted-foreground/80 italic" title={extraKeys.join(', ')}>
                +{extraKeys.length} {pickBi(isRTL, 'إضافي', 'extra')}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {LIMIT_FIELDS.filter((f) => f.type === 'number').slice(0, 6).map((field) => {
              const val = limits[field.key] as number;
              const unlimited = val === 0;
              return (
                <div
                  key={field.key}
                  className={cn(
                    'flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg border',
                    unlimited ? 'bg-muted/20 border-dashed border-border/50' : 'bg-background border-border/60',
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

/* ─── Internal: Structured Limits Editor ─── */
interface LimitsEditorProps {
  limits: Record<string, number | boolean>;
  onChange: (limits: Record<string, number | boolean>) => void;
  isRTL: boolean;
  language: string;
}
const LimitsEditor = React.memo(({ limits, onChange, language }: LimitsEditorProps) => {
  const updateField = useCallback((key: string, value: number | boolean) => {
    onChange({ ...limits, [key]: value });
  }, [limits, onChange]);

  return (
    <div className="space-y-4">
      {LIMIT_CATEGORIES.map((cat) => {
        const fields = LIMIT_FIELDS.filter((f) => f.category === cat.key);
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
              {fields.map((field) => (
                <div key={field.key} className="flex items-center gap-3 py-1.5 px-2 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{language === 'ar' ? field.label.ar : field.label.en}</p>
                    <p className="text-[9px] text-muted-foreground line-clamp-1">{language === 'ar' ? field.description.ar : field.description.en}</p>
                  </div>
                  {field.type === 'boolean' ? (
                    <Switch
                      checked={!!limits[field.key]}
                      onCheckedChange={(v) => updateField(field.key, v)}
                    />
                  ) : (
                    <Input
                      type="number"
                      min={0}
                      value={limits[field.key] as number}
                      onChange={(e) => updateField(field.key, parseInt(e.target.value) || 0)}
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

/* ─── Section ─── */
export interface MembershipPlansSectionProps {
  plans: AdminMembershipPlanRow[];
  loadingPlans: boolean;
  isRTL: boolean;
  language: string;
  planSubCounts: Record<string, number>;
  editingPlan: AdminMembershipEditingPlan | null;
  form: MembershipPlanFormState;
  setForm: React.Dispatch<React.SetStateAction<MembershipPlanFormState>>;
  featuresText: string;
  setFeaturesText: (value: string) => void;
  editLimits: Record<string, number | boolean>;
  setEditLimits: (limits: Record<string, number | boolean>) => void;
  onOpenCreate: (tier: typeof TIERS[number]) => void;
  onOpenEdit: (plan: AdminMembershipPlanRow) => void;
  onCloseEdit: () => void;
  onSubmit: () => void;
  isSaving: boolean;
}

export const MembershipPlansSection: React.FC<MembershipPlansSectionProps> = ({
  plans, loadingPlans, isRTL, language, planSubCounts,
  editingPlan, form, setForm, featuresText, setFeaturesText,
  editLimits, setEditLimits, onOpenCreate, onOpenEdit, onCloseEdit, onSubmit, isSaving,
}) => {
  return (
    <div className="space-y-4">
      {!editingPlan && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[11px] text-muted-foreground">
            {pickBi(isRTL, 'الخطط تُعرض على /membership تلقائياً عند تفعيلها.', 'Active plans are auto-listed on /membership.')}
          </p>
          <div className="flex items-center gap-1.5">
            <Label className="text-[10px] text-muted-foreground">{pickBi(isRTL, 'إنشاء بمستوى:', 'Create as:')}</Label>
            <Select onValueChange={(v) => onOpenCreate(v as typeof TIERS[number])}>
              <SelectTrigger className="h-8 w-[140px] text-xs gap-1.5">
                <Plus className="w-3 h-3" />
                <SelectValue placeholder={pickBi(isRTL, 'اختر المستوى', 'Pick tier')} />
              </SelectTrigger>
              <SelectContent>
                {TIERS.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize text-xs">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {editingPlan && (
        <Card className="border-accent/30 bg-accent/5 shadow-lg">
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                {editingPlan._new ? <Plus className="w-4 h-4 text-accent" /> : <Pencil className="w-4 h-4 text-accent" />}
                {editingPlan._new
                  ? pickBi(isRTL, 'إنشاء خطة جديدة', 'Create Plan')
                  : pickBi(isRTL, 'تعديل الخطة', 'Edit Plan')}
                <Badge className={cn('text-[9px]', tierColors[editingPlan.tier]?.badge)}>{editingPlan.tier}</Badge>
              </h3>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCloseEdit} aria-label="Action"><X className="w-4 h-4" /></Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[10px]">{pickBi(isRTL, 'الاسم (عربي)', 'Name (AR)')}</Label><Input value={form.name_ar} onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))} className="h-9 text-xs mt-1" /></div>
              <div><Label className="text-[10px]">{pickBi(isRTL, 'الاسم (إنجليزي)', 'Name (EN)')}</Label><Input value={form.name_en} onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))} className="h-9 text-xs mt-1" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-[10px]">{pickBi(isRTL, 'السعر الشهري', 'Monthly Price')}</Label><Input type="number" value={form.price_monthly} onChange={(e) => setForm((f) => ({ ...f, price_monthly: parseFloat(e.target.value) || 0 }))} className="h-9 text-xs mt-1" /></div>
              <div><Label className="text-[10px]">{pickBi(isRTL, 'السعر السنوي', 'Yearly Price')}</Label><Input type="number" value={form.price_yearly} onChange={(e) => setForm((f) => ({ ...f, price_yearly: parseFloat(e.target.value) || 0 }))} className="h-9 text-xs mt-1" /></div>
              <div><Label className="text-[10px]">{pickBi(isRTL, 'الترتيب', 'Sort Order')}</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className="h-9 text-xs mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[10px]">{pickBi(isRTL, 'الوصف (عربي)', 'Description (AR)')}</Label><Textarea value={form.description_ar} onChange={(e) => setForm((f) => ({ ...f, description_ar: e.target.value }))} rows={2} className="text-xs mt-1" /></div>
              <div><Label className="text-[10px]">{pickBi(isRTL, 'الوصف (إنجليزي)', 'Description (EN)')}</Label><Textarea value={form.description_en} onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))} rows={2} className="text-xs mt-1" /></div>
            </div>

            <div>
              <Label className="text-[10px]">{pickBi(isRTL, 'المميزات النصية (سطر لكل ميزة)', 'Text Features (one per line)')}</Label>
              <Textarea value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} rows={4} className="text-xs mt-1" />
            </div>

            <div className="border border-border/30 rounded-xl p-4 bg-background/50">
              <div className="flex items-center gap-2 mb-4">
                <Settings2 className="w-4 h-4 text-accent" />
                <h4 className="font-heading font-bold text-sm">{pickBi(isRTL, 'حدود ومزايا الباقة', 'Plan Limits & Benefits')}</h4>
                <Badge variant="outline" className="text-[8px] ms-auto">
                  {LIMIT_FIELDS.filter((f) => f.type === 'boolean' && editLimits[f.key] === true).length}/{LIMIT_FIELDS.filter((f) => f.type === 'boolean').length} {pickBi(isRTL, 'مفعّل', 'enabled')}
                </Badge>
              </div>
              <LimitsEditor limits={editLimits} onChange={setEditLimits} isRTL={isRTL} language={language} />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
                <Label className="text-xs">{pickBi(isRTL, 'مفعّل', 'Active')}</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs h-8" onClick={onCloseEdit}>{pickBi(isRTL, 'إلغاء', 'Cancel')}</Button>
                <Button size="sm" className="text-xs h-8 gap-1.5" onClick={onSubmit} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
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
            <PlanCard key={plan.id} plan={plan} isRTL={isRTL} language={language} subsCount={planSubCounts[plan.id] || 0} onEdit={onOpenEdit} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MembershipPlansSection;