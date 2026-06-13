import React from 'react';
import { FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { pickBi } from '@/components/common/Bilingual';
import type { BusinessCreateSectionProps } from './types';

/**
 * Phase 5F — Registry numbers section (CR / unified-700 / VAT).
 * Pure presentational fields; all values flow back via `setField`.
 */
export const BusinessCreateRegistrySection = React.memo(function BusinessCreateRegistrySection({
  isRTL,
  form,
  setField,
}: BusinessCreateSectionProps) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="w-3.5 h-3.5 text-primary" />
        <Label className="text-xs font-semibold">
          {pickBi(isRTL, '3) بيانات السجل والأرقام الرسمية', '3) Registry & official numbers')}
        </Label>
        <span className="text-[10.5px] text-muted-foreground">
          {pickBi(isRTL, '(اختياري — يمكن استكمالها لاحقاً)', '(optional — can be completed later)')}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{pickBi(isRTL, 'رقم السجل التجاري (CR)', 'Commercial Registration (CR)')}</Label>
          <Input value={form.national_id} onChange={(e) => setField('national_id', e.target.value)} dir="ltr" placeholder="1010xxxxxx" className="h-10 rounded-xl tech-content" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{pickBi(isRTL, 'الرقم الموحّد (700)', 'Unified number (700)')}</Label>
          <Input value={form.unified_number} onChange={(e) => setField('unified_number', e.target.value)} dir="ltr" placeholder="7001234567" className="h-10 rounded-xl tech-content" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{pickBi(isRTL, 'الرقم الضريبي (VAT)', 'VAT / Tax number')}</Label>
          <Input value={form.vat_number} onChange={(e) => setField('vat_number', e.target.value)} dir="ltr" placeholder="3xxxxxxxxxxxxx3" className="h-10 rounded-xl tech-content" />
        </div>
      </div>
    </div>
  );
});