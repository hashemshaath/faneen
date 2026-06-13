import React from 'react';
import { Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { pickBi } from '@/components/common/Bilingual';
import { PhoneField } from '@/components/forms/PhoneField';
import type { BusinessCreateSectionProps } from './types';

/**
 * Phase 5F — Contact + classification section.
 * Wraps the section header, phone/email inputs, and the "Unclassified"
 * taxonomy placeholder shown until the user opens the edit tab.
 */
export const BusinessCreateContactSection = React.memo(function BusinessCreateContactSection({
  isRTL,
  form,
  setForm,
  setField,
}: BusinessCreateSectionProps) {
  return (
    <>
      <div className="flex items-center gap-2 pt-1">
        <Building2 className="w-3.5 h-3.5 text-primary" />
        <Label className="text-xs font-semibold">
          {pickBi(isRTL, '2) البيانات الرسمية للمنشأة', '2) Entity official data')}
        </Label>
        <span className="text-[10.5px] text-muted-foreground">
          {pickBi(
            isRTL,
            '(الاسم التجاري، رقم التواصل الرسمي، وبريد المنشأة — وليست بيانات المالك الشخصية)',
            '(commercial name, official contact number, and entity email — not the owner\'s personal data)',
          )}
        </span>
      </div>

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
    </>
  );
});