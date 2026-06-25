/**
 * PricingMethodSection — Phase: Contract creation order.
 *
 * Standalone, presentational pricing-method picker rendered between the
 * provider/parties step and the execution-site step. It captures a
 * high-level pricing intent (linear / square_meter / unit / mixed)
 * that is stored in the contract draft payload/metadata only — no
 * financial computations happen here.
 *
 * Pure props, no Supabase calls, no side effects.
 */
import React from 'react';
import { Ruler, Square, Package, Layers } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { pickBi } from '@/components/common/Bilingual';

export type ContractPricingMethodChoice = 'linear_meter' | 'square_meter' | 'unit' | 'mixed';

export interface PricingMethodSectionProps {
  isRTL: boolean;
  value: ContractPricingMethodChoice | null;
  onSelect: (v: ContractPricingMethodChoice) => void;
}

const OPTIONS: Array<{ key: ContractPricingMethodChoice; ar: string; en: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'linear_meter', ar: 'طولي', en: 'Linear', Icon: Ruler },
  { key: 'square_meter', ar: 'متر مربع', en: 'Square meter', Icon: Square },
  { key: 'unit', ar: 'وحدة', en: 'Unit', Icon: Package },
  { key: 'mixed', ar: 'مختلط', en: 'Mixed', Icon: Layers },
];

export const PricingMethodSection: React.FC<PricingMethodSectionProps> = ({ isRTL, value, onSelect }) => {
  return (
    <div
      data-testid="contract-create-pricing-method-section"
      className="p-4 rounded-xl border border-border/40 bg-muted/20 space-y-2"
    >
      <div className="flex items-center gap-1.5">
        <Ruler className="w-3.5 h-3.5 text-primary" />
        <Label className="text-xs font-semibold">
          {pickBi(isRTL, 'طريقة التسعير', 'Pricing method')} <span className="text-destructive">*</span>
        </Label>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {OPTIONS.map(({ key, ar, en, Icon }) => {
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              data-testid={`contract-create-pricing-method-${key}`}
              aria-pressed={active}
              className={`flex items-center justify-center gap-1.5 h-12 rounded-lg border text-[11px] font-medium transition-colors ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border/50 bg-card hover:border-primary/40'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{pickBi(isRTL, ar, en)}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        {pickBi(
          isRTL,
          'تُستخدم طريقة التسعير لتجهيز البنود والدفعات بشكل أوضح داخل العقد.',
          'The pricing method is used to set up line items and payments more clearly inside the contract.',
        )}
      </p>
    </div>
  );
};

export default PricingMethodSection;