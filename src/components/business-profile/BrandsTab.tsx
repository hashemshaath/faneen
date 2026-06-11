/**
 * BrandsTab — public + owner view of the brands a business handles.
 *
 * Public visitors see only links whose `authorization_status = 'verified'`.
 * The business owner additionally sees pending/unverified links badged as
 * "تحت المراجعة" so they know admin review is still in flight.
 *
 * Owner-only inline panel:
 *   1. pick a business_service to attach the brand to
 *   2. search the approved brand catalog, click to link (status = 'pending')
 *   3. or request a brand-addition for catalog admins to review
 *
 * No popups — fully inline per the Qitaat UX policy.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, ExternalLink, Globe, Loader2, Package, Plus, Search, Send, ShieldCheck, Tag, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import {
  attachTicketRefToBrandRequest,
  createServiceBrandRequest,
  linkBrandToService,
  listMyProviderBrandLinks,
  searchApprovedBrandsForPicker,
  unlinkBrandFromService,
} from "@/modules/brands";
import { useServices } from "./business-profile.data";
import { supabase } from "@/integrations/supabase/client";

type Link = Awaited<ReturnType<typeof listMyProviderBrandLinks>>[number];

interface Props {
  businessId: string;
  isOwner: boolean;
  ownerUserId?: string | null;
  sectorId?: string | null;
}

export const BrandsTab = ({ businessId, isOwner, ownerUserId, sectorId = null }: Props) => {
  const { language, isRTL } = useLanguage();
  const qc = useQueryClient();

  const linksKey = ["business-brand-links", businessId];
  const { data: links = [], isLoading } = useQuery({
    queryKey: linksKey,
    queryFn: () => listMyProviderBrandLinks(businessId),
    staleTime: 60_000,
  });

  const { data: services = [] } = useServices(businessId);

  // Dedupe by brand_id — a brand may be linked to several services.
  const visibleLinks = useMemo(() => {
    const filtered = isOwner
      ? links
      : links.filter((l) => l.authorization_status === "verified");
    const seen = new Set<string>();
    return filtered.filter((l) => {
      if (!l.brand || seen.has(l.brand_id)) return false;
      seen.add(l.brand_id);
      return true;
    });
  }, [links, isOwner]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground sm:text-xl">
            {isRTL ? "العلامات التجارية" : "Brands"}
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {isRTL
              ? "العلامات والوكالات التي يتعامل معها هذا المزود."
              : "Brands and agencies this provider works with."}
          </p>
        </div>
        {isOwner && services.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
            <Tag className="h-3 w-3" />
            {isRTL ? `${visibleLinks.length} علامة مرتبطة` : `${visibleLinks.length} linked`}
          </span>
        )}
      </header>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : visibleLinks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 py-10 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40">
            <Package className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground">
            {isRTL ? "لا توجد علامات تجارية مرتبطة بعد." : "No brands linked yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visibleLinks.map((link) => (
            <BrandCard
              key={link.id}
              link={link}
              isOwner={isOwner}
              onRemove={(linkId) =>
                unlinkBrandFromService(linkId).then(() =>
                  qc.invalidateQueries({ queryKey: linksKey }),
                )
              }
            />
          ))}
        </div>
      )}

      {isOwner && ownerUserId && services.length > 0 && (
        <OwnerAddBrandPanel
          businessId={businessId}
          userId={ownerUserId}
          sectorId={sectorId}
          services={services.map((s) => ({
            id: s.id,
            name_ar: s.name_ar,
            name_en: s.name_en,
          }))}
          existingBrandIds={links.map((l) => l.brand_id)}
          onChange={() => qc.invalidateQueries({ queryKey: linksKey })}
        />
      )}

      {isOwner && services.length === 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground">
          {isRTL
            ? "أضف خدمة واحدة على الأقل قبل ربط العلامات التجارية."
            : "Add at least one service before linking brands."}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────

const BrandCard = ({
  link,
  isOwner,
  onRemove,
}: {
  link: Link;
  isOwner: boolean;
  onRemove: (linkId: string) => void;
}) => {
  const { language, isRTL } = useLanguage();
  const brand = link.brand!;
  const name = language === "ar" ? brand.name_ar : brand.name_en || brand.name_ar;
  const isVerified = link.authorization_status === "verified";

  return (
    <div className="group relative flex flex-col items-center gap-2 rounded-2xl border border-border/50 bg-card p-3 text-center transition-all hover-lift hover:border-accent/40 sm:p-4">
      {isOwner && (
        <button
          type="button"
          onClick={() => onRemove(link.id)}
          className="absolute end-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          aria-label={isRTL ? "إزالة" : "Remove"}
        >
          <X className="h-3 w-3" />
        </button>
      )}
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-background sm:h-20 sm:w-20">
        {brand.logo_url ? (
          <img
            src={brand.logo_url}
            alt={name}
            loading="lazy"
            className="h-full w-full object-contain p-1.5"
          />
        ) : (
          <Package className="h-7 w-7 text-muted-foreground/40" />
        )}
      </div>
      <div className="min-h-[2.5rem] w-full">
        <p dir="auto" className="line-clamp-2 text-xs font-semibold text-foreground sm:text-sm">
          {name}
        </p>
      </div>
      {!isVerified && (
        <div className="flex flex-wrap items-center justify-center gap-1">
          <Badge
            variant="outline"
            className="gap-1 border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] font-medium text-amber-700 dark:text-amber-400"
          >
            <Clock className="h-3 w-3" />
            {isRTL ? "تحت المراجعة" : "Under review"}
          </Badge>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────

const OwnerAddBrandPanel = ({
  businessId,
  userId,
  sectorId,
  services,
  existingBrandIds,
  onChange,
}: {
  businessId: string;
  userId: string;
  sectorId: string | null;
  services: Array<{ id: string; name_ar: string; name_en: string | null }>;
  existingBrandIds: string[];
  onChange: () => void;
}) => {
  const { language, isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const [serviceId, setServiceId] = useState<string>(services[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [reqOpen, setReqOpen] = useState(false);
  const [reqForm, setReqForm] = useState({ name_ar: "", name_en: "", website: "" });
  const linked = useMemo(() => new Set(existingBrandIds), [existingBrandIds]);

  const { data: catalog = [], isFetching } = useQuery({
    queryKey: ["brand-catalog-search-tab", sectorId, search, open],
    queryFn: () =>
      open
        ? searchApprovedBrandsForPicker({ sectorId, q: search })
        : Promise.resolve([] as Awaited<ReturnType<typeof searchApprovedBrandsForPicker>>),
    enabled: open,
    staleTime: 30_000,
  });

  const linkMut = useMutation({
    mutationFn: (brandId: string) =>
      linkBrandToService({ businessServiceId: serviceId, businessId, brandId }),
    onSuccess: () => {
      onChange();
      toast.success(
        isRTL
          ? "تمت إضافة العلامة — قيد المراجعة من الإدارة"
          : "Brand added — pending admin review",
      );
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const requestMut = useMutation({
    mutationFn: async () => {
      if (!reqForm.name_ar.trim())
        throw new Error(isRTL ? "الاسم بالعربي مطلوب" : "Arabic name required");
      const req = await createServiceBrandRequest({
        businessId,
        userId,
        businessServiceId: serviceId,
        sectorId,
        name_ar: reqForm.name_ar.trim(),
        name_en: reqForm.name_en.trim() || null,
        website: reqForm.website.trim() || null,
      });
      const title = isRTL
        ? `طلب إضافة علامة تجارية: ${reqForm.name_ar}`
        : `New brand request: ${reqForm.name_en || reqForm.name_ar}`;
      const desc = `${isRTL ? "رقم الطلب" : "Request ref"}: ${req.ref_id}\n${
        reqForm.website ? `Website: ${reqForm.website}\n` : ""
      }`.trim();
      const { data: ticket, error } = await supabase
        .from("help_feature_requests")
        .insert({
          user_id: userId,
          business_id: businessId,
          category: "service_request",
          title,
          description: desc,
        })
        .select("ref_id")
        .single();
      if (error) throw error;
      if (ticket?.ref_id) {
        await attachTicketRefToBrandRequest(req.id, ticket.ref_id as string);
      }
      return req;
    },
    onSuccess: (req) => {
      setReqOpen(false);
      setReqForm({ name_ar: "", name_en: "", website: "" });
      toast.success(
        isRTL
          ? `تم إرسال طلب العلامة — ${req.ref_id ?? ""}`
          : `Brand request submitted — ${req.ref_id ?? ""}`,
      );
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  return (
    <section className="rounded-2xl border border-border/50 bg-card/60 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-heading text-sm font-semibold text-foreground">
            {isRTL ? "إضافة علامة تجارية" : "Add a brand"}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {isRTL
              ? "تظهر العلامة فور الإضافة بحالة (تحت المراجعة) حتى يعتمدها فريق قِطاعات."
              : "Newly linked brands appear as ‘Under review’ until our team verifies them."}
          </p>
        </div>
        <Button
          variant={open ? "outline" : "default"}
          size="sm"
          className="gap-1.5"
          onClick={() => setOpen((v) => !v)}
        >
          <Plus className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-45")} />
          {open ? (isRTL ? "إغلاق" : "Close") : isRTL ? "إضافة علامة" : "Add brand"}
        </Button>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-border/40 pt-3">
          <div>
            <Label className="text-[11px]">
              {isRTL ? "اربط بخدمة" : "Attach to service"}
            </Label>
            <select
              dir="auto"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2 text-xs"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {language === "ar" ? s.name_ar : s.name_en || s.name_ar}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              dir="auto"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isRTL ? "ابحث في كتالوج العلامات المعتمدة..." : "Search the approved brand catalog..."}
              className="h-9 ps-8 text-xs"
            />
          </div>

          <div className="max-h-56 space-y-1 overflow-y-auto">
            {isFetching ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
            ) : catalog.length === 0 ? (
              <p className="py-2 text-center text-[11px] text-muted-foreground">
                {isRTL ? "لا نتائج. اطلب إضافة علامة جديدة أدناه." : "No results. Request a new brand below."}
              </p>
            ) : (
              catalog
                .filter((b) => !linked.has(b.id) && serviceId)
                .map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    disabled={linkMut.isPending}
                    onClick={() => linkMut.mutate(b.id)}
                    className="flex w-full items-center gap-2 rounded-lg border border-border/40 bg-card px-2.5 py-1.5 text-xs transition-colors hover:border-accent/40 hover:bg-accent/5"
                  >
                    {b.logo_url ? (
                      <img src={b.logo_url} alt="" loading="lazy" className="h-6 w-6 object-contain" />
                    ) : (
                      <Package className="h-4 w-4 text-muted-foreground/40" />
                    )}
                    <span dir="auto" className="flex-1 truncate text-start">
                      {language === "ar" ? b.name_ar : b.name_en || b.name_ar}
                    </span>
                    {b.website && (
                      <a
                        href={b.website}
                        target="_blank"
                        rel="noreferrer noopener"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-accent"
                        aria-label="Website"
                      >
                        <Globe className="h-3 w-3" />
                      </a>
                    )}
                    <Plus className="h-3.5 w-3.5 text-primary" />
                  </button>
                ))
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border/40 pt-2">
            <span className="text-[11px] text-muted-foreground">
              {isRTL ? "لم تجد علامتك؟" : "Can't find your brand?"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-[11px]"
              onClick={() => setReqOpen((v) => !v)}
            >
              <Send className="h-3 w-3" />
              {isRTL ? "طلب إضافة" : "Request new"}
            </Button>
          </div>

          {reqOpen && (
            <div className="space-y-2 rounded-xl border border-border/40 bg-muted/20 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <Label className="text-[11px]">{isRTL ? "اسم (عربي) *" : "Name (AR) *"}</Label>
                  <Input
                    dir="auto"
                    className="h-8 text-xs"
                    value={reqForm.name_ar}
                    onChange={(e) => setReqForm((f) => ({ ...f, name_ar: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-[11px]">{isRTL ? "اسم (إنجليزي)" : "Name (EN)"}</Label>
                  <Input
                    dir="auto"
                    className="h-8 text-xs"
                    value={reqForm.name_en}
                    onChange={(e) => setReqForm((f) => ({ ...f, name_en: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label className="text-[11px]">{isRTL ? "الموقع الإلكتروني" : "Website"}</Label>
                <Input
                  dir="ltr"
                  className="tech-content h-8 text-xs"
                  placeholder="https://..."
                  value={reqForm.website}
                  onChange={(e) => setReqForm((f) => ({ ...f, website: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setReqOpen(false)}
                >
                  {isRTL ? "إلغاء" : "Cancel"}
                </Button>
                <Button
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  disabled={requestMut.isPending}
                  onClick={() => requestMut.mutate()}
                >
                  {requestMut.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  {isRTL ? "إرسال الطلب" : "Submit request"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default BrandsTab;