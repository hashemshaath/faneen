import React from 'react';
import { Building2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { pickBi } from '@/components/common/Bilingual';
import { BilingualNameField } from '@/components/forms/BilingualNameField';
import type { BusinessCreateSectionProps } from './types';

/**
 * Phase 5F — Basic entity identity section.
 * Renders the "Section 2" header (official entity data) and the
 * bilingual name + username field. Presentational only.
 */
export const BusinessCreateBasicSection = React.memo(function BusinessCreateBasicSection({
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
    <BilingualNameField
      value={{
        full_name_ar: form.name_ar,
        full_name_en: form.name_en,
        username: form.username,
      }}
      onChange={(next) => {
        setForm((f) => ({
          ...f,
          name_ar: next.full_name_ar,
          name_en: next.full_name_en,
          username: next.username || '',
        }));
      }}
      onUsernameValidChange={(st) => {
        setField('username_ok', st.isValid && st.isAvailable);
      }}
      required
      excludeUserId={null}
      subject="entity"
      enableTranslate
    />
    </>
  );
});