import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { pickBi } from '@/components/common/Bilingual';
import { FieldAiActions } from '@/components/blog/FieldAiActions';
import type { AdminEditBusinessFormState } from '@/pages/admin/adminBusinesses.types';
import type { SetEditFieldFn } from './types';

type Props = {
  editForm: AdminEditBusinessFormState;
  setField: SetEditFieldFn;
  isRTL: boolean;
};

export const BusinessContentSection: React.FC<Props> = ({ editForm, setField, isRTL }) => (
  <>
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs font-semibold">{pickBi(isRTL, 'نبذة قصيرة (عربي)', 'Short Description (AR)')}</Label>
        <FieldAiActions compact value={editForm.short_description_ar} lang="ar" isRTL={isRTL} fieldType="excerpt"
          onTranslated={(v) => setField('short_description_en', v)} onImproved={(v) => setField('short_description_ar', v)} />
      </div>
      <Textarea value={editForm.short_description_ar} onChange={e => setField('short_description_ar', e.target.value)} rows={2}
        placeholder={pickBi(isRTL, 'وصف مختصر للنشاط (150 حرف)', 'Short business description (150 chars)')} />
      <span className="text-[10px] text-muted-foreground">{editForm.short_description_ar?.length || 0}/150</span>
    </div>
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs font-semibold">{pickBi(isRTL, 'نبذة قصيرة (إنجليزي)', 'Short Description (EN)')}</Label>
        <FieldAiActions compact value={editForm.short_description_en} lang="en" isRTL={isRTL} fieldType="excerpt"
          onTranslated={(v) => setField('short_description_ar', v)} onImproved={(v) => setField('short_description_en', v)} />
      </div>
      <Textarea value={editForm.short_description_en} onChange={e => setField('short_description_en', e.target.value)} rows={2} dir="ltr" />
      <span className="text-[10px] text-muted-foreground">{editForm.short_description_en?.length || 0}/150</span>
    </div>
    <Separator />
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs font-semibold">{pickBi(isRTL, 'الوصف التفصيلي (عربي)', 'Full Description (AR)')}</Label>
        <FieldAiActions compact value={editForm.description_ar} lang="ar" isRTL={isRTL} fieldType="description"
          onTranslated={(v) => setField('description_en', v)} onImproved={(v) => setField('description_ar', v)} />
      </div>
      <Textarea value={editForm.description_ar} onChange={e => setField('description_ar', e.target.value)} rows={5} />
      <span className="text-[10px] text-muted-foreground">{editForm.description_ar?.length || 0} {pickBi(isRTL, 'حرف', 'chars')}</span>
    </div>
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs font-semibold">{pickBi(isRTL, 'الوصف التفصيلي (إنجليزي)', 'Full Description (EN)')}</Label>
        <FieldAiActions compact value={editForm.description_en} lang="en" isRTL={isRTL} fieldType="description"
          onTranslated={(v) => setField('description_ar', v)} onImproved={(v) => setField('description_en', v)} />
      </div>
      <Textarea value={editForm.description_en} onChange={e => setField('description_en', e.target.value)} rows={5} dir="ltr" />
      <span className="text-[10px] text-muted-foreground">{editForm.description_en?.length || 0} {pickBi(isRTL, 'حرف', 'chars')}</span>
    </div>
  </>
);