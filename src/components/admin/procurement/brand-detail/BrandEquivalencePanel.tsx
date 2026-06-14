/**
 * ADMIN REDESIGN PHASE 9G — BrandEquivalencePanel.
 * Presentational panel for the central brand-products catalog and the
 * provider product-request review queue. All callbacks and state are owned
 * by `AdminBrandDetail.tsx`; no Supabase, no queries, no mutations.
 */
import React from 'react';
import {
  Loader2, Plus, Package, Inbox, Save, Edit3, Trash2, Check, X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/image-upload';
import { ResponsiveImage } from '@/modules/files';
import { pickBi } from '@/components/common/Bilingual';
import {
  pick, brandProductStatusLabel, brandProductRequestStatusLabel,
  type BrandProduct, type BrandProductRequest,
} from '@/modules/brands';

export interface NewProductDraft {
  name_ar: string; name_en: string; model_number: string; sku: string;
  description_ar: string; image_url: string;
  image_asset_id: string; image_variants: Record<string, string>;
}

export interface BrandEquivalencePanelProps {
  isRTL: boolean;
  locale: 'ar' | 'en';

  products: BrandProduct[] | undefined;
  productsLoading: boolean;

  newProduct: NewProductDraft;
  setNewProduct: React.Dispatch<React.SetStateAction<NewProductDraft>>;
  onCreateProduct: () => void;
  createPending: boolean;

  editingProductId: string | null;
  setEditingProductId: (v: string | null) => void;
  editProduct: NewProductDraft;
  setEditProduct: React.Dispatch<React.SetStateAction<NewProductDraft>>;
  onUpdateProduct: (productId: string) => void;
  updatePending: boolean;
  onDeleteProduct: (productId: string) => void;
  deletePending: boolean;

  productRequests: BrandProductRequest[] | undefined;
  productRequestsLoading: boolean;
  rejectingReqId: string | null;
  setRejectingReqId: (v: string | null) => void;
  reqRejectReason: string;
  setReqRejectReason: (v: string) => void;
  onApproveProductReq: (reqId: string) => void;
  approveProductReqPending: boolean;
  onRejectProductReq: (reqId: string, reason: string) => void;
  rejectProductReqPending: boolean;
}

export const BrandEquivalencePanel: React.FC<BrandEquivalencePanelProps> = ({
  isRTL, locale,
  products, productsLoading,
  newProduct, setNewProduct, onCreateProduct, createPending,
  editingProductId, setEditingProductId,
  editProduct, setEditProduct, onUpdateProduct, updatePending,
  onDeleteProduct, deletePending,
  productRequests, productRequestsLoading,
  rejectingReqId, setRejectingReqId,
  reqRejectReason, setReqRejectReason,
  onApproveProductReq, approveProductReqPending,
  onRejectProductReq, rejectProductReqPending,
}) => {
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4" />{pickBi(isRTL, 'منتجات العلامة', 'Brand products')}
            <span className="text-xs text-muted-foreground">({products?.length ?? 0})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-xl p-3 bg-muted/30 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold"><Plus className="w-4 h-4" />{pickBi(isRTL, 'إضافة منتج مركزياً (معتمد فوراً)', 'Add product centrally (instantly approved)')}</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input dir="auto" placeholder={pickBi(isRTL, 'الاسم (عربي) *', 'Name (AR) *')} value={newProduct.name_ar}
                onChange={(e) => setNewProduct(p => ({ ...p, name_ar: e.target.value }))} />
              <Input dir="ltr" placeholder={pickBi(isRTL, 'الاسم (إنجليزي)', 'Name (EN)')} value={newProduct.name_en}
                onChange={(e) => setNewProduct(p => ({ ...p, name_en: e.target.value }))} />
              <Input dir="ltr" placeholder={pickBi(isRTL, 'رقم الموديل', 'Model number')} className="tech-content" value={newProduct.model_number}
                onChange={(e) => setNewProduct(p => ({ ...p, model_number: e.target.value }))} />
              <Input dir="ltr" placeholder="SKU" className="tech-content" value={newProduct.sku}
                onChange={(e) => setNewProduct(p => ({ ...p, sku: e.target.value }))} />
            </div>
            <Textarea dir="auto" rows={2} placeholder={pickBi(isRTL, 'وصف موجز', 'Short description')} value={newProduct.description_ar}
              onChange={(e) => setNewProduct(p => ({ ...p, description_ar: e.target.value }))} />
            <div>
              <Label className="text-xs mb-2 block">{pickBi(isRTL, 'صورة المنتج (تُضغط تلقائياً)', 'Product image (auto-compressed)')}</Label>
              <ImageUpload bucket="business-assets" value={newProduct.image_url}
                pipeline="product"
                onChange={(url) => setNewProduct(p => ({ ...p, image_url: url || '' }))}
                onRemove={() => setNewProduct(p => ({ ...p, image_url: '' }))}
                onUploadedMeta={(meta) => setNewProduct(p => ({
                  ...p,
                  image_asset_id: meta.imageAssetId ?? '',
                  image_variants: (meta.variants ?? {}) as Record<string, string>,
                }))}
                placeholder={pickBi(isRTL, 'رفع صورة', 'Upload image')} />
            </div>
            <Button size="sm" onClick={onCreateProduct}
              disabled={!newProduct.name_ar.trim() || createPending}>
              {createPending ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Plus className="w-4 h-4 me-1" />}
              {pickBi(isRTL, 'إضافة', 'Add')}
            </Button>
          </div>

          {productsLoading ? <Skeleton className="h-24" /> : (products ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{pickBi(isRTL, 'لا توجد منتجات بعد', 'No products yet')}</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(products ?? []).map((p: BrandProduct) => editingProductId === p.id ? (
                <div key={p.id} className="border rounded-xl p-3 space-y-2 bg-card">
                  <Input dir="auto" value={editProduct.name_ar} onChange={(e) => setEditProduct(s => ({ ...s, name_ar: e.target.value }))} placeholder={pickBi(isRTL, 'العربية', 'Arabic')} />
                  <Input dir="ltr" value={editProduct.name_en} onChange={(e) => setEditProduct(s => ({ ...s, name_en: e.target.value }))} placeholder="English" />
                  <Input dir="ltr" value={editProduct.model_number} onChange={(e) => setEditProduct(s => ({ ...s, model_number: e.target.value }))} placeholder="Model" className="tech-content" />
                  <Input dir="ltr" value={editProduct.sku} onChange={(e) => setEditProduct(s => ({ ...s, sku: e.target.value }))} placeholder="SKU" className="tech-content" />
                  <Textarea dir="auto" rows={2} value={editProduct.description_ar} onChange={(e) => setEditProduct(s => ({ ...s, description_ar: e.target.value }))} />
                  <ImageUpload bucket="business-assets" value={editProduct.image_url}
                    pipeline="product"
                    onChange={(url) => setEditProduct(s => ({ ...s, image_url: url || '' }))}
                    onRemove={() => setEditProduct(s => ({ ...s, image_url: '' }))}
                    onUploadedMeta={(meta) => setEditProduct(s => ({
                      ...s,
                      image_asset_id: meta.imageAssetId ?? '',
                      image_variants: (meta.variants ?? {}) as Record<string, string>,
                    }))} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => onUpdateProduct(p.id)} disabled={updatePending}>
                      <Save className="w-4 h-4 me-1" />{pickBi(isRTL, 'حفظ', 'Save')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingProductId(null)}>{pickBi(isRTL, 'إلغاء', 'Cancel')}</Button>
                  </div>
                </div>
              ) : (
                <div key={p.id} className="border rounded-xl p-3 bg-card hover-lift">
                  {p.image_url || (p.image_variants && Object.keys(p.image_variants).length > 0) ? (
                    <ResponsiveImage
                      variants={p.image_variants ?? null}
                      originalUrl={p.image_url}
                      alt={p.name_ar}
                      sizes="(max-width: 768px) 100vw, 320px"
                      className="w-full h-28 object-cover rounded-lg border bg-background mb-2"
                    />
                  ) : (
                    <div className="w-full h-28 rounded-lg bg-muted grid place-items-center text-xs text-muted-foreground mb-2"><Package className="w-6 h-6 opacity-40" /></div>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate" dir="auto">{locale === 'ar' ? p.name_ar : (p.name_en ?? p.name_ar)}</div>
                      {p.model_number && <div className="text-[10px] text-muted-foreground tech-content">{p.model_number}</div>}
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{pick(brandProductStatusLabel[p.status], locale)}</Badge>
                  </div>
                  {p.ref_id && <code className="tech-content text-[10px] text-muted-foreground">{p.ref_id}</code>}
                  <div className="flex gap-1 mt-2">
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => {
                      setEditingProductId(p.id);
                      setEditProduct({
                        name_ar: p.name_ar, name_en: p.name_en ?? '',
                        model_number: p.model_number ?? '', sku: p.sku ?? '',
                        description_ar: p.description_ar ?? '', image_url: p.image_url ?? '',
                        image_asset_id: p.image_asset_id ?? '',
                        image_variants: p.image_variants ?? {},
                      });
                    }}><Edit3 className="w-3 h-3 me-1" />{pickBi(isRTL, 'تعديل', 'Edit')}</Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive"
                      onClick={() => onDeleteProduct(p.id)} disabled={deletePending}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Inbox className="w-4 h-4" />{pickBi(isRTL, 'طلبات منتجات من المزودين', 'Provider product requests')}
            <span className="text-xs text-muted-foreground">({productRequests?.length ?? 0})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {productRequestsLoading ? <Skeleton className="h-20" /> : (productRequests ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">{pickBi(isRTL, 'لا توجد طلبات', 'No requests')}</p>
          ) : (
            <ul className="space-y-2">
              {(productRequests ?? []).map((r: BrandProductRequest) => (
                <li key={r.id} className="border rounded-xl p-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {r.image_url ? (
                        <img src={r.image_url} alt={r.name_ar} className="w-12 h-12 rounded-lg object-cover border" loading="lazy" decoding="async" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted grid place-items-center"><Package className="w-4 h-4 opacity-40" /></div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm" dir="auto">{locale === 'ar' ? r.name_ar : (r.name_en ?? r.name_ar)}</span>
                          <Badge variant="outline" className="text-[10px]">{pick(brandProductRequestStatusLabel[r.status], locale)}</Badge>
                          {r.ref_id && <code className="tech-content text-[10px] text-muted-foreground">{r.ref_id}</code>}
                        </div>
                        {r.model_number && <div className="text-[11px] text-muted-foreground tech-content">{r.model_number}</div>}
                        {(r.description_ar || r.description_en) && <p className="text-xs text-muted-foreground mt-1 line-clamp-2" dir="auto">{locale === 'ar' ? r.description_ar : (r.description_en ?? r.description_ar)}</p>}
                        {r.reject_reason && <p className="text-xs text-destructive mt-1" dir="auto">{r.reject_reason}</p>}
                      </div>
                    </div>
                    {(r.status === 'pending' || r.status === 'in_review' || r.status === 'needs_more_info') && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => onApproveProductReq(r.id)} disabled={approveProductReqPending}>
                          <Check className="w-4 h-4 me-1" />{pickBi(isRTL, 'اعتماد', 'Approve')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setRejectingReqId(r.id); setReqRejectReason(''); }}>
                          <X className="w-4 h-4 me-1" />{pickBi(isRTL, 'رفض', 'Reject')}
                        </Button>
                      </div>
                    )}
                  </div>
                  {rejectingReqId === r.id && (
                    <div className="mt-2 p-2 rounded-lg bg-muted/40 space-y-2">
                      <Input value={reqRejectReason} onChange={(e) => setReqRejectReason(e.target.value)}
                        placeholder={pickBi(isRTL, 'سبب الرفض…', 'Rejection reason…')} className="h-9" />
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive"
                          onClick={() => onRejectProductReq(r.id, reqRejectReason)}
                          disabled={!reqRejectReason.trim() || rejectProductReqPending}>
                          {pickBi(isRTL, 'تأكيد', 'Confirm')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setRejectingReqId(null); setReqRejectReason(''); }}>{pickBi(isRTL, 'إلغاء', 'Cancel')}</Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default BrandEquivalencePanel;