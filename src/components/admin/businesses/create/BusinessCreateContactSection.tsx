import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { pickBi } from '@/components/common/Bilingual';
import { PhoneField } from '@/components/forms/PhoneField';
import type { BusinessCreateSectionProps } from './types';

/**
 * Phase 5F — Contact + classification grid (phone / email / sector).
 * The section-2 header lives in `BusinessCreateBasicSection` above
 * the bilingual name field; this block is the inline form grid only.
 */
export const BusinessCreateContactSection = React.memo(function BusinessCreateContactSection({
  isRTL,
  form,
  setForm,
  setField,
}: BusinessCreateSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <PhoneField
          value={{ countryCode: form.phone_cc, national: form.phone_national }}
          onChange={(next) =>
            setForm((f) => ({ ...f, phone_cc: next.countryCode, phone_national: next.national }))
          }
          label={pickBi(isRTL, 'رقم التواصل الرسمي للمنشأة', 'Official entity contact number')}
          optional
        />
        <div className="space-y-1.5">
          <Label className="text-xs">{pickBi(isRTL, 'البريد الرسمي للمنشأة', 'Official entity email')}</Label>
          <Input
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            type="email"
            placeholder="info@company.com"
            dir="ltr"
            className="h-10 rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{pickBi(isRTL, 'نشاط/قطاع المنشأة', 'Entity sector / activity')}</Label>
          <div className="h-10 rounded-xl border border-dashed border-border bg-muted/30 px-3 flex items-center text-[11px] text-muted-foreground">
            {pickBi(
              isRTL,
              'غير مصنّف — يمكن إضافة التصنيف بعد الإنشاء من تبويب التحرير (التصنيفات المركزية).',
              'Unclassified — taxonomy can be added after creation from the edit tab (Central Taxonomy).',
            )}
          </div>
        </div>
    </div>
  );
});