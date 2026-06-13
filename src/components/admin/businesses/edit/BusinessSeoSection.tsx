import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/image-upload';
import { pickBi } from '@/components/common/Bilingual';
import { FieldAiActions } from '@/components/blog/FieldAiActions';
import { SEOPreviewCard } from '@/components/seo/SEOPreviewCard';
import type { AdminEditBusinessFormState } from '@/pages/admin/adminBusinesses.types';
import type { EditPanelCityName, EditPanelEditingBiz, SetEditFieldFn } from './types';

type Props = {
  editForm: AdminEditBusinessFormState;
  setField: SetEditFieldFn;
  isRTL: boolean;
  editingBiz: EditPanelEditingBiz;
  cityName: EditPanelCityName;
};

export const BusinessSeoSection: React.FC<Props> = ({
  editForm,
  setField,
  isRTL,
  editingBiz,
  cityName,
}) => {
  const keywordsList = String(editForm.seo_keywords || '').split(',').map(k => k.trim()).filter(Boolean);
  return (
    <>
      <SEOPreviewCard
        kind="company"
        customTitleAr={editForm.seo_title_ar}
        customTitleEn={editForm.seo_title_en}
        customDescriptionAr={editForm.seo_description_ar}
        customDescriptionEn={editForm.seo_description_en}
        nameAr={editForm.name_ar}
        nameEn={editForm.name_en}
        activityAr={null}
        activityEn={null}
        cityAr={cityName?.name_ar ?? null}
        cityEn={cityName?.name_en ?? null}
        rawDescriptionAr={editForm.description_ar}
        rawDescriptionEn={editForm.description_en}
        url={editingBiz.username ? `https://qitaat.com/${editingBiz.username}` : null}
        ogImageUrl={editForm.og_image || editForm.cover_url || editForm.logo_url || null}
        focusKeyword={keywordsList[0] ?? null}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-semibold">{pickBi(isRTL, 'عنوان SEO (عربي)', 'SEO Title (AR)')}</Label>
            <FieldAiActions value={editForm.seo_title_ar || editForm.name_ar || ''} lang="ar" isRTL={isRTL} fieldType="meta_title" compact
              onTranslated={(t) => setField('seo_title_ar', t)} onImproved={(t) => setField('seo_title_ar', t)} />
          </div>
          <Input value={editForm.seo_title_ar} onChange={e => setField('seo_title_ar', e.target.value)} dir="auto" className="mt-1" />
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-semibold">{pickBi(isRTL, 'عنوان SEO (إنجليزي)', 'SEO Title (EN)')}</Label>
            <FieldAiActions value={editForm.seo_title_en || editForm.name_en || ''} lang="en" isRTL={isRTL} fieldType="meta_title" compact
              onTranslated={(t) => setField('seo_title_en', t)} onImproved={(t) => setField('seo_title_en', t)} />
          </div>
          <Input value={editForm.seo_title_en} onChange={e => setField('seo_title_en', e.target.value)} dir="ltr" className="mt-1" />
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-semibold">{pickBi(isRTL, 'وصف SEO (عربي)', 'SEO Description (AR)')}</Label>
            <FieldAiActions value={editForm.seo_description_ar || editForm.description_ar || editForm.short_description_ar || ''} lang="ar" isRTL={isRTL} fieldType="meta_description" compact
              onTranslated={(t) => setField('seo_description_ar', t)} onImproved={(t) => setField('seo_description_ar', t)} />
          </div>
          <Textarea value={editForm.seo_description_ar} onChange={e => setField('seo_description_ar', e.target.value)} rows={2} dir="auto" className="mt-1" />
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-semibold">{pickBi(isRTL, 'وصف SEO (إنجليزي)', 'SEO Description (EN)')}</Label>
            <FieldAiActions value={editForm.seo_description_en || editForm.description_en || editForm.short_description_en || ''} lang="en" isRTL={isRTL} fieldType="meta_description" compact
              onTranslated={(t) => setField('seo_description_en', t)} onImproved={(t) => setField('seo_description_en', t)} />
          </div>
          <Textarea value={editForm.seo_description_en} onChange={e => setField('seo_description_en', e.target.value)} rows={2} dir="ltr" className="mt-1" />
        </div>
      </div>
      <div>
        <Label className="text-xs font-semibold">{pickBi(isRTL, 'كلمات SEO', 'SEO keywords')}</Label>
        <Input value={editForm.seo_keywords} onChange={e => setField('seo_keywords', e.target.value)} dir="auto" className="mt-1" placeholder={pickBi(isRTL, 'ألمنيوم, زجاج, تركيب', 'aluminum, glass, installation')} />
      </div>
      <div>
        <Label className="text-xs font-semibold mb-2 block">{pickBi(isRTL, 'صورة OG', 'OG image')}</Label>
        <ImageUpload bucket="business-assets" value={editForm.og_image}
          onChange={(url) => setField('og_image', url)} onRemove={() => setField('og_image', '')}
          placeholder={pickBi(isRTL, 'رفع صورة المشاركة', 'Upload share image')} />
      </div>
    </>
  );
};