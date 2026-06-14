/**
 * ADMIN REDESIGN PHASE 9G — BrandDetailOverviewPanel.
 * Pure presentational panel rendering brand identity, SEO, manufacturing
 * countries, linked sectors, and merge controls. All data + callbacks are
 * owned by `AdminBrandDetail.tsx`; this component does NOT import Supabase
 * and contains NO queries or mutations.
 */
import React from 'react';
import { Loader2, Edit3, Save, Globe, AlertTriangle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/image-upload';
import { SEOPreviewCard } from '@/components/seo/SEOPreviewCard';
import { FieldAiActions } from '@/components/blog/FieldAiActions';
import { pickBi } from '@/components/common/Bilingual';

import { FieldLabeled } from './_shared';

export interface IdentityForm {
  name_ar: string; name_en: string;
  description_ar: string; description_en: string;
  website: string; brand_owner_company: string; founded_year: string;
  country_of_origin_code: string;
  country_of_origin_name_ar: string; country_of_origin_name_en: string;
  logo_url: string; is_local: boolean;
}

export interface SeoForm {
  seo_title_ar: string; seo_title_en: string;
  seo_description_ar: string; seo_description_en: string;
  brand_keywords: string; og_image_url: string;
}

export interface ManufacturingCountryRow {
  id: string;
  country_code: string;
  country_name_ar: string | null;
  country_name_en: string | null;
  manufacturing_type: string;
}

export interface SectorLinkRow {
  id: string;
  sector_id: string;
  is_primary: boolean;
}

export interface SectorLite {
  id: string;
  name_ar: string;
  name_en: string | null;
}

export interface BrandOverviewBrand {
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  slug: string | null;
  logo_url: string | null;
}

export interface BrandDetailOverviewPanelProps {
  isRTL: boolean;
  locale: 'ar' | 'en';
  brand: BrandOverviewBrand;

  identityForm: IdentityForm;
  setIdentityForm: React.Dispatch<React.SetStateAction<IdentityForm>>;
  identityDirty: boolean;
  setIdentityDirty: (v: boolean) => void;
  onSaveIdentity: () => void;
  saveIdentityPending: boolean;

  seoForm: SeoForm;
  setSeoForm: React.Dispatch<React.SetStateAction<SeoForm>>;
  onSaveSeo: () => void;
  saveSeoPending: boolean;

  mfgData: ManufacturingCountryRow[] | undefined;
  mfgLoading: boolean;

  sectorsData: SectorLinkRow[] | undefined;
  sectorsLoading: boolean;
  sectorMap: Map<string, SectorLite>;

  mergeTarget: string;
  setMergeTarget: (v: string) => void;
  onMerge: (target: string) => void;
  mergePending: boolean;
}

export const BrandDetailOverviewPanel: React.FC<BrandDetailOverviewPanelProps> = ({
  isRTL, locale, brand,
  identityForm, setIdentityForm, identityDirty, setIdentityDirty,
  onSaveIdentity, saveIdentityPending,
  seoForm, setSeoForm, onSaveSeo, saveSeoPending,
  mfgData, mfgLoading,
  sectorsData, sectorsLoading, sectorMap,
  mergeTarget, setMergeTarget, onMerge, mergePending,
}) => {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* Identity & origin */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><Edit3 className="w-4 h-4" />{pickBi(isRTL, 'البيانات الأساسية', 'Identity & origin')}</span>
            {identityDirty && <Badge variant="warning" className="text-[10px]">{pickBi(isRTL, 'تعديلات غير محفوظة', 'Unsaved')}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <FieldLabeled label={pickBi(isRTL, 'الاسم (عربي) *', 'Name (AR) *')}>
              <Input dir="auto" value={identityForm.name_ar}
                onChange={(e) => { setIdentityForm(f => ({ ...f, name_ar: e.target.value })); setIdentityDirty(true); }} />
            </FieldLabeled>
            <FieldLabeled label={pickBi(isRTL, 'الاسم (إنجليزي)', 'Name (EN)')}>
              <Input dir="ltr" value={identityForm.name_en}
                onChange={(e) => { setIdentityForm(f => ({ ...f, name_en: e.target.value })); setIdentityDirty(true); }} />
            </FieldLabeled>
            <FieldLabeled label={pickBi(isRTL, 'الموقع الرسمي', 'Official website')}>
              <Input dir="ltr" placeholder="https://example.com" className="tech-content" value={identityForm.website}
                onChange={(e) => { setIdentityForm(f => ({ ...f, website: e.target.value })); setIdentityDirty(true); }} />
            </FieldLabeled>
            <FieldLabeled label={pickBi(isRTL, 'الشركة المالكة', 'Brand owner')}>
              <Input dir="auto" value={identityForm.brand_owner_company}
                onChange={(e) => { setIdentityForm(f => ({ ...f, brand_owner_company: e.target.value })); setIdentityDirty(true); }} />
            </FieldLabeled>
            <FieldLabeled label={pickBi(isRTL, 'سنة التأسيس', 'Founded year')}>
              <Input type="number" inputMode="numeric" className="tech-content" value={identityForm.founded_year}
                onChange={(e) => { setIdentityForm(f => ({ ...f, founded_year: e.target.value })); setIdentityDirty(true); }} />
            </FieldLabeled>
            <FieldLabeled label={pickBi(isRTL, 'كود البلد (ISO)', 'Country code (ISO)')}>
              <Input maxLength={3} dir="ltr" className="tech-content uppercase" value={identityForm.country_of_origin_code}
                onChange={(e) => { setIdentityForm(f => ({ ...f, country_of_origin_code: e.target.value })); setIdentityDirty(true); }} />
            </FieldLabeled>
            <FieldLabeled label={pickBi(isRTL, 'اسم البلد (عربي)', 'Country (AR)')}>
              <Input dir="auto" value={identityForm.country_of_origin_name_ar}
                onChange={(e) => { setIdentityForm(f => ({ ...f, country_of_origin_name_ar: e.target.value })); setIdentityDirty(true); }} />
            </FieldLabeled>
            <FieldLabeled label={pickBi(isRTL, 'اسم البلد (إنجليزي)', 'Country (EN)')}>
              <Input dir="ltr" value={identityForm.country_of_origin_name_en}
                onChange={(e) => { setIdentityForm(f => ({ ...f, country_of_origin_name_en: e.target.value })); setIdentityDirty(true); }} />
            </FieldLabeled>
          </div>
          <FieldLabeled label={pickBi(isRTL, 'وصف العلامة (عربي)', 'Description (AR)')}>
            <Textarea dir="auto" rows={2} value={identityForm.description_ar}
              onChange={(e) => { setIdentityForm(f => ({ ...f, description_ar: e.target.value })); setIdentityDirty(true); }} />
          </FieldLabeled>
          <FieldLabeled label={pickBi(isRTL, 'وصف العلامة (إنجليزي)', 'Description (EN)')}>
            <Textarea dir="ltr" rows={2} value={identityForm.description_en}
              onChange={(e) => { setIdentityForm(f => ({ ...f, description_en: e.target.value })); setIdentityDirty(true); }} />
          </FieldLabeled>
          <div>
            <Label className="text-xs mb-2 block">{pickBi(isRTL, 'الشعار (يُضغط تلقائياً إلى WebP)', 'Logo (auto-compressed to WebP)')}</Label>
            <ImageUpload bucket="business-assets" value={identityForm.logo_url}
              onChange={(url) => { setIdentityForm(f => ({ ...f, logo_url: url || '' })); setIdentityDirty(true); }}
              onRemove={() => { setIdentityForm(f => ({ ...f, logo_url: '' })); setIdentityDirty(true); }}
              placeholder={pickBi(isRTL, 'رفع شعار العلامة', 'Upload brand logo')} />
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="h-4 w-4" checked={identityForm.is_local}
                onChange={(e) => { setIdentityForm(f => ({ ...f, is_local: e.target.checked })); setIdentityDirty(true); }} />
              <span>{pickBi(isRTL, 'علامة محلية', 'Local brand')}</span>
            </label>
            <Button size="sm" onClick={onSaveIdentity}
              disabled={!identityDirty || saveIdentityPending || !identityForm.name_ar.trim()}>
              {saveIdentityPending ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Save className="w-4 h-4 me-1" />}
              {pickBi(isRTL, 'حفظ التعديلات', 'Save changes')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SEO */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" />SEO</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <SEOPreviewCard
            kind="brand"
            customTitleAr={seoForm.seo_title_ar}
            customTitleEn={seoForm.seo_title_en}
            customDescriptionAr={seoForm.seo_description_ar}
            customDescriptionEn={seoForm.seo_description_en}
            nameAr={brand.name_ar}
            nameEn={brand.name_en ?? brand.name_ar}
            rawDescriptionAr={brand.description_ar}
            rawDescriptionEn={brand.description_en}
            url={brand.slug ? `https://qitaat.com/brands/${brand.slug}` : null}
            ogImageUrl={seoForm.og_image_url || brand.logo_url}
            focusKeyword={seoForm.brand_keywords.split(',').map(k => k.trim()).filter(Boolean)[0] ?? null}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">{pickBi(isRTL, 'عنوان SEO (عربي)', 'SEO Title (AR)')}</Label>
                <FieldAiActions value={seoForm.seo_title_ar || brand.name_ar || ''} lang="ar" isRTL={isRTL} fieldType="meta_title" compact
                  onTranslated={(t) => setSeoForm(f => ({ ...f, seo_title_ar: t }))}
                  onImproved={(t) => setSeoForm(f => ({ ...f, seo_title_ar: t }))} />
              </div>
              <Input value={seoForm.seo_title_ar} onChange={(e) => setSeoForm(f => ({ ...f, seo_title_ar: e.target.value }))} className="mt-1" dir="auto" />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">{pickBi(isRTL, 'عنوان SEO (إنجليزي)', 'SEO Title (EN)')}</Label>
                <FieldAiActions value={seoForm.seo_title_en || brand.name_en || ''} lang="en" isRTL={isRTL} fieldType="meta_title" compact
                  onTranslated={(t) => setSeoForm(f => ({ ...f, seo_title_en: t }))}
                  onImproved={(t) => setSeoForm(f => ({ ...f, seo_title_en: t }))} />
              </div>
              <Input value={seoForm.seo_title_en} onChange={(e) => setSeoForm(f => ({ ...f, seo_title_en: e.target.value }))} className="mt-1" dir="ltr" />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">{pickBi(isRTL, 'وصف SEO (عربي)', 'SEO Description (AR)')}</Label>
                <FieldAiActions value={seoForm.seo_description_ar || brand.description_ar || ''} lang="ar" isRTL={isRTL} fieldType="meta_description" compact
                  onTranslated={(t) => setSeoForm(f => ({ ...f, seo_description_ar: t }))}
                  onImproved={(t) => setSeoForm(f => ({ ...f, seo_description_ar: t }))} />
              </div>
              <Textarea value={seoForm.seo_description_ar} onChange={(e) => setSeoForm(f => ({ ...f, seo_description_ar: e.target.value }))} rows={2} className="mt-1" dir="auto" />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">{pickBi(isRTL, 'وصف SEO (إنجليزي)', 'SEO Description (EN)')}</Label>
                <FieldAiActions value={seoForm.seo_description_en || brand.description_en || ''} lang="en" isRTL={isRTL} fieldType="meta_description" compact
                  onTranslated={(t) => setSeoForm(f => ({ ...f, seo_description_en: t }))}
                  onImproved={(t) => setSeoForm(f => ({ ...f, seo_description_en: t }))} />
              </div>
              <Textarea value={seoForm.seo_description_en} onChange={(e) => setSeoForm(f => ({ ...f, seo_description_en: e.target.value }))} rows={2} className="mt-1" dir="ltr" />
            </div>
          </div>
          <div>
            <Label className="text-xs">{pickBi(isRTL, 'كلمات العلامة', 'Brand keywords')}</Label>
            <Input value={seoForm.brand_keywords} onChange={(e) => setSeoForm(f => ({ ...f, brand_keywords: e.target.value }))} className="mt-1" dir="auto" />
          </div>
          <div>
            <Label className="text-xs mb-2 block">{pickBi(isRTL, 'صورة OG', 'OG image')}</Label>
            <ImageUpload bucket="business-assets" value={seoForm.og_image_url}
              onChange={(url) => setSeoForm(f => ({ ...f, og_image_url: url || '' }))}
              onRemove={() => setSeoForm(f => ({ ...f, og_image_url: '' }))}
              placeholder={pickBi(isRTL, 'رفع صورة المشاركة', 'Upload share image')} />
          </div>
          <Button onClick={onSaveSeo} disabled={saveSeoPending} className="w-full gap-2">
            {saveSeoPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {pickBi(isRTL, 'حفظ SEO', 'Save SEO')}
          </Button>
        </CardContent>
      </Card>

      {/* Manufacturing countries */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">{pickBi(isRTL, 'دول التصنيع', 'Manufacturing countries')}</CardTitle></CardHeader>
        <CardContent>
          {mfgLoading ? <Skeleton className="h-20" /> : (mfgData ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{pickBi(isRTL, 'لا توجد بيانات', 'None recorded')}</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {(mfgData ?? []).map((c) => (
                <li key={c.id} className="flex items-center gap-2 flex-wrap">
                  <code className="tech-content bg-muted px-2 py-0.5 rounded text-xs">{c.country_code}</code>
                  <span>{locale === 'ar' ? (c.country_name_ar ?? '—') : (c.country_name_en ?? '—')}</span>
                  <Badge variant="outline" className="text-[10px]">{c.manufacturing_type}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Sectors */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">{pickBi(isRTL, 'القطاعات المرتبطة', 'Linked sectors')}</CardTitle></CardHeader>
        <CardContent>
          {sectorsLoading ? <Skeleton className="h-16" /> : (sectorsData ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{pickBi(isRTL, 'لا توجد قطاعات مرتبطة', 'No sectors linked')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(sectorsData ?? []).map((l) => {
                const s = sectorMap.get(l.sector_id);
                return (
                  <Badge key={l.id} variant={l.is_primary ? 'default' : 'outline'} className="text-xs">
                    {s ? (locale === 'ar' ? s.name_ar : (s.name_en ?? s.name_ar)) : l.sector_id}
                    {l.is_primary && <span className="ms-1 opacity-70">★</span>}
                  </Badge>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Merge */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{pickBi(isRTL, 'دمج العلامة', 'Merge brand')}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {pickBi(isRTL, 'دمج هذه العلامة في علامة أخرى (تظل المراجع كما هي).', 'Merge this brand into another (refs are preserved).')}
          </p>
          <Input value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)}
            placeholder={pickBi(isRTL, 'UUID العلامة الهدف', 'Target brand UUID')} className="h-10 tech-content" />
          <Button size="sm" variant="outline"
            onClick={() => { if (mergeTarget.trim()) onMerge(mergeTarget.trim()); }}
            disabled={!mergeTarget.trim() || mergePending}>
            {mergePending ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : null}
            {pickBi(isRTL, 'دمج', 'Merge')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BrandDetailOverviewPanel;