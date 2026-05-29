import React from 'react';
import { cn } from '@/lib/utils';
import { Check, X, Megaphone, Home, TrendingUp, Sparkles, Award, FolderOpen, Briefcase, Image as ImageIcon, Users, Layers, Mail, Phone, Headset, Bell, Zap } from 'lucide-react';
import {
  LIMIT_FIELDS,
  LIMIT_CATEGORIES,
  parseLimits,
  type LimitField,
} from '@/lib/membership-limits';

type LucideIcon = React.ComponentType<{ className?: string }>;

const ICON_MAP: Record<string, LucideIcon> = {
  Megaphone, Home, TrendingUp, Sparkles, Award,
  FolderOpen, Briefcase, Image: ImageIcon, Users, Layers,
  Mail, Phone, Headset, Bell, Zap,
};

interface PlanFeatureTabsProps {
  /** Raw `limits` JSONB from membership_plans row. */
  limits: unknown;
  isRTL: boolean;
  /** Highlight style (premium uses accent). */
  emphasized?: boolean;
  className?: string;
}

/**
 * Interactive tabs that display plan features grouped by category
 * (visibility, content, operations, support). Reads from the canonical
 * LIMIT_FIELDS so every plan card stays in sync with the admin matrix.
 */
export const PlanFeatureTabs = React.memo(({ limits, isRTL, emphasized = false, className }: PlanFeatureTabsProps) => {
  const parsed = React.useMemo(
    () => parseLimits(limits as Record<string, unknown> | undefined),
    [limits],
  );
  const [active, setActive] = React.useState<string>(LIMIT_CATEGORIES[0].key);

  const categoryFields = React.useMemo(() => {
    const map: Record<string, LimitField[]> = {};
    for (const cat of LIMIT_CATEGORIES) {
      map[cat.key] = LIMIT_FIELDS.filter((f) => f.category === cat.key);
    }
    return map;
  }, []);

  const fields = categoryFields[active] ?? [];

  const formatValue = (field: LimitField): { kind: 'bool'; on: boolean } | { kind: 'num'; text: string; unlimited: boolean } => {
    const v = parsed[field.key];
    if (field.type === 'boolean') return { kind: 'bool', on: !!v };
    const n = typeof v === 'number' ? v : Number(v ?? 0);
    const unlimited = field.key.startsWith('max_') && n === 0;
    return { kind: 'num', text: unlimited ? (isRTL ? 'غير محدود' : 'Unlimited') : String(n), unlimited };
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Tabs strip */}
      <div
        role="tablist"
        aria-label={isRTL ? 'فئات مزايا الباقة' : 'Plan feature categories'}
        className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-muted/40 p-1 mb-3"
      >
        {LIMIT_CATEGORIES.map((cat) => {
          const isActive = cat.key === active;
          return (
            <button
              key={cat.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(cat.key)}
              className={cn(
                'shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? emphasized
                    ? 'bg-accent text-accent-foreground shadow-sm'
                    : 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {isRTL ? cat.label.ar : cat.label.en}
            </button>
          );
        })}
      </div>

      {/* Category fields */}
      <ul className="space-y-2" role="tabpanel">
        {fields.map((field) => {
          const Icon = ICON_MAP[field.icon] ?? Zap;
          const v = formatValue(field);
          const isOff = (v.kind === 'bool' && !v.on) || (v.kind === 'num' && v.text === '0');
          return (
            <li
              key={field.key}
              className={cn(
                'flex items-center gap-2.5 text-[12.5px] leading-snug',
                isOff && 'opacity-55',
              )}
            >
              <div className={cn(
                'w-6 h-6 rounded-md flex items-center justify-center shrink-0',
                emphasized ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground',
              )}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="flex-1 text-foreground/85 truncate">
                {isRTL ? field.label.ar : field.label.en}
              </span>
              {v.kind === 'bool' ? (
                v.on ? (
                  <Check className={cn('w-4 h-4', emphasized ? 'text-accent' : 'text-success')} strokeWidth={3} />
                ) : (
                  <X className="w-4 h-4 text-muted-foreground/60" />
                )
              ) : (
                <span className={cn(
                  'tech-content text-[11.5px] font-bold shrink-0 px-1.5 py-0.5 rounded-md',
                  v.unlimited
                    ? (emphasized ? 'bg-accent/15 text-accent' : 'bg-success/10 text-success')
                    : isOff
                      ? 'text-muted-foreground'
                      : 'text-foreground',
                )}>
                  {v.unlimited ? '∞' : v.text}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
});

PlanFeatureTabs.displayName = 'PlanFeatureTabs';