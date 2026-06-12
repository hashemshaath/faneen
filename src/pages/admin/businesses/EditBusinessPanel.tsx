import React from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Edit, Plus, X, Save, Loader2, Languages, CheckCircle, FileText,
  Star, Phone, Mail, MapPin, Users, Shield, Crown, Building2,
  DollarSign, Trash2, PhoneField as PhoneFieldIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ImageUpload } from '@/components/ui/image-upload';
import { Skeleton } from '@/components/ui/skeleton';
import { pickBi } from '@/components/common/Bilingual';
import { FieldAiActions } from '@/components/blog/FieldAiActions';
import { BusinessOperationsPanel } from '@/components/business/BusinessOperationsPanel';
import { BusinessOwnerPanel } from '@/components/admin/BusinessOwnerPanel';
import { SEOPreviewCard } from '@/components/seo/SEOPreviewCard';
import { BusinessTaxonomySection } from '@/modules/taxonomy';
import { BilingualNameField } from '@/components/forms/BilingualNameField';
import { RegionCitySelector } from '@/components/forms/RegionCitySelector';
import { NationalAddressForm } from '@/modules/addresses';
import { PhoneField } from '@/components/forms/PhoneField';
import type {
  AdminBusinessBranchLite,
  AdminBusinessBranchType,
  AdminEditBusinessFormState,
  AdminBusinessImageVariants,
} from '../adminBusinesses.types';
import { TIERS } from './_shared';

export interface EditBusinessPanelProps {
  isRTL: boolean;
  language: string;
  editingBiz: Record<string, unknown>;
  editForm: AdminEditBusinessFormState;
  setField: (k: string, v: unknown) => void;
  setEditingBiz: (v: null) => void;
  editCityName: { name_ar?: string | null; name_en?: string | null } | null;
  contractBusinessIds: string[];
  translationCompleteness: (b: Record<string, unknown>) => { ar: boolean; en: boolean; full: boolean };
  autoFillTranslations: () => void;
  autoTranslating: boolean;
  businesses: Record<string, unknown>[];
  allServices: Record<string, unknown>[];
  services: Record<string, unknown>[];
  branches: AdminBusinessBranchLite[];
  branchForm: AdminBusinessBranchLite | null;
  setBranchForm: React.Dispatch<React.SetStateAction<AdminBusinessBranchLite | null>>;
  editingBranchId: string | null;
  setEditingBranchId: (v: string | null) => void;
  emptyBranch: () => AdminBusinessBranchLite;
  tiers: typeof TIERS;
  updateBizMutation: { mutate: () => void; isPending: boolean };
  portfolioData: Record<string, unknown>[];
  addPortfolioMutation: { mutate: (url: string) => void };
  deletePortfolioMutation: { mutate: (id: string) => void };
  saveBranchMutation: { mutate: () => void; isPending: boolean };
  deleteBranchMutation: { mutate: (id: string) => void };
  toggleBranchMutation: { mutate: (vars: { id: string; is_active: boolean }) => void };
  translateBranchName: (sourceLang: 'ar' | 'en') => void;
  branchTranslating: string | null;
  openServices: (id: string) => void;
  parsePhoneValue: (v: string) => { countryCode: string; national: string };
  toE164: (v: { countryCode: string; national: string }) => string;
}

