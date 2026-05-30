/**
 * ServiceBrandsPicker — inline brand chips per business_service.
 * - Reads existing brand links from `business_service_brands`.
 * - Picks from the admin-managed `brand_catalog` (search by name + sector filter).
 * - Lets the provider request a brand addition (creates row in `brand_addition_requests`
 *   plus a linked help ticket — same pattern as service addition requests).
 * Strict no-popup: inline expansion + inline request form.
 */
import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Plus, Search, Send, Tag, X } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  listServiceBrandLinks,
  searchApprovedBrandsForPicker,
  linkBrandToService,
  unlinkBrandFromService,
  createServiceBrandRequest,
  attachTicketRefToBrandRequest,
} from '@/modules/brands';

type Brand = Awaited<ReturnType<typeof searchApprovedBrandsForPicker>>[number];
type Link = Awaited<ReturnType<typeof listServiceBrandLinks>>[number];

export interface ServiceBrandsPickerProps {
  businessServiceId: string;
  businessId: string;
  userId: string;
  sectorId: string | null;
  isRTL: boolean;
}

export const ServiceBrandsPicker: React.FC<ServiceBrandsPickerProps> = ({
  businessServiceId, businessId, userId, sectorId, isRTL,
}) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [reqOpen, setReqOpen] = useState(false);
  const [reqForm, setReqForm] = useState({ name_ar: '', name_en: '', website: '' });

  const linksKey = ['service-brand-links', businessServiceId];
  const { data: links = [] } = useQuery({
    queryKey: linksKey,
    queryFn: () => listServiceBrandLinks(businessServiceId),
    staleTime: 60_000,
  });

  const linkedIds = useMemo(() => new Set(links.map((l) => l.brand_id)), [links]);

  const { data: catalog = [], isFetching: searching } = useQuery({
    queryKey: ['brand-catalog-search', sectorId, search, open],
    queryFn: () =>
      open
        ? searchApprovedBrandsForPicker({ sectorId, q: search })
        : Promise.resolve([] as Brand[]),
    enabled: open,
    staleTime: 30_000,
  });

  const linkMut = useMutation({
    mutationFn: (brandId: string) =>
      linkBrandToService({ businessServiceId, businessId, brandId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: linksKey }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const unlinkMut = useMutation({
    mutationFn: (linkId: string) => unlinkBrandFromService(linkId),
    onSuccess: () => qc.invalidateQueries({ queryKey: linksKey }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const requestMut = useMutation({
    mutationFn: async () => {
      if (!reqForm.name_ar.trim()) throw new Error(isRTL ? 'الاسم بالعربي مطلوب' : 'Arabic name required');
      const req = await createServiceBrandRequest({
        businessId,
        userId,
        businessServiceId,
        sectorId,
        name_ar: reqForm.name_ar.trim(),
        name_en: reqForm.name_en.trim() || null,
        website: reqForm.website.trim() || null,
      });

      const title = isRTL
        ? `طلب إضافة علامة تجارية: ${reqForm.name_ar}`
        : `New brand request: ${reqForm.name_en || reqForm.name_ar}`;
      const desc = `${isRTL ? 'رقم الطلب' : 'Request ref'}: ${req.ref_id}\n${reqForm.website ? `Website: ${reqForm.website}\n` : ''}`.trim();
      const { data: ticket, error: e2 } = await supabase
        .from('help_feature_requests')
        .insert({ user_id: userId, business_id: businessId, category: 'service_request', title, description: desc })
        .select('ref_id')
        .single();
      if (e2) throw e2;

      if (ticket?.ref_id) {
        await attachTicketRefToBrandRequest(req.id, ticket.ref_id as string);
      }
      return req;
    },
    onSuccess: (req) => {
      setReqOpen(false);
      setReqForm({ name_ar: '', name_en: '', website: '' });
      toast.success(isRTL
        ? `تم إرسال طلب العلامة — ${req.ref_id ?? ''}`
        : `Brand request submitted — ${req.ref_id ?? ''}`);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Tag className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">
          {isRTL ? 'العلامات/الوكالات:' : 'Brands/Agencies:'}
        </span>
        {links.length === 0 && (
          <span className="text-[10px] text-muted-foreground/70">{isRTL ? 'لا توجد' : 'None'}</span>
        )}
        {links.map((l) => l.brand && (
          <Badge key={l.id} variant="outline" className="text-[10px] gap-1 ps-2 pe-1">
            {isRTL ? l.brand.name_ar : (l.brand.name_en || l.brand.name_ar)}
            <button
              onClick={() => unlinkMut.mutate(l.id)}
              className="rounded-full hover:bg-destructive/10 p-0.5"
              aria-label="remove"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-[10px]"
          onClick={() => setOpen((v) => !v)}
        >
          <Plus className="h-3 w-3 me-0.5" />
          {isRTL ? 'إضافة علامة' : 'Add brand'}
        </Button>
      </div>

      {open && (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-2 space-y-2">
          <div className="relative">
            <Search className="absolute start-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              dir="auto"
              className="h-8 ps-7 text-xs"
              placeholder={isRTL ? 'ابحث في كتالوج العلامات...' : 'Search brand catalog...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-40 overflow-y-auto no-scrollbar space-y-1">
            {searching && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            {!searching && catalog.length === 0 && (
              <p className="text-[10px] text-muted-foreground py-1">
                {isRTL ? 'لا نتائج. اطلب إضافة علامة جديدة.' : 'No results. Request a new brand below.'}
              </p>
            )}
            {catalog.filter((b) => !linkedIds.has(b.id)).map((b) => (
              <button
                key={b.id}
                onClick={() => linkMut.mutate(b.id)}
                disabled={linkMut.isPending}
                className="w-full flex items-center justify-between gap-2 rounded-md border border-border/40 bg-card px-2 py-1 text-xs hover:bg-accent/5"
              >
                <span className="truncate text-start">{isRTL ? b.name_ar : (b.name_en || b.name_ar)}</span>
                <Plus className="h-3 w-3 text-primary shrink-0" />
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <span className="text-[10px] text-muted-foreground">{isRTL ? 'لم تجد علامتك؟' : "Can't find it?"}</span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setReqOpen((v) => !v)}>
              <Send className="h-3 w-3 me-1" />
              {isRTL ? 'طلب إضافة' : 'Request new'}
            </Button>
          </div>
          {reqOpen && (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">{isRTL ? 'اسم (عربي) *' : 'Name (AR) *'}</Label>
                  <Input dir="auto" className="h-8 text-xs" value={reqForm.name_ar} onChange={(e) => setReqForm((f) => ({ ...f, name_ar: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-[10px]">{isRTL ? 'اسم (إنجليزي)' : 'Name (EN)'}</Label>
                  <Input dir="auto" className="h-8 text-xs" value={reqForm.name_en} onChange={(e) => setReqForm((f) => ({ ...f, name_en: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label className="text-[10px]">{isRTL ? 'الموقع الإلكتروني' : 'Website'}</Label>
                <Input dir="ltr" className="h-8 text-xs tech-content" placeholder="https://..." value={reqForm.website} onChange={(e) => setReqForm((f) => ({ ...f, website: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setReqOpen(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                <Button size="sm" className="h-7 text-xs" disabled={requestMut.isPending} onClick={() => requestMut.mutate()}>
                  {requestMut.isPending ? <Loader2 className="h-3 w-3 me-1 animate-spin" /> : <Send className="h-3 w-3 me-1" />}
                  {isRTL ? 'إرسال' : 'Submit'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ServiceBrandsPicker;