/**
 * ADMIN-DATA-ENRICHMENT-MICROSERVICE-1
 *
 * Three-step Inline wizard for admin-only data enrichment.
 *  1. Sources — Website URL + Google Maps URL
 *  2. Review  — per-field comparison + confidence + conflict alert
 *  3. Apply   — link to existing business, or create a new provider lead
 *
 * Strict rules:
 *  - All network calls go through @/modules/adminEnrichment (no direct
 *    edge invocations, no supabase client import).
 *  - No popups / dialogs. Inline only.
 *  - No API keys client-side. No auto-save. No auto-publish.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link as LinkIcon, MapPin, Sparkles, ShieldCheck, AlertTriangle, ArrowRight, Loader2, Check, Search, Star, Building2, ExternalLink, Download, FileSpreadsheet, Zap, RefreshCw, Trash2, SlidersHorizontal, Bug, Database, Wrench, FileEdit, Save } from "lucide-react";
import * as XLSX from "xlsx";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bi, useBi } from "@/components/common/Bilingual";
import { useNoIndex } from "@/hooks/useNoIndex";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { mapsService } from "@/modules/google";
import { GoogleStatusPanel } from "@/components/admin/GoogleStatusPanel";
import { IntakeWizardGuide } from "@/components/admin/provider-intake/IntakeWizardGuide";
import { PilotContactTemplateCard } from "@/components/admin/provider-intake/PilotContactTemplateCard";
import {
  fetchEnrichment,
  enhanceEnrichment,
  applyEnrichment,
  saveEnrichmentDraft,
  listEnrichmentDrafts,
  loadEnrichmentDraft,
  deleteEnrichmentDraft,
  searchPlaces,
  clearEnrichmentCache,
  type PlaceCandidate,
  type EnrichmentDraft,
  type EnrichmentFieldKey,
  type EnrichmentFetchResult,
  type EnrichmentEnhanceResult,
  type EnrichmentExtra,
} from "@/modules/adminEnrichment";

type Step = "search" | "sources" | "review" | "apply";

// Top-level industrial categories — mirrors the active `categories` rows
// (parent_id IS NULL). Keeps the picker offline-friendly and avoids a
// supabase client import in this page (guarded by tests).
const CATEGORY_OPTIONS: Array<{ slug: string; name_ar: string; name_en: string }> = [
  { slug: "aluminum",                name_ar: "الألمنيوم",                name_en: "Aluminum" },
  { slug: "iron-steel",              name_ar: "الحديد والاستيل",          name_en: "Iron & Steel" },
  { slug: "glass",                   name_ar: "الزجاج",                   name_en: "Glass" },
  { slug: "wood-cabinets",           name_ar: "الخشب والخزائن",           name_en: "Wood & Cabinets" },
  { slug: "accessories",             name_ar: "الاكسسوارات",              name_en: "Accessories" },
  { slug: "designers",               name_ar: "المصممين",                 name_en: "Designers" },
  { slug: "energy-sustainability",   name_ar: "الطاقة والاستدامة",        name_en: "Energy & Sustainability" },
  { slug: "gypsum-decorations",      name_ar: "الديكورات الجبسية",        name_en: "Gypsum Decorations" },
  { slug: "facades-cladding",        name_ar: "الواجهات وتلبيس الواجهات", name_en: "Facades & Cladding" },
];

const FIELD_LABELS: Record<EnrichmentFieldKey, { ar: string; en: string }> = {
  name_ar: { ar: "الاسم (عربي)", en: "Name (Arabic)" },
  name_en: { ar: "الاسم (إنجليزي)", en: "Name (English)" },
  activity: { ar: "النشاط", en: "Activity" },
  activity_ar: { ar: "النشاط (عربي)", en: "Activity (Arabic)" },
  activity_en: { ar: "النشاط (إنجليزي)", en: "Activity (English)" },
  description_ar: { ar: "الوصف (عربي)", en: "Description (Arabic)" },
  description_en: { ar: "الوصف (إنجليزي)", en: "Description (English)" },
  phone: { ar: "الهاتف الأساسي", en: "Primary phone" },
  phone_mobile: { ar: "الجوال", en: "Mobile" },
  phone_landline: { ar: "الهاتف الأرضي", en: "Landline" },
  unified_number: { ar: "الرقم الموحّد", en: "Unified number" },
  whatsapp: { ar: "واتساب", en: "WhatsApp" },
  customer_service: { ar: "خدمة العملاء", en: "Customer service" },
  email: { ar: "البريد الإلكتروني", en: "Email" },
  website: { ar: "الموقع الإلكتروني", en: "Website" },
  city: { ar: "المدينة (عربي)", en: "City (Arabic)" },
  city_en: { ar: "المدينة (إنجليزي)", en: "City (English)" },
  district: { ar: "الحي (عربي)", en: "District (Arabic)" },
  district_en: { ar: "الحي (إنجليزي)", en: "District (English)" },
  street: { ar: "الشارع (عربي)", en: "Street (Arabic)" },
  street_en: { ar: "الشارع (إنجليزي)", en: "Street (English)" },
  national_address: { ar: "العنوان الوطني (عربي)", en: "National Address (Arabic)" },
  national_address_en: { ar: "العنوان الوطني (إنجليزي)", en: "National Address (English)" },
  latitude: { ar: "خط العرض", en: "Latitude" },
  longitude: { ar: "خط الطول", en: "Longitude" },
  working_hours: { ar: "أوقات العمل", en: "Working Hours" },
  logo_url: { ar: "اللوجو", en: "Logo" },
  social_links: { ar: "الروابط الاجتماعية", en: "Social Links" },
  facebook: { ar: "فيسبوك", en: "Facebook" },
  instagram: { ar: "إنستغرام", en: "Instagram" },
  twitter: { ar: "X (تويتر)", en: "X (Twitter)" },
  linkedin: { ar: "لينكدإن", en: "LinkedIn" },
  youtube: { ar: "يوتيوب", en: "YouTube" },
  tiktok: { ar: "تيك توك", en: "TikTok" },
  snapchat: { ar: "سناب شات", en: "Snapchat" },
};

const FIELD_KEYS = Object.keys(FIELD_LABELS) as EnrichmentFieldKey[];

function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const map = {
    high: { ar: "ثقة عالية", en: "High", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    medium: { ar: "ثقة متوسطة", en: "Medium", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    low: { ar: "ثقة منخفضة", en: "Low", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  } as const;
  const c = map[level];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${c.cls}`}>
      <ShieldCheck className="h-3 w-3" />
      <Bi ar={c.ar} en={c.en} />
    </span>
  );
}

function SourceChip({ src }: { src: string }) {
  const labels: Record<string, { ar: string; en: string }> = {
    website: { ar: "موقع", en: "Website" },
    google_maps: { ar: "خرائط Google", en: "Google Maps" },
    ai_enhanced: { ar: "AI", en: "AI" },
    manual: { ar: "يدوي", en: "Manual" },
  };
  const l = labels[src] ?? { ar: src, en: src };
  return (
    <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
      <Bi ar={l.ar} en={l.en} />
    </span>
  );
}

export default function AdminDataEnrichment() {
  useNoIndex();
  const bi = useBi();
  const [step, setStep] = useState<Step>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceCandidate[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceCandidate | null>(null);
  const [searchDeferred, setSearchDeferred] = useState(false);
  const [searchCached, setSearchCached] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [bypassCacheFlag, setBypassCacheFlag] = useState(false);
  // Filters / Sort
  const [minRating, setMinRating] = useState<number>(0);
  const [minReviews, setMinReviews] = useState<number>(0);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"relevance" | "rating_desc" | "reviews_desc" | "name_asc">("relevance");
  const [clearMsg, setClearMsg] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [website, setWebsite] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EnrichmentDraft | null>(null);
  const [conflicts, setConflicts] = useState<EnrichmentFetchResult["conflicts"]>({});
  const [missing, setMissing] = useState<string[]>([]);
  const [aiEnhanced, setAiEnhanced] = useState<Partial<Record<EnrichmentFieldKey, string>>>({});
  const [approved, setApproved] = useState<Partial<Record<EnrichmentFieldKey, string>>>({});
  const [diagnostics, setDiagnostics] = useState<NonNullable<EnrichmentFetchResult["diagnostics"]> | null>(null);
  const [dbMatches, setDbMatches] = useState<NonNullable<EnrichmentFetchResult["db_matches"]> | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [categorySlug, setCategorySlug] = useState<string>("");
  const [servicesAr, setServicesAr] = useState<string>("");
  const [servicesEn, setServicesEn] = useState<string>("");
  const [mode, setMode] = useState<"lead" | "business">("lead");
  const [businessId, setBusinessId] = useState("");
  const [applyResult, setApplyResult] = useState<{ entity?: string; id?: string } | null>(null);
  const [draftStatus, setDraftStatus] = useState<"unsaved" | "saved" | "applied">("unsaved");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchFallbackNotice, setSearchFallbackNotice] = useState<{
    title: string;
    message: string;
    fields: string[];
    meta: string[];
  } | null>(null);
  const qc = useQueryClient();

  const buildExtra = (): EnrichmentExtra => ({
    category_slug: categorySlug || null,
    services_ar: servicesAr || null,
    services_en: servicesEn || null,
    ai_enhanced: Object.keys(aiEnhanced).length ? (aiEnhanced as Record<string, string>) : null,
    selected_place: selectedPlace as unknown as Record<string, unknown> | null,
    db_matches: dbMatches as unknown as Record<string, unknown> | null,
    diagnostics: diagnostics as unknown as Record<string, unknown> | null,
  });

  const synthDraftFromApproved = (
    appr: Record<string, string>,
  ): EnrichmentDraft => {
    const out = {} as EnrichmentDraft;
    for (const k of FIELD_KEYS) {
      out[k] = {
        value: appr[k] ?? null,
        source: "manual",
        confidence: appr[k] ? "high" : "low",
      } as EnrichmentDraft[typeof k];
    }
    return out;
  };

  const fetchMut = useMutation({
    mutationFn: (opts: { bypass?: boolean } = {}) => fetchEnrichment({
      website: website.trim() || undefined,
      mapsUrl: mapsUrl.trim() || undefined,
      placeId: selectedPlace?.place_id || undefined,
      bypassCache: opts.bypass === true,
    }),
    onSuccess: (res) => {
      if (res.error || !res.merged) {
        setErrorMsg(bi("تعذر جلب البيانات. تحقق من الروابط وحاول مرة أخرى.", "Could not fetch data. Check the URLs and try again."));
        return;
      }
      setErrorMsg(null);
      setSessionId(res.session_id ?? null);
      setDraft(res.merged);
      setConflicts(res.conflicts ?? {});
      setMissing(res.missing ?? []);
      setDiagnostics(res.diagnostics ?? null);
      setDbMatches(res.db_matches ?? null);
      setDraftStatus("unsaved");
      setApplyResult(null);
      const initial: Partial<Record<EnrichmentFieldKey, string>> = {};
      for (const k of FIELD_KEYS) {
        const v = res.merged[k]?.value;
        if (v) initial[k] = v;
      }
      // Pretty-print working hours (stored as JSON {weekdayDescriptions,periods}).
      if (initial.working_hours) {
        try {
          const parsed = JSON.parse(initial.working_hours);
          const lines: string[] = Array.isArray(parsed?.weekdayDescriptions)
            ? parsed.weekdayDescriptions
            : Array.isArray(parsed) ? parsed : [];
          if (lines.length) initial.working_hours = lines.join("\n");
        } catch { /* keep as-is */ }
      }
      setApproved(initial);
      setStep("review");
    },
    onError: () => setErrorMsg(bi("حدث خطأ. حاول مجددًا.", "Something went wrong. Try again.")),
  });

  // ─── Drafts list (saved & applied) ───────────────────────────────
  const draftsQuery = useQuery({
    queryKey: ["admin-enrichment-drafts"],
    queryFn: () => listEnrichmentDrafts(),
    refetchOnWindowFocus: false,
  });

  const loadDraftMut = useMutation({
    mutationFn: (id: string) => loadEnrichmentDraft(id),
    onSuccess: (res) => {
      const sess = res.session;
      if (!sess || !sess.merged) {
        setErrorMsg(bi("تعذر تحميل المسودة.", "Could not load draft."));
        return;
      }
      const merged = sess.merged;
      const appr = (merged.approved ?? {}) as Record<string, string>;
      setSessionId(sess.id);
      setDraft(synthDraftFromApproved(appr));
      setApproved(appr);
      setCategorySlug(merged.category_slug ?? "");
      setServicesAr(merged.services_ar ?? "");
      setServicesEn(merged.services_en ?? "");
      setAiEnhanced((merged.ai_enhanced ?? {}) as Partial<Record<EnrichmentFieldKey, string>>);
      setSelectedPlace((merged.selected_place as unknown as PlaceCandidate | null) ?? null);
      setDbMatches((merged.db_matches as NonNullable<EnrichmentFetchResult["db_matches"]> | null) ?? null);
      setDiagnostics((merged.diagnostics as NonNullable<EnrichmentFetchResult["diagnostics"]> | null) ?? null);
      setConflicts({});
      setMissing([]);
      setApplyResult(sess.applied_entity_id ? { entity: sess.applied_entity_type ?? undefined, id: sess.applied_entity_id } : null);
      setDraftStatus(sess.status === "applied" ? "applied" : "saved");
      setStep("review");
      setErrorMsg(null);
    },
    onError: () => setErrorMsg(bi("تعذر تحميل المسودة.", "Could not load draft.")),
  });

  const deleteDraftMut = useMutation({
    mutationFn: (id: string) => deleteEnrichmentDraft(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-enrichment-drafts"] }),
  });

  const saveDraftMut = useMutation({
    mutationFn: () => {
      if (!sessionId) return Promise.resolve({ error: "no_session" });
      const cleanApproved: Record<string, string> = {};
      for (const [k, v] of Object.entries(approved)) {
        if (v && v.trim()) cleanApproved[k] = v.trim();
      }
      return saveEnrichmentDraft({
        session_id: sessionId,
        approved: cleanApproved,
        extra: buildExtra(),
      });
    },
    onSuccess: (res) => {
      if (res.error || !res.ok) {
        setErrorMsg(bi("تعذر حفظ المسودة.", "Could not save draft."));
        return;
      }
      setErrorMsg(null);
      setDraftStatus("saved");
      setSavedMsg(bi("تم الحفظ كمسودة قابلة للتعديل — لم يُنشأ حساب ولا رقم تعريفي.", "Saved as an editable draft — no account or Ref ID has been created."));
      qc.invalidateQueries({ queryKey: ["admin-enrichment-drafts"] });
      window.setTimeout(() => setSavedMsg(null), 5000);
    },
  });

  const searchMut = useMutation({
    mutationFn: (opts: { append?: boolean; bypass?: boolean } = {}) =>
      searchPlaces({
        query: searchQuery.trim(),
        region: "SA",
        language: "ar",
        pageSize: 20,
        pageToken: opts.append ? nextPageToken : null,
        bypassCache: opts.bypass ?? bypassCacheFlag,
      }).then((r) => ({ ...r, _append: opts.append === true })),
    onMutate: () => {
      setSearchFallbackNotice(null);
      setErrorMsg(null);
    },
    onSuccess: (res) => {
      if (res.error) {
        setSearchFallbackNotice(null);
        const parts: string[] = [bi("تعذر البحث في خرائط Google.", "Could not search Google Maps.")];
        parts.push(`[${res.error}]`);
        if (typeof res.upstreamStatus === "number") parts.push(`HTTP ${res.upstreamStatus}`);
        if (typeof res.upstreamMs === "number") parts.push(`${res.upstreamMs}ms`);
        if (res.detail) parts.push(`· ${res.detail}`);
        if (res.requestId) parts.push(`· req=${res.requestId.slice(0, 8)}`);
        setErrorMsg(parts.join(" "));
        if (!res._append) setSearchResults([]);
        return;
      }
      setErrorMsg(null);
      setSearchDeferred(Boolean(res.deferred));
      setSearchCached(Boolean(res.cached));
      setNextPageToken(res.nextPageToken ?? null);
      setSearchResults((prev) => res._append ? [...prev, ...(res.results ?? [])] : (res.results ?? []));
      setBypassCacheFlag(false);
      if (res.fallback === "geocoding" || res.fallback === "browser_places" || res.fallback === "browser_geocoding") {
        const fieldLabels: Record<string, string> = {
          phone: bi("الهاتف", "phone"),
          rating: bi("التقييمات", "ratings"),
          user_rating_count: bi("عدد المراجعات", "review count"),
          website: bi("الموقع الإلكتروني", "website"),
          business_status: bi("حالة النشاط", "business status"),
        };
        const fallbackName = res.fallback === "browser_geocoding"
          ? bi("Geocoding من المتصفح", "browser Geocoding")
          : res.fallback === "browser_places"
          ? bi("Places من المتصفح", "browser Places")
          : "Geocoding";
        const missingFields = (res.fallbackMissingFields ?? [])
          .map((field) => fieldLabels[field] ?? field)
          .filter((field) => field.trim().length > 0);
        setSearchFallbackNotice({
          title: bi("تم استخدام مسار بديل تلقائيًا", "Automatic fallback used"),
          message: res.fallback === "browser_places"
            ? bi(`تم عرض نتائج عبر ${fallbackName} بعد تعذّر مسار Places API على الخادم.`, `Showing ${fallbackName} results after the server Places API path failed.`)
            : bi(`تم استخدام ${fallbackName} لأن Places API (New) محظورة أو غير مفعّلة على مفتاح Google الحالي.`, `${fallbackName} was used because Places API (New) is blocked or disabled for the current Google key.`),
          fields: missingFields.length ? missingFields : [bi("الهاتف", "phone"), bi("التقييمات", "ratings")],
          meta: [
            res.fallbackReason ? `[${res.fallbackReason}]` : null,
            typeof res.upstreamStatus === "number" ? `HTTP ${res.upstreamStatus}` : null,
            typeof res.upstreamMs === "number" ? `${res.upstreamMs}ms` : null,
            res.requestId ? `req=${res.requestId.slice(0, 8)}` : null,
          ].filter((item): item is string => typeof item === "string" && item.length > 0),
        });
      } else {
        setSearchFallbackNotice(null);
      }
    },
    onError: () => {
      setSearchFallbackNotice(null);
      setErrorMsg(bi("حدث خطأ في البحث.", "Search failed."));
    },
  });

  const clearCacheMut = useMutation({
    mutationFn: () => clearEnrichmentCache("all"),
    onSuccess: (res) => {
      if (res.error) {
        setClearMsg(bi("تعذر مسح الكاش.", "Could not clear cache."));
        return;
      }
      setSearchCached(false);
      setClearMsg(bi(`تم مسح ${res.deleted ?? 0} عنصر من الكاش.`, `Cleared ${res.deleted ?? 0} cached items.`));
      window.setTimeout(() => setClearMsg(null), 3500);
    },
    onError: () => setClearMsg(bi("تعذر مسح الكاش.", "Could not clear cache.")),
  });

  const enhanceMut = useMutation({
    mutationFn: () => {
      if (!draft) return Promise.resolve<EnrichmentEnhanceResult>({ ok: false });
      return enhanceEnrichment({
        name_ar: approved.name_ar ?? draft.name_ar.value,
        name_en: approved.name_en ?? draft.name_en.value,
        description_ar: approved.description_ar ?? draft.description_ar.value,
        description_en: approved.description_en ?? draft.description_en.value,
        district: approved.district ?? draft.district.value,
        street: approved.street ?? draft.street.value,
        city: approved.city ?? draft.city.value,
        activity: approved.activity ?? draft.activity.value,
      });
    },
    onSuccess: (res) => {
      const ai = res.ai_enhanced ?? {};
      const { category_slug, services_ar, services_en, ...fieldOnly } = ai as Record<string, string>;
      setAiEnhanced(fieldOnly as Partial<Record<EnrichmentFieldKey, string>>);
      if (category_slug) setCategorySlug(category_slug);
      if (services_ar) setServicesAr(services_ar);
      if (services_en) setServicesEn(services_en);
    },
  });

  const applyMut = useMutation({
    mutationFn: () => {
      if (!sessionId) return Promise.resolve({ error: "no_session" });
      const cleanApproved: Record<string, string> = {};
      for (const [k, v] of Object.entries(approved)) {
        if (v && v.trim()) cleanApproved[k] = v.trim();
      }
      return applyEnrichment({
        action: "approve",
        session_id: sessionId,
        mode,
        business_id: mode === "business" ? businessId.trim() : undefined,
        approved: cleanApproved,
        extra: buildExtra(),
      });
    },
    onSuccess: (res) => {
      if (res.error || !res.ok) {
        setErrorMsg(bi("تعذر اعتماد البيانات.", "Could not apply data."));
        return;
      }
      setErrorMsg(null);
      setApplyResult({ entity: res.applied_entity_type ?? undefined, id: res.applied_entity_id ?? undefined });
      setDraftStatus("applied");
      qc.invalidateQueries({ queryKey: ["admin-enrichment-drafts"] });
    },
  });

  const conflictKeys = useMemo(() => Object.keys(conflicts ?? {}), [conflicts]);

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    for (const r of searchResults) if (r.primary_type) set.add(r.primary_type);
    return Array.from(set).sort();
  }, [searchResults]);

  const displayResults = useMemo(() => {
    let list = [...searchResults];
    if (minRating > 0) list = list.filter((r) => (r.rating ?? 0) >= minRating);
    if (minReviews > 0) list = list.filter((r) => (r.user_rating_count ?? 0) >= minReviews);
    if (typeFilter !== "all") list = list.filter((r) => r.primary_type === typeFilter);
    if (sortBy === "rating_desc") list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    else if (sortBy === "reviews_desc") list.sort((a, b) => (b.user_rating_count ?? -1) - (a.user_rating_count ?? -1));
    else if (sortBy === "name_asc") list.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" }));
    return list;
  }, [searchResults, minRating, minReviews, typeFilter, sortBy]);

  const handleSelectPlace = (p: PlaceCandidate) => {
    setSelectedPlace(p);
    if (p.maps_url) setMapsUrl(p.maps_url);
    if (p.website) setWebsite(p.website);
    setStep("sources");
  };

  const buildExportRows = () => {
    if (!draft) return [];
    return FIELD_KEYS.map((key) => {
      const f = draft[key];
      return {
        Field: bi(FIELD_LABELS[key].ar, FIELD_LABELS[key].en),
        Website: f.source === "website" ? f.value ?? "" : "",
        "Google Maps": f.source === "google_maps" ? f.value ?? "" : "",
        AI: aiEnhanced[key] ?? "",
        Approved: approved[key] ?? "",
        Source: f.source,
        Confidence: f.confidence,
      };
    });
  };

  const exportCsv = () => {
    const rows = buildExportRows();
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => `"${String((r as Record<string, string>)[h] ?? "").replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enrichment-${sessionId ?? Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportXlsx = () => {
    const rows = buildExportRows();
    if (!rows.length) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comparison");
    XLSX.writeFile(wb, `enrichment-${sessionId ?? Date.now()}.xlsx`);
  };

  const staticMapUrl = (lat: number, lng: number) =>
    mapsService.getStaticMapUrl({ lat, lng });

  return (
    <DashboardLayout>
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">
          <Bi ar="إثراء بيانات المنشآت" en="Data Enrichment" />
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <Bi
            ar="اجلب بيانات منشأة من الموقع الإلكتروني وGoogle Maps، راجعها، ثم اعتمدها يدويًا. لا يتم الحفظ أو النشر تلقائيًا."
            en="Pull business data from a website and Google Maps, review, then approve manually. No auto-save, no auto-publish."
          />
        </p>
      </header>

      {/* Stepper */}
      <ol className="mb-6 flex items-center gap-2 text-xs">
        {(["search", "sources", "review", "apply"] as Step[]).map((s, i) => {
          const active = step === s;
          const idx = ["search", "sources", "review", "apply"].indexOf(step);
          const done = i < idx;
          const label = s === "search"
            ? bi("بحث", "Search")
            : s === "sources"
            ? bi("المصادر", "Sources")
            : s === "review"
            ? bi("المراجعة", "Review")
            : bi("الاعتماد", "Apply");
          return (
            <li key={s} className="flex items-center gap-2">
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${
                active ? "bg-primary text-primary-foreground border-primary" : done ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-muted text-muted-foreground"
              }`}>{done ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
              <span className={active ? "font-medium" : "text-muted-foreground"}>{label}</span>
              {i < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            </li>
          );
        })}
      </ol>

      <GoogleStatusPanel />

      <IntakeWizardGuide />

      <PilotContactTemplateCard className="mb-5" testId="enrichment-pilot-contact-template" />

      {errorMsg && (
        <Card className="mb-4 border-rose-200 bg-rose-50/60 p-3 text-sm text-rose-700">
          <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{errorMsg}</div>
        </Card>
      )}

      {/* Step 0: Google-like Search */}
      {step === "search" && (
      <>
        {/* Saved drafts panel — editable until approved */}
        {(() => {
          const drafts = draftsQuery.data?.drafts ?? [];
          if (drafts.length === 0) return null;
          return (
            <Card className="mb-4 p-4">
              <div className="mb-3 flex items-center gap-2">
                <FileEdit className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">
                  <Bi ar="مسودات محفوظة" en="Saved drafts" />
                </h2>
                <Badge variant="outline" className="h-5 text-[10px]">{drafts.length}</Badge>
                <span className="ms-auto text-[11px] text-muted-foreground">
                  <Bi
                    ar="قابلة للتعديل — لم يُنشأ حساب أو رقم تعريفي حتى الاعتماد"
                    en="Editable — no account or Ref ID is created until approval"
                  />
                </span>
              </div>
              <ul className="divide-y">
                {drafts.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium" dir="auto">
                        {d.name ?? bi("بدون اسم", "Untitled")}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground" dir="auto">
                        {d.city ?? "—"}{d.activity ? ` · ${d.activity}` : ""}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`h-5 text-[10px] ${
                        d.status === "applied"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {d.status === "applied"
                        ? bi("معتمدة", "Approved")
                        : bi("مسودة", "Draft")}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7"
                      onClick={() => loadDraftMut.mutate(d.id)}
                      disabled={loadDraftMut.isPending}
                    >
                      <FileEdit className="me-1 h-3 w-3" />
                      <Bi ar="فتح وتعديل" en="Open & edit" />
                    </Button>
                    {d.status !== "applied" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => deleteDraftMut.mutate(d.id)}
                        disabled={deleteDraftMut.isPending}
                        title={bi("حذف المسودة", "Delete draft")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })()}
        <Card className="p-5">
          <div className="space-y-3">
            <Label className="text-sm">
              <Search className="me-1 inline h-3.5 w-3.5" />
              <Bi ar="ابحث عن المنشأة في خرائط Google" en="Search for the business on Google Maps" />
            </Label>
            <div className="flex gap-2">
              <Input
                dir="auto"
                placeholder={bi("مثل: مصنع الزجاج العالمي الرياض", "e.g. Acme Glass Factory Riyadh")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && searchQuery.trim().length >= 2) searchMut.mutate({}); }}
                className="h-12 flex-1"
                maxLength={200}
              />
              <Button
                onClick={() => searchMut.mutate({})}
                disabled={searchMut.isPending || searchQuery.trim().length < 2}
                className="h-12"
              >
                {searchMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ms-2"><Bi ar="بحث" en="Search" /></span>
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              <Bi
                ar="نتائج البحث تأتي من Google Places مع الترتيب الأقرب للمدخل (الاسم/العنوان/المدينة)."
                en="Results come from Google Places, ranked by best match to your query (name/address/city)."
              />
            </p>

            {searchDeferred && (
              <Card className="border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <Bi
                    ar="مفتاح Google Maps غير مفعل حاليًا — يمكنك إدخال الروابط يدويًا في الخطوة التالية."
                    en="Google Maps API key is not configured — you can enter URLs manually in the next step."
                  />
                  <Button size="sm" variant="ghost" className="ms-auto h-7" onClick={() => setStep("sources")}>
                    <Bi ar="إدخال يدوي" en="Manual entry" />
                  </Button>
                </div>
              </Card>
            )}

            {searchFallbackNotice && (
              <Card className="border-border bg-muted/40 p-3 text-xs text-foreground">
                <div className="flex flex-wrap items-start gap-2">
                  <Wrench className="mt-0.5 h-3.5 w-3.5 text-primary" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="font-medium">{searchFallbackNotice.title}</div>
                    <p className="text-muted-foreground">{searchFallbackNotice.message}</p>
                    <p className="text-muted-foreground">
                      <Bi ar="الحقول التي قد تكون مفقودة" en="Fields that may be missing" />: {searchFallbackNotice.fields.join("، ")}
                    </p>
                  </div>
                  {searchFallbackNotice.meta.length > 0 && (
                    <span className="tech-content text-[10px] text-muted-foreground">
                      {searchFallbackNotice.meta.join(" · ")}
                    </span>
                  )}
                </div>
              </Card>
            )}

            {searchResults.length > 0 && (
              <div className="mt-2 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <Bi ar={`${displayResults.length} من ${searchResults.length} نتيجة`} en={`${displayResults.length} of ${searchResults.length} results`} />
                  {searchCached && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
                      <Zap className="h-3 w-3" />
                      <Bi ar="من الكاش" en="Cached" />
                    </span>
                  )}
                  <div className="ms-auto flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px]"
                      onClick={() => setShowFilters((s) => !s)}
                    >
                      <SlidersHorizontal className="me-1 h-3 w-3" />
                      <Bi ar="تصفية وفرز" en="Filter & sort" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px]"
                      onClick={() => { setBypassCacheFlag(true); searchMut.mutate({ bypass: true }); }}
                      disabled={searchMut.isPending || searchQuery.trim().length < 2}
                      title={bi("إعادة الجلب من Google مباشرة", "Re-fetch directly from Google")}
                    >
                      <RefreshCw className={`me-1 h-3 w-3 ${searchMut.isPending ? "animate-spin" : ""}`} />
                      <Bi ar="إعادة جلب" en="Re-fetch" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px] text-rose-600 hover:text-rose-700"
                      onClick={() => clearCacheMut.mutate()}
                      disabled={clearCacheMut.isPending}
                    >
                      {clearCacheMut.isPending ? <Loader2 className="me-1 h-3 w-3 animate-spin" /> : <Trash2 className="me-1 h-3 w-3" />}
                      <Bi ar="مسح الكاش" en="Clear cache" />
                    </Button>
                  </div>
                </div>
                {clearMsg && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">
                    {clearMsg}
                  </div>
                )}
                {showFilters && (
                  <Card className="grid grid-cols-1 gap-3 border-dashed bg-muted/30 p-3 sm:grid-cols-4">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground"><Bi ar="أدنى تقييم" en="Min rating" /></Label>
                      <Select value={String(minRating)} onValueChange={(v) => setMinRating(Number(v))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0"><Bi ar="الكل" en="Any" /></SelectItem>
                          <SelectItem value="3">≥ 3.0</SelectItem>
                          <SelectItem value="3.5">≥ 3.5</SelectItem>
                          <SelectItem value="4">≥ 4.0</SelectItem>
                          <SelectItem value="4.5">≥ 4.5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground"><Bi ar="ثقة (عدد التقييمات)" en="Confidence (reviews)" /></Label>
                      <Select value={String(minReviews)} onValueChange={(v) => setMinReviews(Number(v))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0"><Bi ar="الكل" en="Any" /></SelectItem>
                          <SelectItem value="5">≥ 5</SelectItem>
                          <SelectItem value="20">≥ 20</SelectItem>
                          <SelectItem value="50">≥ 50</SelectItem>
                          <SelectItem value="100">≥ 100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground"><Bi ar="نوع الجهة" en="Place type" /></Label>
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all"><Bi ar="الكل" en="All" /></SelectItem>
                          {availableTypes.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground"><Bi ar="فرز" en="Sort by" /></Label>
                      <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="relevance"><Bi ar="الأكثر صلة" en="Relevance" /></SelectItem>
                          <SelectItem value="rating_desc"><Bi ar="الأعلى تقييمًا" en="Highest rating" /></SelectItem>
                          <SelectItem value="reviews_desc"><Bi ar="الأكثر تقييمات" en="Most reviews" /></SelectItem>
                          <SelectItem value="name_asc"><Bi ar="الاسم (أ-ي)" en="Name (A–Z)" /></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </Card>
                )}
                <ul className="space-y-2">
                  {displayResults.map((p) => {
                    const isSelected = selectedPlace?.place_id === p.place_id;
                    return (
                      <li key={p.place_id}>
                        <button
                          type="button"
                          onClick={() => handleSelectPlace(p)}
                          className={`group flex w-full items-start gap-3 rounded-xl border p-3 text-start transition hover:border-primary/40 hover:bg-muted/30 ${
                            isSelected ? "border-primary bg-primary/5" : "border-border"
                          }`}
                        >
                          {p.latitude != null && p.longitude != null && staticMapUrl(p.latitude, p.longitude) ? (
                            <img
                              src={staticMapUrl(p.latitude, p.longitude)!}
                              alt=""
                              loading="lazy"
                              className="h-16 w-24 shrink-0 rounded-lg border object-cover"
                            />
                          ) : (
                            <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                              <Building2 className="h-5 w-5" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium">{p.name ?? p.place_id}</span>
                              {p.business_status && p.business_status !== "OPERATIONAL" && (
                                <Badge variant="outline" className="h-5 text-[10px]">{p.business_status}</Badge>
                              )}
                              {p.primary_type && (
                                <Badge variant="secondary" className="h-5 text-[10px]">{p.primary_type}</Badge>
                              )}
                            </div>
                            {p.address && (
                              <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
                                <MapPin className="me-1 inline h-3 w-3" />
                                <span dir="auto">{p.address}</span>
                              </div>
                            )}
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground tech-content">
                              {p.rating != null && (
                                <span className="inline-flex items-center gap-1">
                                  <Star className="h-3 w-3 text-amber-500" />
                                  {p.rating.toFixed(1)}
                                  {p.user_rating_count != null && <span>({p.user_rating_count})</span>}
                                </span>
                              )}
                              {p.phone && <span>{p.phone}</span>}
                              {p.website && <span className="truncate max-w-[180px]">{p.website}</span>}
                              {p.maps_url && (
                                <a
                                  href={p.maps_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-0.5 text-primary hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  <Bi ar="فتح في Google Maps" en="Open in Google Maps" />
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 self-center text-xs text-primary opacity-0 transition group-hover:opacity-100">
                            <Bi ar="اختيار" en="Select" />
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {nextPageToken && (
                  <div className="flex justify-center pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => searchMut.mutate({ append: true })}
                      disabled={searchMut.isPending}
                    >
                      {searchMut.isPending ? <Loader2 className="me-2 h-3.5 w-3.5 animate-spin" /> : null}
                      <Bi ar="تحميل المزيد" en="Load more" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep("sources")}>
                <Bi ar="تخطي والإدخال يدويًا" en="Skip & enter manually" />
              </Button>
            </div>
          </div>
        </Card>
      </>
      )}

      {/* Step 1: Sources */}
      {step === "sources" && (
        <Card className="p-5">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">
                <LinkIcon className="me-1 inline h-3.5 w-3.5" />
                <Bi ar="رابط الموقع الإلكتروني" en="Website URL" />
              </Label>
              <Input
                dir="ltr"
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="tech-content h-12"
                maxLength={500}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">
                <MapPin className="me-1 inline h-3.5 w-3.5" />
                <Bi ar="رابط Google Maps" en="Google Maps URL" />
              </Label>
              <Input
                dir="ltr"
                placeholder="https://maps.google.com/?q=..."
                value={mapsUrl}
                onChange={(e) => setMapsUrl(e.target.value)}
                className="tech-content h-12"
                maxLength={500}
              />
              <p className="text-[11px] text-muted-foreground">
                <Bi ar="يمكن إدخال مصدر واحد أو الاثنين للمقارنة." en="Use one source or both for comparison." />
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("search")} className="h-11">
                <Bi ar="رجوع للبحث" en="Back to search" />
              </Button>
              <Button
                onClick={() => fetchMut.mutate({})}
                disabled={fetchMut.isPending || (!website.trim() && !mapsUrl.trim())}
                className="h-11"
              >
                {fetchMut.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                <Bi ar="جلب البيانات" en="Fetch data" />
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fetchMut.mutate({ bypass: true })}
                disabled={fetchMut.isPending || (!website.trim() && !mapsUrl.trim())}
                className="h-11"
                title={bi("تجاوز الكاش وإعادة الجلب", "Bypass cache and re-fetch")}
              >
                <RefreshCw className="me-2 h-4 w-4" />
                <Bi ar="إعادة جلب" en="Re-fetch" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Review */}
      {step === "review" && draft && (
        <div className="space-y-4">
          {selectedPlace && (
            <Card className="p-3">
              <div className="flex items-center gap-3">
                {selectedPlace.latitude != null && selectedPlace.longitude != null && staticMapUrl(selectedPlace.latitude, selectedPlace.longitude) ? (
                  <img
                    src={staticMapUrl(selectedPlace.latitude, selectedPlace.longitude)!}
                    alt=""
                    loading="lazy"
                    className="h-16 w-24 shrink-0 rounded-lg border object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Building2 className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{selectedPlace.name ?? selectedPlace.place_id}</div>
                  {selectedPlace.address && (
                    <div className="truncate text-[12px] text-muted-foreground" dir="auto">
                      <MapPin className="me-1 inline h-3 w-3" />
                      {selectedPlace.address}
                    </div>
                  )}
                </div>
                {selectedPlace.maps_url && (
                  <a
                    href={selectedPlace.maps_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1 text-xs text-primary hover:bg-primary/5"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <Bi ar="Google Maps" en="Google Maps" />
                  </a>
                )}
              </div>
            </Card>
          )}

          {missing.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/60 p-3 text-sm text-amber-800">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <Bi
                    ar="بعض المصادر غير مفعّلة حاليًا — سيُعرض ما توفّر فقط."
                    en="Some sources are deferred — only available data is shown."
                  />
                </div>
                <Badge variant="outline" className="text-[10px]">Deferred</Badge>
              </div>
            </Card>
          )}

          {conflictKeys.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/40 p-3 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div>
                  <div className="font-medium">
                    <Bi ar="تعارض بين المصادر" en="Source conflict" />
                  </div>
                  <div className="mt-1 text-xs">
                    <Bi ar="حقول بها قيم مختلفة بين الموقع وGoogle Maps:" en="Fields with differing values between Website and Google Maps:" />{" "}
                    {conflictKeys.join(", ")}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Missing address fields alert + targeted re-fetch */}
          {(() => {
            const missingDistrict = !approved.district?.trim();
            const missingStreet = !approved.street?.trim();
            if (!missingDistrict && !missingStreet) return null;
            const labels: string[] = [];
            if (missingDistrict) labels.push(bi("الحي", "District"));
            if (missingStreet) labels.push(bi("الشارع", "Street"));
            return (
              <Card className="border-rose-200 bg-rose-50/60 p-3 text-sm text-rose-800">
                <div className="flex flex-wrap items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    <Bi
                      ar={`حقول أساسية فارغة: ${labels.join("، ")}. جرّب إعادة الجلب من Google لإكمالها.`}
                      en={`Missing key fields: ${labels.join(", ")}. Try re-fetching from Google to fill them.`}
                    />
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="ms-auto h-8"
                    onClick={() => fetchMut.mutate({ bypass: true })}
                    disabled={fetchMut.isPending}
                  >
                    {fetchMut.isPending ? <Loader2 className="me-1.5 h-3 w-3 animate-spin" /> : <RefreshCw className="me-1.5 h-3 w-3" />}
                    <Bi ar="إعادة جلب العنوان" en="Re-fetch address" />
                  </Button>
                </div>
              </Card>
            );
          })()}

          {/* DB matches: snap city / district / region to canonical reference rows */}
          {dbMatches && (dbMatches.city || dbMatches.district || dbMatches.region) && (
            <Card className="border-emerald-200 bg-emerald-50/40 p-3 text-sm">
              <div className="mb-2 flex items-center gap-2 text-emerald-800">
                <Database className="h-4 w-4" />
                <span className="font-medium">
                  <Bi ar="مطابقة مع قاعدة البيانات" en="Matched with database" />
                </span>
                <Badge variant="outline" className="ms-auto h-5 border-emerald-300 bg-white text-[10px] text-emerald-700">
                  <Bi ar="لتجنّب التكرار" en="prevents duplicates" />
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                {dbMatches.region && (
                  <div className="rounded-md border border-emerald-200 bg-white p-2">
                    <div className="text-[10px] text-muted-foreground"><Bi ar="المنطقة" en="Region" /></div>
                    <div className="font-medium" dir="auto">{bi(dbMatches.region.name_ar ?? "—", dbMatches.region.name_en ?? "—")}</div>
                  </div>
                )}
                {dbMatches.city && (
                  <div className="rounded-md border border-emerald-200 bg-white p-2">
                    <div className="text-[10px] text-muted-foreground"><Bi ar="المدينة" en="City" /></div>
                    <div className="font-medium" dir="auto">{bi(dbMatches.city.name_ar, dbMatches.city.name_en)}</div>
                    <button
                      type="button"
                      className="mt-0.5 text-[10px] text-primary hover:underline"
                      onClick={() => setApproved((p) => ({ ...p, city: bi(dbMatches.city!.name_ar, dbMatches.city!.name_en) }))}
                    >
                      <Bi ar="اعتماد القيمة الرسمية" en="Use canonical value" />
                    </button>
                  </div>
                )}
                {dbMatches.district && (
                  <div className="rounded-md border border-emerald-200 bg-white p-2">
                    <div className="text-[10px] text-muted-foreground"><Bi ar="الحي" en="District" /></div>
                    <div className="font-medium" dir="auto">{bi(dbMatches.district.name_ar, dbMatches.district.name_en ?? dbMatches.district.name_ar)}</div>
                    <button
                      type="button"
                      className="mt-0.5 text-[10px] text-primary hover:underline"
                      onClick={() => setApproved((p) => ({ ...p, district: bi(dbMatches.district!.name_ar, dbMatches.district!.name_en ?? dbMatches.district!.name_ar) }))}
                    >
                      <Bi ar="اعتماد القيمة الرسمية" en="Use canonical value" />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Category + Services (AI enhanced) */}
          <Card className="p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Wrench className="h-4 w-4 text-primary" />
              <Bi ar="التصنيف والخدمات" en="Category & services" />
              {categorySlug && (
                <Badge variant="outline" className="h-5 border-primary/30 text-[10px] text-primary">
                  <Sparkles className="me-1 h-3 w-3" />AI
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground"><Bi ar="التصنيف الرئيسي" en="Primary category" /></Label>
                <Select value={categorySlug || "none"} onValueChange={(v) => setCategorySlug(v === "none" ? "" : v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={bi("اختر تصنيفًا", "Pick a category")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none"><Bi ar="— غير محدد —" en="— none —" /></SelectItem>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>{bi(c.name_ar, c.name_en)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground"><Bi ar="الخدمات (عربي)" en="Services (Arabic)" /></Label>
                <Textarea dir="rtl" value={servicesAr} onChange={(e) => setServicesAr(e.target.value)} className="min-h-[60px] text-[12px]" placeholder={bi("افصل بفواصل…", "Comma-separated…")} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[11px] text-muted-foreground"><Bi ar="الخدمات (إنجليزي)" en="Services (English)" /></Label>
                <Textarea dir="ltr" value={servicesEn} onChange={(e) => setServicesEn(e.target.value)} className="min-h-[60px] text-[12px] tech-content" placeholder="Comma-separated…" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              <Bi
                ar="يُكتشف التصنيف وقائمة الخدمات تلقائيًا عند الضغط على «تحسين بالذكاء». التصنيف يأتي من قائمة قاعدة البيانات لتجنّب التكرار."
                en="Category and services list are auto-detected when you click 'AI enhance'. Category is restricted to the existing database list to avoid duplicates."
              />
            </p>
          </Card>

          {/* Admin diagnostic mode */}
          {diagnostics && (
            <Card className="p-3">
              <button
                type="button"
                onClick={() => setShowDiagnostics((s) => !s)}
                className="flex w-full items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <Bug className="h-3.5 w-3.5" />
                <Bi ar="وضع التشخيص للمشرف" en="Admin diagnostic mode" />
                <span className="ms-auto text-[10px]">
                  {showDiagnostics ? bi("إخفاء", "Hide") : bi("عرض", "Show")}
                </span>
              </button>
              {showDiagnostics && (
                <div className="mt-3 space-y-3 text-[11px]">
                  <div>
                    <div className="mb-1 text-muted-foreground"><Bi ar="معرّف Place المستخدم" en="Place ID used" /></div>
                    <code className="tech-content block rounded border bg-muted/30 px-2 py-1">{diagnostics.place_id ?? "—"}</code>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                      <Bi ar="مكوّنات العنوان من Places" en="Places addressComponents" />
                      <Badge variant="outline" className="h-4 text-[10px]">{diagnostics.addressComponents.length}</Badge>
                    </div>
                    <pre dir="ltr" className="max-h-48 overflow-auto rounded border bg-muted/30 p-2 text-[10px]">
                      {JSON.stringify(diagnostics.addressComponents, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                      <Bi ar="Geocoding fallback" en="Geocoding fallback" />
                      <Badge variant={diagnostics.geocoding_used ? "default" : "outline"} className="h-4 text-[10px]">
                        {diagnostics.geocoding_used ? bi("استُخدم", "Used") : bi("غير مستخدم", "Not used")}
                      </Badge>
                    </div>
                    {diagnostics.geocoding_used && (
                      <pre dir="ltr" className="max-h-48 overflow-auto rounded border bg-muted/30 p-2 text-[10px]">
                        {JSON.stringify(diagnostics.geocoding_components, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                <Bi ar="جدول المقارنة قبل/بعد" en="Comparison: before / after" />
              </h2>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={exportCsv}>
                  <Download className="me-1.5 h-3.5 w-3.5" />
                  CSV
                </Button>
                <Button size="sm" variant="outline" onClick={exportXlsx}>
                  <FileSpreadsheet className="me-1.5 h-3.5 w-3.5" />
                  Excel
                </Button>
                <Button size="sm" variant="outline" onClick={() => enhanceMut.mutate()} disabled={enhanceMut.isPending}>
                  {enhanceMut.isPending ? <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="me-1.5 h-3.5 w-3.5" />}
                  <Bi ar="تحسين بالذكاء" en="AI enhance" />
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 text-start font-medium"><Bi ar="الحقل" en="Field" /></th>
                    <th className="py-2 text-start font-medium"><Bi ar="الموقع" en="Website" /></th>
                    <th className="py-2 text-start font-medium"><Bi ar="Google Maps" en="Google Maps" /></th>
                    <th className="py-2 text-start font-medium"><Bi ar="AI" en="AI" /></th>
                    <th className="py-2 text-start font-medium"><Bi ar="القيمة المعتمدة" en="Approved value" /></th>
                  </tr>
                </thead>
                <tbody>
                  {FIELD_KEYS.map((key) => {
                    const field = draft[key];
                    const wSrc = field.source === "website" ? field.value : null;
                    const mSrc = field.source === "google_maps" ? field.value : null;
                    const aiVal = aiEnhanced[key] ?? "";
                    const isConflict = key in (conflicts ?? {});
                    return (
                      <tr key={key} className={`border-b align-top ${isConflict ? "bg-amber-50/30" : ""}`}>
                        <td className="py-2 pe-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-[12px] font-medium">{bi(FIELD_LABELS[key].ar, FIELD_LABELS[key].en)}</span>
                            <div className="flex items-center gap-1">
                              <SourceChip src={field.source} />
                              <ConfidenceBadge level={field.confidence} />
                            </div>
                          </div>
                        </td>
                        <td className="py-2 pe-2 text-xs text-muted-foreground tech-content max-w-[160px] truncate">{wSrc ?? "—"}</td>
                        <td className="py-2 pe-2 text-xs text-muted-foreground tech-content max-w-[160px] truncate">{mSrc ?? "—"}</td>
                        <td className="py-2 pe-2">
                          {aiVal ? (
                            <button
                              type="button"
                              className="text-start text-xs text-primary underline-offset-2 hover:underline"
                              onClick={() => setApproved((p) => ({ ...p, [key]: aiVal }))}
                            >
                              {aiVal}
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2">
                          {key === "description_ar" || key === "description_en" || key === "working_hours" ? (
                            <Textarea
                              dir="auto"
                              value={approved[key] ?? ""}
                              onChange={(e) => setApproved((p) => ({ ...p, [key]: e.target.value }))}
                              className="min-h-[60px] text-[12px]"
                            />
                          ) : (
                            <Input
                              dir="auto"
                              value={approved[key] ?? ""}
                              onChange={(e) => setApproved((p) => ({ ...p, [key]: e.target.value }))}
                              className="h-9 text-[12px]"
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep("sources")}>
                <Bi ar="رجوع" en="Back" />
              </Button>
              <Button onClick={() => setStep("apply")}>
                <Bi ar="متابعة للاعتماد" en="Continue to apply" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Step 3: Apply */}
      {step === "apply" && (
        <Card className="p-5">
          {savedMsg && !applyResult && (
            <Card className="mb-4 border-emerald-200 bg-emerald-50/60 p-3 text-sm text-emerald-800">
              <div className="flex items-start gap-2">
                <Save className="mt-0.5 h-4 w-4" />
                <span>{savedMsg}</span>
              </div>
            </Card>
          )}
          {applyResult ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <Check className="h-4 w-4" />
                <span className="text-sm font-medium">
                  <Bi ar="تم اعتماد الجهة بنجاح — تم إنشاء الحساب والرقم التعريفي" en="Approved as verified — account and Ref ID created" />
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                <Bi ar="النوع" en="Type" />: <span className="tech-content">{applyResult.entity}</span>
                {" — "}
                <Bi ar="المعرف" en="ID" />: <span className="tech-content">{applyResult.id}</span>
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setApplyResult(null);
                  setStep("search");
                  setSessionId(null);
                  setDraft(null);
                  setApproved({});
                  setAiEnhanced({});
                  setWebsite("");
                  setMapsUrl("");
                  setDraftStatus("unsaved");
                }}
              >
                <Bi ar="جلسة جديدة" en="New session" />
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Card className="border-sky-200 bg-sky-50/60 p-3 text-[12px] text-sky-900">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4" />
                  <div>
                    <div className="font-medium">
                      <Bi
                        ar="مرحلتان: حفظ كمسودة قابلة للتعديل، ثم اعتماد كجهة موثّقة"
                        en="Two stages: save as an editable draft, then approve as a verified entity"
                      />
                    </div>
                    <ul className="mt-1 list-disc space-y-0.5 ps-4 text-[11px]">
                      <li>
                        <Bi
                          ar="«حفظ كمسودة»: تُخزَّن البيانات في قاعدة البيانات للتعديل والتحسين لاحقًا. لا يتم فتح حساب ولا إنشاء رقم تعريفي."
                          en="“Save as draft”: data is stored in the database for later editing. No account is opened and no Ref ID is issued."
                        />
                      </li>
                      <li>
                        <Bi
                          ar="«اعتماد كجهة موثّقة»: يتم إنشاء سجل المزوّد ورقمه التعريفي رسميًا."
                          en="“Approve as verified”: officially creates the provider record and its Ref ID."
                        />
                      </li>
                    </ul>
                  </div>
                </div>
              </Card>

              <div>
                <Label className="text-sm">
                  <Bi ar="وجهة الاعتماد (للمرحلة الثانية فقط)" en="Approval destination (second stage only)" />
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={mode === "lead" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMode("lead")}
                  >
                    <Bi ar="إنشاء Lead مزود جديد" en="Create new provider lead" />
                  </Button>
                  <Button
                    type="button"
                    variant={mode === "business" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMode("business")}
                  >
                    <Bi ar="ربط بمنشأة موجودة" en="Link to existing business" />
                  </Button>
                </div>
              </div>

              {mode === "business" && (
                <div className="space-y-1.5">
                  <Label className="text-sm">
                    <Bi ar="معرف المنشأة (UUID)" en="Business ID (UUID)" />
                  </Label>
                  <Input
                    dir="ltr"
                    value={businessId}
                    onChange={(e) => setBusinessId(e.target.value)}
                    placeholder="00000000-0000-0000-0000-000000000000"
                    className="tech-content h-11"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    <Bi
                      ar="سيتم تحديث الحقول الموافق عليها فقط (الوصف/الهاتف/الموقع/العنوان). لن يتم تغيير حالة النشر."
                      en="Only approved fields (description/phone/website/address) are updated. Publish state is never changed."
                    />
                  </p>
                </div>
              )}

              <Card className="bg-muted/40 p-3">
                <div className="mb-1.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <Bi ar="ملخص الحقول" en="Fields summary" />
                  {draftStatus === "saved" && (
                    <Badge variant="outline" className="h-4 border-amber-200 bg-amber-50 text-[10px] text-amber-700">
                      <Bi ar="مسودة محفوظة" en="Draft saved" />
                    </Badge>
                  )}
                </div>
                <ul className="space-y-0.5 text-xs">
                  {Object.entries(approved)
                    .filter(([, v]) => v && v.trim())
                    .map(([k, v]) => (
                      <li key={k} className="flex items-start gap-2">
                        <span className="text-muted-foreground">{bi(FIELD_LABELS[k as EnrichmentFieldKey].ar, FIELD_LABELS[k as EnrichmentFieldKey].en)}:</span>
                        <span className="tech-content truncate">{v}</span>
                      </li>
                    ))}
                </ul>
              </Card>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button variant="ghost" size="sm" onClick={() => setStep("review")}>
                  <Bi ar="رجوع للمراجعة" en="Back to review" />
                </Button>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => saveDraftMut.mutate()}
                    disabled={
                      saveDraftMut.isPending ||
                      Object.values(approved).filter((v) => v && v.trim()).length === 0
                    }
                    title={bi("حفظ كمسودة بدون فتح حساب أو رقم تعريفي", "Save as a draft without creating an account or Ref ID")}
                  >
                    {saveDraftMut.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
                    <Bi ar="حفظ كمسودة" en="Save as draft" />
                  </Button>
                  <Button
                    onClick={() => applyMut.mutate()}
                    disabled={
                      applyMut.isPending ||
                      (mode === "business" && !businessId.trim()) ||
                      Object.values(approved).filter((v) => v && v.trim()).length === 0
                    }
                    title={bi("سيتم فتح حساب وإنشاء رقم تعريفي رسمي", "An account and official Ref ID will be created")}
                  >
                    {applyMut.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="me-2 h-4 w-4" />}
                    <Bi ar="اعتماد كجهة موثّقة" en="Approve as verified" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
    </DashboardLayout>
  );
}