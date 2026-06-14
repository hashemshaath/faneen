/**
 * ADMIN REDESIGN PHASE 9G — BrandProvidersPanel.
 * Presentational panel for provider relationships: add-link form (search
 * businesses, pick service, scope to whole brand or specific products),
 * list of existing links, and per-link approve/reject UI. The scoped
 * products editor inside each link is rendered via a parent-supplied
 * render prop because it owns its own query — keeping this panel free of
 * any Supabase or query/mutation logic.
 */
import React from 'react';
import { Loader2, Check, X, Plus, Building2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { pickBi } from '@/components/common/Bilingual';
import {
  pick, relationshipLabel, authStatusLabel,
  type BrandProduct, type ProviderBrandLink, type ProviderBrandRelationship,
} from '@/modules/brands';

export interface ProviderBusinessLite {
  id: string;
  ref_id: string | null;
  name_ar: string | null;
  name_en: string | null;
  username?: string | null;
}

export interface BusinessServiceLite {
  id: string;
  name_ar: string | null;
  name_en: string | null;
}

const RELATIONSHIP_OPTIONS: ProviderBrandRelationship[] = [
  'manufacturer', 'official_agent', 'authorized_distributor', 'distributor',
  'reseller', 'importer', 'installer', 'fabricator',
  'maintenance_provider', 'showroom', 'supplier', 'other',
];

export interface BrandProvidersPanelProps {
  isRTL: boolean;
  locale: 'ar' | 'en';

  links: ProviderBrandLink[] | undefined;
  linksLoading: boolean;
  bizMap: Map<string, ProviderBusinessLite>;

  // Add-link form
  linkSearch: string;
  setLinkSearch: (v: string) => void;
  linkBusinessId: string;
  setLinkBusinessId: (v: string) => void;
  linkBusinessLabel: string;
  setLinkBusinessLabel: (v: string) => void;
  linkServiceId: string;
  setLinkServiceId: (v: string) => void;
  linkRelationship: string;
  setLinkRelationship: (v: string) => void;
  linkScope: 'all' | 'products';
  setLinkScope: (v: 'all' | 'products') => void;
  linkProductIds: string[];
  setLinkProductIds: React.Dispatch<React.SetStateAction<string[]>>;

  products: BrandProduct[] | undefined;
  linkSearchData: ProviderBusinessLite[] | undefined;
  linkServicesData: BusinessServiceLite[] | undefined;
  linkServicesLoading: boolean;
  onCreateLink: () => void;
  createLinkPending: boolean;

  // Per-link state
  expandedLinkId: string | null;
  setExpandedLinkId: (v: string | null) => void;
  renderLinkProductsEditor: (link: ProviderBrandLink) => React.ReactNode;

  rejectingLinkId: string | null;
  setRejectingLinkId: (v: string | null) => void;
  linkReason: string;
  setLinkReason: (v: string) => void;
  onApproveLink: (linkId: string) => void;
  approveLinkPending: boolean;
  onRejectLink: (linkId: string, reason: string) => void;
  rejectLinkPending: boolean;
}

export const BrandProvidersPanel: React.FC<BrandProvidersPanelProps> = ({
  isRTL, locale,
  links, linksLoading, bizMap,
  linkSearch, setLinkSearch,
  linkBusinessId, setLinkBusinessId,
  linkBusinessLabel, setLinkBusinessLabel,
  linkServiceId, setLinkServiceId,
  linkRelationship, setLinkRelationship,
  linkScope, setLinkScope,
  linkProductIds, setLinkProductIds,
  products, linkSearchData, linkServicesData, linkServicesLoading,
  onCreateLink, createLinkPending,
  expandedLinkId, setExpandedLinkId, renderLinkProductsEditor,
  rejectingLinkId, setRejectingLinkId, linkReason, setLinkReason,
  onApproveLink, approveLinkPending, onRejectLink, rejectLinkPending,
}) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="w-4 h-4" />{pickBi(isRTL, 'علاقات المزودين', 'Provider relationships')}{' '}
          <span className="text-xs text-muted-foreground">({links?.length ?? 0})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          {pickBi(isRTL, 'نوع العلاقة (وكيل حصري، موزع معتمد، مُصنِّع، إلخ) يُحدَّد من قِبل المزود ويُعتمَد من هنا.', 'Relationship type (exclusive agent, authorized distributor, manufacturer, etc.) is declared by the provider and approved here.')}
        </p>

        <div className="mb-4 rounded-lg border border-dashed bg-muted/30 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Plus className="w-4 h-4" />
            {pickBi(isRTL, 'إضافة وربط مزود بالعلامة', 'Link a provider to this brand')}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
            <div className="md:col-span-5 relative">
              <Input
                value={linkBusinessId ? linkBusinessLabel : linkSearch}
                onChange={(e) => { setLinkSearch(e.target.value); setLinkBusinessId(''); setLinkBusinessLabel(''); setLinkServiceId('__all__'); }}
                placeholder={pickBi(isRTL, 'ابحث عن جهة بالاسم أو الرمز…', 'Search business by name or ref…')}
                className="h-10"
              />
              {linkSearch.trim().length >= 2 && !linkBusinessId && (linkSearchData?.length ?? 0) > 0 && (
                <div className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-background shadow-md">
                  {(linkSearchData ?? []).map((b) => {
                    const bname = locale === 'ar' ? (b.name_ar ?? b.name_en ?? '') : (b.name_en ?? b.name_ar ?? '');
                    return (
                      <button
                        key={b.id}
                        type="button"
                        className="w-full text-start px-3 py-2 hover:bg-muted text-sm flex items-center justify-between gap-2"
                        onClick={() => { setLinkBusinessId(b.id); setLinkBusinessLabel(bname || b.username || b.ref_id || b.id.slice(0, 8)); setLinkSearch(''); }}
                      >
                        <span className="truncate" dir="auto">{bname || b.username || b.id.slice(0, 8)}</span>
                        {b.ref_id && <code className="tech-content text-[10px] text-muted-foreground">{b.ref_id}</code>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="md:col-span-4">
              <select
                value={linkServiceId}
                onChange={(e) => setLinkServiceId(e.target.value)}
                disabled={!linkBusinessId || linkServicesLoading}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="__all__">
                  {(linkServicesData ?? []).length === 0
                    ? pickBi(isRTL, 'لا توجد خدمات — سيتم إنشاء خدمة عامة وربطها', 'No services — a general placeholder will be created')
                    : pickBi(isRTL, 'كل الخدمات (افتراضي)', 'All services (default)')}
                </option>
                {(linkServicesData ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{locale === 'ar' ? (s.name_ar ?? s.name_en ?? s.id.slice(0,8)) : (s.name_en ?? s.name_ar ?? s.id.slice(0,8))}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <select
                value={linkRelationship}
                onChange={(e) => setLinkRelationship(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {RELATIONSHIP_OPTIONS.map((rt) => (
                  <option key={rt} value={rt}>{pick(relationshipLabel[rt], locale)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="rounded-md border bg-background/50 p-2 space-y-2">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-medium">{pickBi(isRTL, 'نطاق الربط:', 'Link scope:')}</span>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input type="radio" name="link-scope" checked={linkScope === 'all'}
                  onChange={() => { setLinkScope('all'); setLinkProductIds([]); }} />
                <span>{pickBi(isRTL, 'العلامة كاملة', 'Whole brand')}</span>
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input type="radio" name="link-scope" checked={linkScope === 'products'}
                  onChange={() => setLinkScope('products')} />
                <span>{pickBi(isRTL, 'منتجات محددة', 'Specific products')}</span>
              </label>
              <span className="text-muted-foreground ms-auto">
                {pickBi(isRTL, `المنتجات المتاحة: ${products?.length ?? 0}`, `${products?.length ?? 0} available`)}
              </span>
            </div>
            {linkScope === 'products' && (
              (products ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {pickBi(isRTL, 'لا توجد منتجات لهذه العلامة. أضف منتجات أولاً من قسم منتجات العلامة أدناه.', 'No products for this brand yet. Add some from the Brand products section below.')}
                </p>
              ) : (
                <div className="max-h-40 overflow-auto rounded border bg-background p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {(products ?? []).map((p) => {
                    const checked = linkProductIds.includes(p.id);
                    const pname = locale === 'ar' ? (p.name_ar ?? p.name_en ?? '') : (p.name_en ?? p.name_ar ?? '');
                    return (
                      <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/40 rounded px-1 py-0.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setLinkProductIds((prev) => e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id))}
                        />
                        {p.image_url && <img src={p.image_url} alt="" className="w-5 h-5 rounded object-cover" />}
                        <span className="truncate" dir="auto">{pname || p.id.slice(0, 8)}</span>
                        {p.model_number && <code className="tech-content text-[10px] text-muted-foreground ms-auto">{p.model_number}</code>}
                      </label>
                    );
                  })}
                </div>
              )
            )}
          </div>
          <div className="flex items-center justify-end">
            <Button
              size="sm"
              onClick={onCreateLink}
              disabled={!linkBusinessId || createLinkPending || (linkScope === 'products' && linkProductIds.length === 0)}
            >
              {createLinkPending ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Plus className="w-4 h-4 me-1" />}
              {pickBi(isRTL, 'ربط واعتماد', 'Link & verify')}
            </Button>
          </div>
        </div>

        {linksLoading ? <Skeleton className="h-24" /> : (links ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{pickBi(isRTL, 'لا توجد علاقات بعد', 'No provider links yet')}</p>
        ) : (
          <div className="space-y-2">
            {(links ?? []).map((l) => {
              const biz = bizMap.get(l.business_id);
              const bizName = biz ? (locale === 'ar' ? (biz.name_ar ?? biz.name_en) : (biz.name_en ?? biz.name_ar)) : null;
              return (
                <div key={l.id} className="border rounded-lg p-3 flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{bizName ?? biz?.username ?? biz?.ref_id ?? l.business_id.slice(0, 8)}</span>
                      {biz?.ref_id && <code className="tech-content text-xs">{biz.ref_id}</code>}
                      {l.relationship_type && <Badge variant="outline" className="text-xs">{pick(relationshipLabel[l.relationship_type], locale)}</Badge>}
                      {l.authorization_status && <Badge variant="secondary" className="text-xs">{pick(authStatusLabel[l.authorization_status], locale)}</Badge>}
                    </div>
                    {l.ref_id && <code className="tech-content text-[10px] text-muted-foreground">{l.ref_id}</code>}
                    {l.authorization_document_url && (
                      <a href={l.authorization_document_url} target="_blank" rel="noopener noreferrer"
                         className="text-xs text-primary underline ms-2 inline-flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />{pickBi(isRTL, 'مستند التفويض', 'Auth doc')}
                      </a>
                    )}
                    <div className="mt-2">
                      <button
                        type="button"
                        className="text-[11px] text-primary underline"
                        onClick={() => setExpandedLinkId(expandedLinkId === l.id ? null : l.id)}
                      >
                        {expandedLinkId === l.id
                          ? pickBi(isRTL, 'إخفاء المنتجات', 'Hide products')
                          : pickBi(isRTL, 'إدارة المنتجات المرتبطة', 'Manage scoped products')}
                      </button>
                      {expandedLinkId === l.id && renderLinkProductsEditor(l)}
                    </div>
                  </div>
                  {l.authorization_status === 'pending' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => onApproveLink(l.id)} disabled={approveLinkPending}>
                        <Check className="w-4 h-4 me-1" />{pickBi(isRTL, 'اعتماد', 'Approve')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setRejectingLinkId(l.id); setLinkReason(''); }}>
                        <X className="w-4 h-4 me-1" />{pickBi(isRTL, 'رفض', 'Reject')}
                      </Button>
                    </div>
                  )}
                  {rejectingLinkId === l.id && (
                    <div className="w-full mt-2 p-2 rounded bg-muted/40 space-y-2">
                      <Input value={linkReason} onChange={(e) => setLinkReason(e.target.value)}
                        placeholder={pickBi(isRTL, 'سبب الرفض…', 'Rejection reason…')} className="h-9" />
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive"
                          onClick={() => linkReason.trim() && onRejectLink(l.id, linkReason)}
                          disabled={!linkReason.trim() || rejectLinkPending}>
                          {pickBi(isRTL, 'تأكيد', 'Confirm')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setRejectingLinkId(null); setLinkReason(''); }}>{pickBi(isRTL, 'إلغاء', 'Cancel')}</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BrandProvidersPanel;