import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Rocket, ShieldCheck, Phone, Link2, Beaker, EyeOff } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import { ControlChip, type ChipTone } from './ControlChip';

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
  const chips: ReadonlyArray<{ key: BusinessesCommandPreset; label: string; icon: React.ElementType; tone: ChipTone }> = [
    { key: 'all',               label: pickBi(isRTL, 'الكل', 'All'),                       icon: ShieldCheck, tone: 'primary' },
    { key: 'pilotReady',        label: pickBi(isRTL, 'جاهزة للتشغيل', 'Pilot-ready'),       icon: Rocket,      tone: 'success' },
    { key: 'pendingReview',     label: pickBi(isRTL, 'بانتظار المراجعة', 'Pending review'), icon: ShieldCheck, tone: 'warning' },
    { key: 'missingContact',    label: pickBi(isRTL, 'بدون تواصل', 'No contact'),           icon: Phone,       tone: 'destructive' },
    { key: 'missingPublicLink', label: pickBi(isRTL, 'بدون رابط عام', 'No public link'),    icon: Link2,       tone: 'info' },
    { key: 'inactive',          label: pickBi(isRTL, 'غير نشطة', 'Inactive'),               icon: EyeOff,      tone: 'muted' },
    { key: 'demo',              label: pickBi(isRTL, 'تجريبية', 'Demo'),                    icon: Beaker,      tone: 'accent' },
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
        {chips.map((c) => (
          <ControlChip
            key={c.key}
            label={c.label}
            icon={c.icon as never}
            tone={c.tone}
            active={activePreset === c.key}
            onClick={() => onPreset(c.key)}
            testId={`businesses-preset-${c.key}`}
          />
        ))}
      </div>
    </Card>
  );
};

export default BusinessesCommandBar;