export const EditBusinessPanel: React.FC<EditBusinessPanelProps> = (props) => {
  return (
          <div className="rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/5 to-transparent p-5 animate-in slide-in-from-top-2 duration-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                  <Edit className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base">{pickBi(isRTL, 'تعديل العمل', 'Edit Business')}: {editingBiz.name_ar}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground">{editingBiz.ref_id} · @{editingBiz.username}</span>
                    {contractBusinessIds.includes(editingBiz.id) && (
                      <Badge variant="outline" className="text-[9px] gap-1"><FileText className="w-2.5 h-2.5" />{pickBi(isRTL, 'مرتبط بعقود', 'Has Contracts')}</Badge>
                    )}
                    {(() => {
                      const tc = translationCompleteness(editForm);
                      return (
                        <Badge variant="outline" className={`text-[9px] gap-1 ${tc.full ? 'border-success/40 text-success' : 'border-warning/40 text-warning'}`}>
                          <Languages className="w-2.5 h-2.5" />
                          {tc.full ? (pickBi(isRTL, 'الترجمة مكتملة', 'Bilingual ready'))
                            : (isRTL ? `ينقص: ${[!tc.ar && 'AR', !tc.en && 'EN'].filter(Boolean).join(' · ')}` : `Missing: ${[!tc.ar && 'AR', !tc.en && 'EN'].filter(Boolean).join(' · ')}`)}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-xl"
                  onClick={autoFillTranslations} disabled={autoTranslating}>
                  {autoTranslating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                  {pickBi(isRTL, 'ترجمة تلقائية للناقص', 'Auto-translate missing')}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setEditingBiz(null)} className="rounded-xl" aria-label="Action"><X className="w-4 h-4" /></Button>
              </div>
            </div>
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="w-full grid grid-cols-9 h-9 rounded-xl">
                  <TabsTrigger value="info" className="text-[10px] rounded-lg">{pickBi(isRTL, 'المعلومات', 'Info')}</TabsTrigger>
                  <TabsTrigger value="owner" className="text-[10px] rounded-lg">{pickBi(isRTL, 'المسؤول', 'Owner')}</TabsTrigger>
                  <TabsTrigger value="content" className="text-[10px] rounded-lg">{pickBi(isRTL, 'المحتوى', 'Content')}</TabsTrigger>
                  <TabsTrigger value="media" className="text-[10px] rounded-lg">{pickBi(isRTL, 'الوسائط', 'Media')}</TabsTrigger>
                  <TabsTrigger value="seo" className="text-[10px] rounded-lg">SEO</TabsTrigger>
                  <TabsTrigger value="contact" className="text-[10px] rounded-lg">{pickBi(isRTL, 'التواصل', 'Contact')}</TabsTrigger>
                  <TabsTrigger value="branches" className="text-[10px] rounded-lg">{pickBi(isRTL, 'الفروع', 'Branches')} <Badge variant="secondary" className="text-[8px] ms-0.5 h-4 px-1">{branches.length}</Badge></TabsTrigger>
                  <TabsTrigger value="controls" className="text-[10px] rounded-lg">{pickBi(isRTL, 'التحكم', 'Controls')}</TabsTrigger>
                  <TabsTrigger value="ops" className="text-[10px] rounded-lg">{pickBi(isRTL, 'العمليات', 'Ops')}</TabsTrigger>
                </TabsList>

                {/* ── Info Tab ── */}
                <TabsContent value="info" className="space-y-4 mt-3">
                  {(() => {
                    const hasArabic = (s: string) => /[\u0600-\u06FF]/.test(s || '');
                    const hasLatin = (s: string) => /[A-Za-z]/.test(s || '');
                    const arLooksEn = editForm.name_ar && hasLatin(editForm.name_ar) && !hasArabic(editForm.name_ar);
                    const enLooksAr = editForm.name_en && hasArabic(editForm.name_en) && !hasLatin(editForm.name_en);
                    if (!arLooksEn && !enLooksAr) return null;
                    return (
                      <div className="flex items-start justify-between gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300/50">
                        <p className="text-[11px] text-amber-800 dark:text-amber-200">
                          {pickBi(isRTL, 'يبدو أن الاسم العربي والإنجليزي معكوسان.', 'Arabic and English names appear swapped.')}
                        </p>
                        <Button type="button" size="sm" variant="outline" className="h-6 text-[10px] px-2"
                          onClick={() => {
                            const ar = editForm.name_ar; const en = editForm.name_en;
                            setField('name_ar', en); setField('name_en', ar);
                          }}>
                          {pickBi(isRTL, '↔ تبديل', '↔ Swap')}
                        </Button>
                      </div>
                    );
                  })()}
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
                  <BusinessTaxonomySection
                    businessId={editingBiz.id}
                    onSaved={() => {
                      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
                    }}
                  />
                  {/*
                    Phase 18i: Legacy `businesses.category_id` column dropped.
                    Classification is taxonomy-only via BusinessTaxonomySection above.
                  */}
                  <Separator />
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-[10px] space-y-1 text-muted-foreground font-mono">
                    {/* Primary reference — official platform identifier */}
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
                    {/* Internal-only technical UUIDs — kept collapsed; never the primary identifier */}
                    <details className="mt-1 pt-1 border-t border-border/30">
                      <summary className="cursor-pointer text-[9px] opacity-60 hover:opacity-100">{pickBi(isRTL, 'معرفات تقنية (UUID)', 'Technical (UUID)')}</summary>
                      <div className="mt-1 space-y-0.5 opacity-70">
                        <p className="break-all">business.id: {editingBiz.id}</p>
                        <p className="break-all">owner.user_id: {editingBiz.user_id}</p>
                      </div>
                    </details>
                  </div>
                </TabsContent>

                {/* ── Owner Tab (ORG-RBAC-9F) ── */}
                <TabsContent value="owner" className="space-y-4 mt-3">
                  <BusinessOwnerPanel
                    businessId={editingBiz.id}
                    businessRef={editingBiz.ref_id ?? null}
                    ownerUserId={editingBiz.user_id}
                    isRTL={isRTL}
                    onOwnerReassigned={() => setEditingBiz(null)}
                  />
                </TabsContent>

                {/* ── Address Tab ── */}
                {/* Address tab removed — addresses live on branches now.
                    See the Branches tab for the per-location address editor. */}

                {/* ── Content Tab ── */}
                <TabsContent value="content" className="space-y-4 mt-3">
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
                </TabsContent>

                {/* ── Media Tab ── */}
                <TabsContent value="media" className="space-y-4 mt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold mb-2 block">{pickBi(isRTL, 'الشعار', 'Logo')}</Label>
                      <ImageUpload bucket="business-assets" value={editForm.logo_url}
                        onChange={(url) => setField('logo_url', url)}
                        onRemove={() => {
                          setField('logo_url', '');
                          setField('logo_image_asset_id', null);
                          setField('logo_image_variants', null);
                        }}
                        pipeline="business"
                        businessKind="logo"
                        onUploadedMeta={(meta) => {
                          setField('logo_image_asset_id', meta.imageAssetId ?? null);
                          setField('logo_image_variants', meta.variants ?? null);
                        }}
                        aspectRatio="square" placeholder={pickBi(isRTL, 'رفع الشعار', 'Upload logo')} />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-2 block">{pickBi(isRTL, 'صورة الغلاف', 'Cover Image')}</Label>
                      <ImageUpload bucket="business-assets" value={editForm.cover_url}
                        onChange={(url) => setField('cover_url', url)}
                        onRemove={() => {
                          setField('cover_url', '');
                          setField('cover_image_asset_id', null);
                          setField('cover_image_variants', null);
                        }}
                        pipeline="business"
                        businessKind="cover"
                        onUploadedMeta={(meta) => {
                          setField('cover_image_asset_id', meta.imageAssetId ?? null);
                          setField('cover_image_variants', meta.variants ?? null);
                        }}
                        placeholder={pickBi(isRTL, 'رفع صورة الغلاف', 'Upload cover')} />
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs font-semibold mb-2 flex items-center gap-1">
                      <Image className="w-3 h-3" /> {pickBi(isRTL, 'معرض صور الأعمال', 'Work Gallery')}
                      <Badge variant="secondary" className="text-[9px] ms-1">{portfolioData.length}</Badge>
                    </Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {portfolioData.map((item) => (
                        <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden border border-border/50 group">
                          <img src={item.media_url} alt={pickBi(isRTL, 'صورة من معرض الأعمال', 'Portfolio image')} className="w-full h-full object-cover" loading="lazy" decoding="async"/>
                          <button type="button"
                            onClick={() => { if (confirm(pickBi(isRTL, 'حذف هذه الصورة؟', 'Delete this image?'))) deletePortfolioMutation.mutate(item.id); }}
                            className="absolute top-1 end-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <div className="aspect-square">
                        <ImageUpload bucket="portfolio-images" folder="admin" aspectRatio="square"
                          onChange={(url) => addPortfolioMutation.mutate(url)} placeholder={pickBi(isRTL, 'إضافة صورة', 'Add image')} />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ── SEO Tab ── */}
                <TabsContent value="seo" className="space-y-4 mt-3">
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
                    cityAr={editCityName?.name_ar ?? null}
                    cityEn={editCityName?.name_en ?? null}
                    rawDescriptionAr={editForm.description_ar}
                    rawDescriptionEn={editForm.description_en}
                    url={editingBiz.username ? `https://qitaat.com/${editingBiz.username}` : null}
                    ogImageUrl={editForm.og_image || editForm.cover_url || editForm.logo_url || null}
                    focusKeyword={String(editForm.seo_keywords || '').split(',').map(k => k.trim()).filter(Boolean)[0] ?? null}
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
                </TabsContent>

                {/* ── Contact Tab ── */}
                <TabsContent value="contact" className="space-y-4 mt-3">
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Users className="w-3 h-3" /> {pickBi(isRTL, 'اسم مسؤول التواصل', 'Contact Person')}</Label>
                    <Input value={editForm.contact_person} onChange={e => setField('contact_person', e.target.value)} className="mt-1" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <PhoneField value={parsePhoneValue(editForm.phone)} onChange={(v) => setField('phone', toE164(v))} label={pickBi(isRTL, 'رقم الهاتف', 'Phone')} optional />
                    <PhoneField value={parsePhoneValue(editForm.mobile)} onChange={(v) => setField('mobile', toE164(v))} label={pickBi(isRTL, 'رقم الجوال', 'Mobile')} optional />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> {pickBi(isRTL, 'الرقم الموحد', 'Unified Number')}</Label>
                      <Input value={editForm.unified_number} onChange={e => setField('unified_number', e.target.value)} dir="ltr" className="mt-1 tech-content" placeholder="920xxxxxxx" />
                    </div>
                    <PhoneField value={parsePhoneValue(editForm.customer_service_phone)} onChange={(v) => setField('customer_service_phone', toE164(v))} label={pickBi(isRTL, 'خدمة العملاء', 'Customer Service')} optional />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> {pickBi(isRTL, 'البريد الإلكتروني', 'Email')}</Label>
                    <Input type="email" value={editForm.email} onChange={e => setField('email', e.target.value)} dir="ltr" className="mt-1 tech-content" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Globe className="w-3 h-3" /> {pickBi(isRTL, 'الموقع الإلكتروني', 'Website')}</Label>
                    <Input type="url" value={editForm.website} onChange={e => setField('website', e.target.value)} dir="ltr" className="mt-1 tech-content" placeholder="https://" />
                  </div>
                  {editingBiz && (
                    <div className="mt-4">
                      <Separator className="mb-3" />
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-semibold flex items-center gap-1">
                          <Package className="w-3 h-3" /> {pickBi(isRTL, 'الخدمات المسجلة', 'Registered Services')}
                        </Label>
                        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => { setEditingBiz(null); openServices(editingBiz.id); }}>
                          <Settings className="w-3 h-3" /> {pickBi(isRTL, 'إدارة', 'Manage')}
                        </Button>
                      </div>
                      {allServices.filter((s) => s.business_id === editingBiz.id).length === 0 ? (
                        <p className="text-[10px] text-muted-foreground">{pickBi(isRTL, 'لا توجد خدمات مسجلة', 'No registered services')}</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {allServices.filter((s) => s.business_id === editingBiz.id).map((s) => (
                            <Badge key={s.id} variant="outline" className="text-[9px]">
                              {language === 'ar' ? s.name_ar : (s.name_en || s.name_ar)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* ── Branches Tab ── */}
                <TabsContent value="branches" className="space-y-4 mt-3">
                  <div className="space-y-2">
                    {branches.map((br) => (
                      <div key={br.id} className={`flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-primary/20 transition-all ${!br.is_active ? 'opacity-50' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">{language === 'ar' ? br.name_ar : (br.name_en || br.name_ar)}</p>
                            {(() => {
                              const t = ((br as unknown as { branch_type?: string }).branch_type) ?? (br.is_main ? 'main' : 'branch');
                              const map: Record<string, { ar: string; en: string; cls: string }> = {
                                main:           { ar: 'المركز الرئيسي', en: 'Headquarters',     cls: 'bg-primary/10 text-primary' },
                                branch:         { ar: 'فرع',           en: 'Branch',           cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
                                warehouse:      { ar: 'مستودع',        en: 'Warehouse',        cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
                                admin_office:   { ar: 'مكتب إداري',    en: 'Admin office',     cls: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
                                regional_office:{ ar: 'إدارة إقليمية', en: 'Regional office',  cls: 'bg-teal-500/10 text-teal-700 dark:text-teal-300' },
                                head_office:    { ar: 'الإدارة العامة', en: 'Head office',     cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
                              };
                              const m = map[t] ?? map.branch;
                              return <Badge className={`text-[8px] h-4 border-0 ${m.cls}`}>{pickBi(isRTL, m.ar, m.en)}</Badge>;
                            })()}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                            {br.phone && <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{br.phone}</span>}
                            {br.mobile && <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{br.mobile}</span>}
                            {br.unified_number && <span>{br.unified_number}</span>}
                            {(br.address || br.district) && (
                              <span className="flex items-center gap-0.5 truncate max-w-[280px]">
                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{br.address || [br.district, br.street_name].filter(Boolean).join(' · ')}</span>
                              </span>
                            )}
                            {br.contact_person && <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />{br.contact_person}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Switch checked={br.is_active} onCheckedChange={v => toggleBranchMutation.mutate({ id: br.id, is_active: v })} />
                          <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => {
                            setEditingBranchId(br.id);
                            setBranchForm({
                              name_ar: br.name_ar, name_en: br.name_en || '', is_main: br.is_main, is_active: br.is_active,
                              branch_type: ((br as unknown as { branch_type?: string }).branch_type as 'main' | 'branch' | 'warehouse' | 'admin_office' | 'regional_office' | 'head_office') ?? (br.is_main ? 'main' : 'branch'),
                              contact_person: br.contact_person || '', phone: br.phone || '', mobile: br.mobile || '',
                              unified_number: br.unified_number || '', customer_service_phone: br.customer_service_phone || '',
                              email: br.email || '', website: br.website || '', country_id: br.country_id || '',
                              city_id: br.city_id || '', region: br.region || '', district: br.district || '',
                              street_name: br.street_name || '', building_number: br.building_number || '',
                              national_id: br.national_id || '', additional_number: br.additional_number || '',
                              address: br.address || '', latitude: br.latitude || '', longitude: br.longitude || '',
                            });
                          }}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"
                            onClick={() => { if (confirm(pickBi(isRTL, 'حذف هذا الفرع؟', 'Delete this branch?'))) deleteBranchMutation.mutate(br.id); }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {branches.length === 0 && !branchForm && (
                      <p className="text-center text-sm text-muted-foreground py-6">{pickBi(isRTL, 'لا توجد فروع مسجلة', 'No branches registered')}</p>
                    )}
                  </div>

                  {branchForm ? (
                    <div className="space-y-3 p-4 rounded-xl border border-primary/30 bg-primary/[0.03]">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                          {editingBranchId ? <Edit className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          {editingBranchId ? (pickBi(isRTL, 'تعديل الفرع', 'Edit Branch')) : (pickBi(isRTL, 'إضافة فرع جديد', 'Add New Branch'))}
                        </p>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setBranchForm(null); setEditingBranchId(null); }}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">{pickBi(isRTL, 'اسم الفرع (عربي)', 'Branch Name (AR)')} *</Label>
                          <Button
                            type="button" size="sm" variant="ghost"
                            className="h-6 px-2 text-[10.5px] gap-1 text-muted-foreground hover:text-primary"
                            disabled={branchTranslating !== null}
                            onClick={() => translateBranchName('ar')}
                            title={pickBi(isRTL, 'ترجمة من العربي إلى الإنجليزي', 'Translate Arabic → English')}
                          >
                            {branchTranslating === 'ar' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                            <span>→ EN</span>
                          </Button>
                        </div>
                        <Input value={branchForm.name_ar} onChange={e => setBranchForm((f) => ({ ...f, name_ar: e.target.value }))} className="mt-1" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">{pickBi(isRTL, 'اسم الفرع (إنجليزي)', 'Branch Name (EN)')}</Label>
                          <Button
                            type="button" size="sm" variant="ghost"
                            className="h-6 px-2 text-[10.5px] gap-1 text-muted-foreground hover:text-primary"
                            disabled={branchTranslating !== null}
                            onClick={() => translateBranchName('en')}
                            title={pickBi(isRTL, 'ترجمة من الإنجليزي إلى العربي', 'Translate English → Arabic')}
                          >
                            {branchTranslating === 'en' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                            <span>→ AR</span>
                          </Button>
                        </div>
                        <Input value={branchForm.name_en} onChange={e => setBranchForm((f) => ({ ...f, name_en: e.target.value }))} dir="ltr" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">{pickBi(isRTL, 'نوع الموقع', 'Location type')} *</Label>
                        <Select
                          value={branchForm.branch_type || 'branch'}
                          onValueChange={(v) => {
                            const nextIsMain = v === 'main';
                            if (nextIsMain) {
                              const currentMain = branches.find((b: AdminBusinessBranchLite) => b.is_main && b.id !== editingBranchId);
                              if (currentMain && !confirm(isRTL
                                ? `سيتم إلغاء "${currentMain.name_ar}" كمركز رئيسي وتعيين هذا الموقع بدلاً منه. متابعة؟`
                                : `"${currentMain.name_ar}" will be unset as headquarters and this location will replace it. Continue?`)) {
                                return;
                              }
                            }
                            setBranchForm((f) => ({ ...f, branch_type: v as AdminBusinessBranchType, is_main: nextIsMain }));
                          }}
                        >
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="main">{pickBi(isRTL, 'المركز الرئيسي', 'Headquarters (main)')}</SelectItem>
                            <SelectItem value="branch">{pickBi(isRTL, 'فرع', 'Branch')}</SelectItem>
                            <SelectItem value="warehouse">{pickBi(isRTL, 'مستودع', 'Warehouse')}</SelectItem>
                            <SelectItem value="admin_office">{pickBi(isRTL, 'مكتب إداري', 'Admin office')}</SelectItem>
                            <SelectItem value="regional_office">{pickBi(isRTL, 'إدارة إقليمية', 'Regional office')}</SelectItem>
                            <SelectItem value="head_office">{pickBi(isRTL, 'الإدارة العامة', 'Head office')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {pickBi(isRTL, 'المركز الرئيسي يُستخدم كعنوان المنشأة الافتراضي. مسموح بمركز رئيسي واحد فقط.', 'Headquarters is used as the default business address. Only one headquarters is allowed.')}
                        </p>
                      </div>
                      <Separator />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{pickBi(isRTL, 'بيانات التواصل', 'Contact Info')}</p>
                      <div>
                        <Label className="text-xs">{pickBi(isRTL, 'اسم مسؤول التواصل', 'Contact Person')}</Label>
                        <Input value={branchForm.contact_person} onChange={e => setBranchForm((f) => ({ ...f, contact_person: e.target.value }))} className="mt-1" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <PhoneField value={parsePhoneValue(branchForm.phone)} onChange={(v) => setBranchForm((f) => ({ ...f, phone: toE164(v) }))} label={pickBi(isRTL, 'الهاتف', 'Phone')} optional />
                        <PhoneField value={parsePhoneValue(branchForm.mobile)} onChange={(v) => setBranchForm((f) => ({ ...f, mobile: toE164(v) }))} label={pickBi(isRTL, 'الجوال', 'Mobile')} optional />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">{pickBi(isRTL, 'الرقم الموحد', 'Unified Number')}</Label>
                          <Input value={branchForm.unified_number} onChange={e => setBranchForm((f) => ({ ...f, unified_number: e.target.value }))} dir="ltr" className="mt-1" placeholder="920xxxxxxx" />
                        </div>
                        <PhoneField value={parsePhoneValue(branchForm.customer_service_phone)} onChange={(v) => setBranchForm((f) => ({ ...f, customer_service_phone: toE164(v) }))} label={pickBi(isRTL, 'خدمة العملاء', 'Customer Service')} optional />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">{pickBi(isRTL, 'البريد الإلكتروني', 'Email')}</Label>
                          <Input value={branchForm.email} onChange={e => setBranchForm((f) => ({ ...f, email: e.target.value }))} dir="ltr" className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">{pickBi(isRTL, 'الموقع الإلكتروني', 'Website')}</Label>
                          <Input value={branchForm.website} onChange={e => setBranchForm((f) => ({ ...f, website: e.target.value }))} dir="ltr" className="mt-1" />
                        </div>
                      </div>
                      <Separator />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{pickBi(isRTL, 'العنوان', 'Address')}</p>
                      <div>
                        <Label className="text-xs">{pickBi(isRTL, 'الدولة', 'Country')}</Label>
                        <Select value={branchForm.country_id} onValueChange={v => setBranchForm((f) => ({ ...f, country_id: v, city_id: '' }))}>
                          <SelectTrigger className="mt-1 max-w-xs"><SelectValue placeholder={pickBi(isRTL, 'اختر', 'Select')} /></SelectTrigger>
                          <SelectContent>
                            {countries.map((c) => <SelectItem key={c.id} value={c.id}>{language === 'ar' ? c.name_ar : c.name_en}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Unified address microservice — Region → City → District (typeable) + SPL + street/building/national-id. */}
                      <NationalAddressForm
                        isRTL={isRTL}
                        value={{
                          short_address: branchForm.short_address ?? null,
                          region: branchForm.region ?? null,
                          region_en: branchForm.region_en ?? null,
                          city_id: branchForm.city_id ?? null,
                          district: branchForm.district ?? null,
                          district_en: branchForm.district_en ?? null,
                          street_name: branchForm.street_name ?? null,
                          street_name_en: branchForm.street_name_en ?? null,
                          building_number: branchForm.building_number ?? null,
                          additional_number: branchForm.additional_number ?? null,
                          post_code: branchForm.post_code ?? null,
                          address: branchForm.address ?? null,
                          address_en: branchForm.address_en ?? null,
                          address_manual: branchForm.address_manual ?? false,
                        } as NationalAddressValue}
                        onChange={(next) => setBranchForm((f) => ({
                          ...f,
                          short_address: next.short_address ?? '',
                          region: next.region ?? '',
                          region_en: next.region_en ?? '',
                          city_id: next.city_id ?? '',
                          district: next.district ?? '',
                          district_en: next.district_en ?? '',
                          street_name: next.street_name ?? '',
                          street_name_en: next.street_name_en ?? '',
                          building_number: next.building_number ?? '',
                          additional_number: next.additional_number ?? '',
                          post_code: next.post_code ?? '',
                          address: next.address ?? '',
                          address_en: next.address_en ?? '',
                          address_manual: next.address_manual ?? false,
                          national_id: f.national_id,
                        }))}
                      />
                      <div>
                        <Label className="text-xs">{pickBi(isRTL, 'الرقم الوطني', 'National ID')}</Label>
                        <Input value={branchForm.national_id} onChange={e => setBranchForm((f) => ({ ...f, national_id: e.target.value }))} dir="ltr" className="mt-1 max-w-xs" />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch checked={branchForm.is_active} onCheckedChange={v => setBranchForm((f) => ({ ...f, is_active: v }))} />
                          <span className="text-xs">{pickBi(isRTL, 'مفعّل', 'Active')}</span>
                        </div>
                      </div>
                      <Button onClick={() => saveBranchMutation.mutate()} disabled={!branchForm.name_ar || saveBranchMutation.isPending}
                        className="w-full gap-1.5">
                        <Save className="w-3.5 h-3.5" />
                        {saveBranchMutation.isPending ? '...' : (pickBi(isRTL, 'حفظ الفرع', 'Save Branch'))}
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full gap-1.5" onClick={() => {
                      // First location defaults to "main" (headquarters); subsequent
                      // ones default to "branch" and admins can switch to warehouse
                      // or admin_office.
                      const isFirst = branches.length === 0;
                      setBranchForm({
                        ...emptyBranch(),
                        is_main: isFirst,
                        branch_type: isFirst ? 'main' : 'branch',
                      });
                      setEditingBranchId(null);
                    }}>
                      <Plus className="w-3.5 h-3.5" /> {pickBi(isRTL, 'إضافة موقع جديد (فرع / مستودع / مكتب)', 'Add new location (branch / warehouse / office)')}
                    </Button>
                  )}
                </TabsContent>

                {/* ── Controls Tab ── */}
                <TabsContent value="controls" className="space-y-4 mt-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border/30">
                      <div>
                        <p className="text-sm font-medium">{pickBi(isRTL, 'حالة التفعيل', 'Active Status')}</p>
                        <p className="text-[10px] text-muted-foreground">{pickBi(isRTL, 'تفعيل أو تعطيل ظهور العمل', 'Enable or disable business visibility')}</p>
                      </div>
                      <Switch checked={editForm.is_active} onCheckedChange={v => setField('is_active', v)} />
                    </div>
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border/30">
                      <div>
                        <p className="text-sm font-medium">{pickBi(isRTL, 'التوثيق', 'Verification')}</p>
                        <p className="text-[10px] text-muted-foreground">{pickBi(isRTL, 'علامة التوثيق الرسمية', 'Official verification badge')}</p>
                      </div>
                      <Switch checked={editForm.is_verified} onCheckedChange={v => setField('is_verified', v)} />
                    </div>
                    <div className="p-3.5 rounded-xl bg-muted/30 border border-border/30">
                      <p className="text-sm font-medium mb-2">{pickBi(isRTL, 'مستوى العضوية', 'Membership Tier')}</p>
                      {(() => {
                        const cur = tiers.find(t => t.value === editForm.membership_tier) || tiers[0];
                        return (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/60 border border-border/40">
                            <span>{cur.icon}</span>
                            <span className="text-sm font-medium">
                              {language === 'ar' ? cur.label_ar : cur.label_en}
                            </span>
                          </div>
                        );
                      })()}
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {pickBi(isRTL, 'تغيير العضوية يتم من خيار العضوية في صف المنشأة.', 'Use the row tier picker to change membership.')}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* ── Ops Tab (BUSINESS-CORE-2): internal notes + activity timeline ── */}
                <TabsContent value="ops" className="space-y-4 mt-3">
                  <BusinessOperationsPanel businessId={editingBiz.id} />
                </TabsContent>
              </Tabs>

              <Separator className="my-4" />
              <div className="flex gap-2">
                <Button onClick={() => updateBizMutation.mutate()} disabled={!editForm.name_ar || updateBizMutation.isPending} className="flex-1 gap-1.5 rounded-xl">
                  <Save className="w-3.5 h-3.5" />
                  {updateBizMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (pickBi(isRTL, 'حفظ التعديلات', 'Save Changes'))}
                </Button>
                <Button variant="outline" onClick={() => setEditingBiz(null)} className="rounded-xl">{pickBi(isRTL, 'إلغاء', 'Cancel')}</Button>
              </div>
          </div>

  );
};

export default EditBusinessPanel;
