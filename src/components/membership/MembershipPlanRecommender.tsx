import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowDown, RotateCcw, Wand2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Interactive plan recommender (ROI helper) — asks 3 short questions
 * and recommends a tier. Inline, no popups. The "Apply" CTA scrolls to
 * the recommended plan card and triggers a temporary highlight ring.
 */

type SizeAnswer = 'solo' | 'small' | 'mid' | 'large';
type VolumeAnswer = 'low' | 'med' | 'high' | 'pro';
type PriorityAnswer = 'visibility' | 'leads' | 'tools' | 'enterprise';

interface Props {
  isRTL: boolean;
  onApply: (tier: string) => void;
}

const recommend = (
  size: SizeAnswer | null,
  volume: VolumeAnswer | null,
  priority: PriorityAnswer | null,
): string => {
  if (!size || !volume || !priority) return 'basic';
  if (priority === 'enterprise' || size === 'large' || volume === 'pro') return 'enterprise';
  if (priority === 'tools' || volume === 'high' || size === 'mid') return 'premium';
  if (volume === 'low' && size === 'solo' && priority === 'visibility') return 'free';
  return 'basic';
};

const labelForTier = (tier: string, isRTL: boolean) => {
  const map: Record<string, [string, string]> = {
    free: ['الباقة المجانية', 'Free plan'],
    basic: ['الباقة الأساسية', 'Basic plan'],
    premium: ['باقة بريميوم', 'Premium plan'],
    enterprise: ['باقة المؤسسات', 'Enterprise plan'],
  };
  const [ar, en] = map[tier] ?? ['Basic', 'Basic'];
  return isRTL ? ar : en;
};

export const MembershipPlanRecommender: React.FC<Props> = ({ isRTL, onApply }) => {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<SizeAnswer | null>(null);
  const [volume, setVolume] = useState<VolumeAnswer | null>(null);
  const [priority, setPriority] = useState<PriorityAnswer | null>(null);

  const result = useMemo(() => recommend(size, volume, priority), [size, volume, priority]);
  const complete = !!(size && volume && priority);

  const reset = () => {
    setSize(null);
    setVolume(null);
    setPriority(null);
  };

  const SizeOpts: { v: SizeAnswer; ar: string; en: string }[] = [
    { v: 'solo', ar: 'فردي', en: 'Solo' },
    { v: 'small', ar: '٢-٥ موظفين', en: '2-5 staff' },
    { v: 'mid', ar: '٦-٢٠ موظفًا', en: '6-20 staff' },
    { v: 'large', ar: '+٢٠ موظفًا', en: '20+ staff' },
  ];
  const VolumeOpts: { v: VolumeAnswer; ar: string; en: string }[] = [
    { v: 'low', ar: '<٥ عقود/شهر', en: '<5 contracts/mo' },
    { v: 'med', ar: '٥-٢٠', en: '5-20' },
    { v: 'high', ar: '٢١-٥٠', en: '21-50' },
    { v: 'pro', ar: '+٥٠', en: '50+' },
  ];
  const PriorityOpts: { v: PriorityAnswer; ar: string; en: string }[] = [
    { v: 'visibility', ar: 'الظهور والتسويق', en: 'Visibility & marketing' },
    { v: 'leads', ar: 'استلام العملاء', en: 'Lead generation' },
    { v: 'tools', ar: 'أدوات الذكاء والتحليلات', en: 'AI & analytics' },
    { v: 'enterprise', ar: 'دعم مخصص ومتعدد الفروع', en: 'Multi-branch & support' },
  ];

  const OptionGroup = <T extends string>({
    options, value, onChange, label,
  }: {
    options: { v: T; ar: string; en: string }[];
    value: T | null;
    onChange: (v: T) => void;
    label: string;
  }) => (
    <div>
      <p className="text-xs font-semibold text-foreground/80 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
              value === o.v
                ? 'border-accent bg-accent text-accent-foreground shadow-sm'
                : 'border-border/60 bg-background hover:border-accent/40 hover:bg-accent/5 text-foreground/80',
            )}
          >
            {isRTL ? o.ar : o.en}
          </button>
        ))}
      </div>
    </div>
  );

  if (!open) {
    return (
      <div className="max-w-3xl mx-auto mb-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group w-full rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/5 via-card to-primary/5 px-5 py-4 flex items-center gap-3 text-start hover:border-accent/50 transition-all hover-lift"
        >
          <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Wand2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {isRTL ? 'لست متأكدًا من الباقة المناسبة؟' : 'Not sure which plan fits?'}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isRTL
                ? '٣ أسئلة سريعة وسنرشّح لك الباقة الأنسب لحجم نشاطك.'
                : '3 quick questions and we will recommend the right plan for your size.'}
            </p>
          </div>
          <Badge variant="outline" className="hidden sm:inline-flex gap-1 text-[10px]">
            <Sparkles className="w-2.5 h-2.5" />
            {isRTL ? 'مساعد ذكي' : 'AI helper'}
          </Badge>
        </button>
      </div>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto mb-6 border-accent/30 bg-gradient-to-br from-accent/5 via-card to-primary/5">
      <CardContent className="p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-foreground">
                {isRTL ? 'مساعد اختيار الباقة' : 'Plan recommender'}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {isRTL ? 'إجابتك لا تُحفظ ولا تُرسل لأي جهة' : 'Your answers are not stored or shared'}
              </p>
            </div>
          </div>
          <Button size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={reset}>
            <RotateCcw className="w-3.5 h-3.5" />
            {isRTL ? 'إعادة' : 'Reset'}
          </Button>
        </div>

        <OptionGroup
          options={SizeOpts}
          value={size}
          onChange={setSize}
          label={isRTL ? '١. حجم منشأتك؟' : '1. Business size?'}
        />
        <OptionGroup
          options={VolumeOpts}
          value={volume}
          onChange={setVolume}
          label={isRTL ? '٢. كم عقدًا تتوقّع شهريًا؟' : '2. Expected monthly contracts?'}
        />
        <OptionGroup
          options={PriorityOpts}
          value={priority}
          onChange={setPriority}
          label={isRTL ? '٣. أهم أولوية لك؟' : '3. Top priority?'}
        />

        {complete && (
          <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 flex flex-wrap items-center gap-3 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
            <div className="flex-1 min-w-[180px]">
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'التوصية الأنسب لك:' : 'Best fit for you:'}
              </p>
              <p className="text-sm font-bold text-foreground">{labelForTier(result, isRTL)}</p>
            </div>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => onApply(result)}
            >
              <ArrowDown className="w-3.5 h-3.5" />
              {isRTL ? 'عرض الباقة' : 'Show plan'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MembershipPlanRecommender;