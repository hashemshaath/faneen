import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Rocket, ShieldCheck, Phone, Link2, Beaker, EyeOff } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';

export type BusinessesCommandPreset =
  | 'all'
  | 'pilotReady'
  | 'pendingReview'
  | 'missingContact'
  | 'missingPublicLink'
  | 'inactive'
  | 'demo';

interface BusinessesCommandBarProps {
  isRTL: boolean;
  activePreset: BusinessesCommandPreset;
  onPreset: (key: BusinessesCommandPreset) => void;
  onCreate: () => void;
}

/**
 * New command toolbar for the Businesses tab — replaces the old
 * Approvals banner + leading legacy filters bar as the FIRST
 * experience inside the tab. Operates on chip presets that map to
 * the existing URL params (status/origin/q) so it composes with the
 * legacy data engine without duplicating it.
 */
export const BusinessesCommandBar: React.FC<BusinessesCommandBarProps> = ({
  isRTL, activePreset, onPreset, onCreate,
}) => {
  const chips: ReadonlyArray<{ key: BusinessesCommandPreset; label: string; icon: React.ElementType }> = [
    { key: 'all',               label: pickBi(isRTL, 'الكل', 'All'),                       icon: ShieldCheck },
    { key: 'pilotReady',        label: pickBi(isRTL, 'جاهزة للتشغيل', 'Pilot-ready'),       icon: Rocket },
    { key: 'pendingReview',     label: pickBi(isRTL, 'بانتظار المراجعة', 'Pending review'), icon: ShieldCheck },
    { key: 'missingContact',    label: pickBi(isRTL, 'بدون تواصل', 'No contact'),           icon: Phone },
    { key: 'missingPublicLink', label: pickBi(isRTL, 'بدون رابط عام', 'No public link'),    icon: Link2 },
    { key: 'inactive',          label: pickBi(isRTL, 'غير نشطة', 'Inactive'),               icon: EyeOff },
    { key: 'demo',              label: pickBi(isRTL, 'تجريبية', 'Demo'),                    icon: Beaker },
  ];

  return (
    <Card
      className="rounded-3xl border-border/60 bg-card/80 backdrop-blur-sm p-3 md:p-4 flex flex-wrap items-center gap-2"
      data-testid="businesses-command-bar"
    >
      <Button size="sm" onClick={onCreate} className="h-9 rounded-full gap-1.5">
        <Plus className="h-4 w-4" />
        {pickBi(isRTL, 'إضافة جهة', 'Add business')}
      </Button>

      <span className="h-6 w-px bg-border/60 mx-1 hidden md:inline-block" aria-hidden />

      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => {
          const Icon = c.icon;
          const active = activePreset === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onPreset(c.key)}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-xs font-medium transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-foreground border-border hover:bg-muted/60'
              }`}
              data-testid={`businesses-preset-${c.key}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {c.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
};

export default BusinessesCommandBar;