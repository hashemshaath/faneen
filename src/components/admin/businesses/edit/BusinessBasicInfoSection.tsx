import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Star } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import { FieldAiActions } from '@/components/blog/FieldAiActions';
import { ReferenceTag } from '@/components/reference/ReferenceTag';
import { BusinessTaxonomySection } from '@/modules/taxonomy';
import type { AdminEditBusinessFormState } from '@/pages/admin/adminBusinesses.types';
import type {
  EditPanelEditingBiz,
  EditPanelOwnerRef,
  SetEditFieldFn,
} from './types';

type Props = {
  editForm: AdminEditBusinessFormState;
  setField: SetEditFieldFn;
  isRTL: boolean;
  editingBiz: EditPanelEditingBiz;
  ownerRef: EditPanelOwnerRef;
  onTaxonomySaved: () => void;
};

export const BusinessBasicInfoSection: React.FC<Props> = ({
  editForm,
  setField,
  isRTL,
  editingBiz,
  ownerRef,
  onTaxonomySaved,
}) => {
  const hasArabic = (s: string) => /[\u0600-\u06FF]/.test(s || '');
  const hasLatin = (s: string) => /[A-Za-z]/.test(s || '');
  const arLooksEn = editForm.name_ar && hasLatin(editForm.name_ar) && !hasArabic(editForm.name_ar);
  const enLooksAr = editForm.name_en && hasArabic(editForm.name_en) && !hasLatin(editForm.name_en);

  return (
    <>
      {(arLooksEn || enLooksAr) && (
        <div className="flex items-start justify-between gap-2 p-2 rounded-lg bg-warning/10 border border-warning/40">
          <p className="text-[11px] text-warning-foreground">
            {pickBi(isRTL, 'يبدو أن الاسم العربي والإنجليزي معكوسان.', 'Arabic and English names appear swapped.')}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2"
            onClick={() => {
              const ar = editForm.name_ar;
              const en = editForm.name_en;
              setField('name_ar', en);
              setField('name_en', ar);
            }}
          >
            {pickBi(isRTL, '↔ تبديل', '↔ Swap')}
          </Button>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs">{pickBi(isRTL, 'الاسم (عربي)', 'Name (AR)')} *</Label>
          <FieldAiActions compact value={editForm.name_ar} lang="ar" isRTL={isRTL} fieldType="title"
            onTranslated={(v) => setField('name_en', v)} onImproved={(v) => setField('name_ar', v)} />
        </div>
        <Input value={editForm.name_ar} onChange={e => setField('name_ar', e.target.value)} dir="auto" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs">{pickBi(isRTL, 'الاسم (إنجليزي)', 'Name (EN)')}</Label>
          <FieldAiActions compact value={editForm.name_en} lang="en" isRTL={isRTL} fieldType="title"
            onTranslated={(v) => setField('name_ar', v)} onImproved={(v) => setField('name_en', v)} />
        </div>
        <Input value={editForm.name_en} onChange={e => setField('name_en', e.target.value)} dir="ltr" />
      </div>
      <div>
        <Label className="text-xs">{pickBi(isRTL, 'الرابط العام للجهة', 'Public handle')}</Label>
        <Input
          value={editForm.username || editingBiz.username || ''}
          onChange={e => setField('username', e.target.value)}
          dir="ltr"
          className="mt-1 tech-content"
          placeholder="alefnoon"
        />
      </div>
      <BusinessTaxonomySection businessId={editingBiz.id} onSaved={onTaxonomySaved} />
      <Separator />
      <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-[10px] space-y-1 text-muted-foreground font-mono">
        <div className="flex items-center justify-between gap-2">
          <span className="text-foreground font-semibold">{pickBi(isRTL, 'المعرف', 'Ref')}</span>
          <ReferenceTag refId={editingBiz.ref_id} isRTL={isRTL} />
        </div>
        {editingBiz.legacy_ref_id && editingBiz.legacy_ref_id !== editingBiz.ref_id && (
          <p>{pickBi(isRTL, 'المعرف السابق', 'Previously')}: {editingBiz.legacy_ref_id}</p>
        )}
        <p>Username: @{editingBiz.username}</p>
        <div className="flex items-center justify-between gap-2">
          <span>{pickBi(isRTL, 'المالك', 'Owner')}</span>
          {ownerRef?.ref_id
            ? <ReferenceTag refId={ownerRef.ref_id} isRTL={isRTL} />
            : <span className="text-muted-foreground">{pickBi(isRTL, '…تحميل', 'loading…')}</span>}
        </div>
        <p>Created: {new Date(editingBiz.created_at).toLocaleDateString()}</p>
        <p className="flex items-center gap-1">
          Rating: <Star className="w-2.5 h-2.5 text-accent" /> {editingBiz.rating_avg} ({editingBiz.rating_count} reviews)
        </p>
        <details className="mt-1 pt-1 border-t border-border/30">
          <summary className="cursor-pointer text-[9px] opacity-60 hover:opacity-100">{pickBi(isRTL, 'معرفات تقنية (UUID)', 'Technical (UUID)')}</summary>
          <div className="mt-1 space-y-0.5 opacity-70">
            <p className="break-all">business.id: {editingBiz.id}</p>
            <p className="break-all">owner.user_id: {editingBiz.user_id}</p>
          </div>
        </details>
      </div>
    </>
  );
};