import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import type { BrandingConfig, SizeFieldKey } from './types';

interface SizeRow {
  field: SizeFieldKey;
  ar: string;
  en: string;
}

export interface BrandingSizesSectionProps {
  isRTL: boolean;
  values: BrandingConfig;
  rows: SizeRow[];
  min: number;
  max: number;
  step?: number;
  onChange: (field: SizeFieldKey, value: number) => void;
}

/**
 * BrandingSizesSection — sliders for navbar/footer/auth/loader/mark
 * heights. Pure presentational; emits change intents only.
 */
export const BrandingSizesSection: React.FC<BrandingSizesSectionProps> = ({
  isRTL,
  values,
  rows,
  min,
  max,
  step = 2,
  onChange,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">
        {isRTL ? 'أحجام الشعار في المنصة' : 'Logo sizes across the platform'}
      </CardTitle>
      <CardDescription className="text-xs">
        {isRTL ? 'يتم تطبيق التغييرات فوراً بعد الحفظ' : 'Changes apply immediately after Save'}
      </CardDescription>
    </CardHeader>
    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
      {rows.map((r) => (
        <div key={r.field} className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">{isRTL ? r.ar : r.en}</Label>
            <span className="text-xs text-muted-foreground tech-content">{values[r.field]}px</span>
          </div>
          <Slider
            min={min}
            max={max}
            step={step}
            value={[values[r.field] as number]}
            onValueChange={([v]) => onChange(r.field, v)}
          />
        </div>
      ))}
    </CardContent>
  </Card>
);

export default BrandingSizesSection;