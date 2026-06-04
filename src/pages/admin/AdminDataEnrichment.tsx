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
import { useMutation } from "@tanstack/react-query";
import { Link as LinkIcon, MapPin, Sparkles, ShieldCheck, AlertTriangle, ArrowRight, Loader2, Check, Search, Star, Building2, ExternalLink, Download, FileSpreadsheet, Zap, RefreshCw, Trash2, SlidersHorizontal } from "lucide-react";
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
import {
  fetchEnrichment,
  enhanceEnrichment,
  applyEnrichment,
  searchPlaces,
  clearEnrichmentCache,
  type PlaceCandidate,
  type EnrichmentDraft,
  type EnrichmentFieldKey,
  type EnrichmentFetchResult,
  type EnrichmentEnhanceResult,
} from "@/modules/adminEnrichment";

type Step = "search" | "sources" | "review" | "apply";

const FIELD_LABELS: Record<EnrichmentFieldKey, { ar: string; en: string }> = {
  name_ar: { ar: "الاسم (عربي)", en: "Name (Arabic)" },
  name_en: { ar: "الاسم (إنجليزي)", en: "Name (English)" },
  activity: { ar: "النشاط", en: "Activity" },
  description_ar: { ar: "الوصف (عربي)", en: "Description (Arabic)" },
  description_en: { ar: "الوصف (إنجليزي)", en: "Description (English)" },
  phone: { ar: "الجوال / الهاتف", en: "Phone" },
  website: { ar: "الموقع الإلكتروني", en: "Website" },
  city: { ar: "المدينة", en: "City" },
  district: { ar: "الحي", en: "District" },
  street: { ar: "الشارع", en: "Street" },
  national_address: { ar: "العنوان الوطني", en: "National Address" },
  latitude: { ar: "خط العرض", en: "Latitude" },
  longitude: { ar: "خط الطول", en: "Longitude" },
  working_hours: { ar: "أوقات العمل", en: "Working Hours" },
  logo_url: { ar: "اللوجو", en: "Logo" },
  social_links: { ar: "الروابط الاجتماعية", en: "Social Links" },
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
  const [website, setWebsite] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EnrichmentDraft | null>(null);
  const [conflicts, setConflicts] = useState<EnrichmentFetchResult["conflicts"]>({});
  const [missing, setMissing] = useState<string[]>([]);
  const [aiEnhanced, setAiEnhanced] = useState<Partial<Record<EnrichmentFieldKey, string>>>({});
  const [approved, setApproved] = useState<Partial<Record<EnrichmentFieldKey, string>>>({});
  const [mode, setMode] = useState<"lead" | "business">("lead");
  const [businessId, setBusinessId] = useState("");
  const [applyResult, setApplyResult] = useState<{ entity?: string; id?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchMut = useMutation({
    mutationFn: () => fetchEnrichment({ website: website.trim() || undefined, mapsUrl: mapsUrl.trim() || undefined }),
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
      const initial: Partial<Record<EnrichmentFieldKey, string>> = {};
      for (const k of FIELD_KEYS) {
        const v = res.merged[k]?.value;
        if (v) initial[k] = v;
      }
      setApproved(initial);
      setStep("review");
    },
    onError: () => setErrorMsg(bi("حدث خطأ. حاول مجددًا.", "Something went wrong. Try again.")),
  });

  const searchMut = useMutation({
    mutationFn: () => searchPlaces({ query: searchQuery.trim(), region: "SA", language: "ar" }),
    onSuccess: (res) => {
      if (res.error) {
        setErrorMsg(bi("تعذر البحث في خرائط Google.", "Could not search Google Maps."));
        setSearchResults([]);
        return;
      }
      setErrorMsg(null);
      setSearchDeferred(Boolean(res.deferred));
      setSearchCached(Boolean(res.cached));
      setSearchResults(res.results ?? []);
    },
    onError: () => setErrorMsg(bi("حدث خطأ في البحث.", "Search failed.")),
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
      setAiEnhanced(res.ai_enhanced ?? {});
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
        session_id: sessionId,
        mode,
        business_id: mode === "business" ? businessId.trim() : undefined,
        approved: cleanApproved,
      });
    },
    onSuccess: (res) => {
      if (res.error || !res.ok) {
        setErrorMsg(bi("تعذر اعتماد البيانات.", "Could not apply data."));
        return;
      }
      setErrorMsg(null);
      setApplyResult({ entity: res.applied_entity_type ?? undefined, id: res.applied_entity_id ?? undefined });
    },
  });

  const conflictKeys = useMemo(() => Object.keys(conflicts ?? {}), [conflicts]);

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

  const staticMapUrl = (lat: number, lng: number) => {
    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    if (!key) return null;
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=120x80&scale=2&markers=color:red%7C${lat},${lng}&key=${key}`;
  };

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

      {errorMsg && (
        <Card className="mb-4 border-rose-200 bg-rose-50/60 p-3 text-sm text-rose-700">
          <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{errorMsg}</div>
        </Card>
      )}

      {/* Step 0: Google-like Search */}
      {step === "search" && (
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
                onKeyDown={(e) => { if (e.key === "Enter" && searchQuery.trim().length >= 2) searchMut.mutate(); }}
                className="h-12 flex-1"
                maxLength={200}
              />
              <Button
                onClick={() => searchMut.mutate()}
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

            {searchResults.length > 0 && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Bi ar={`${searchResults.length} نتيجة`} en={`${searchResults.length} results`} />
                  {searchCached && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
                      <Zap className="h-3 w-3" />
                      <Bi ar="من الكاش" en="Cached" />
                    </span>
                  )}
                </div>
                <ul className="space-y-2">
                  {searchResults.map((p) => {
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
              </div>
            )}

            <div className="flex items-center justify-end pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep("sources")}>
                <Bi ar="تخطي والإدخال يدويًا" en="Skip & enter manually" />
              </Button>
            </div>
          </div>
        </Card>
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
                onClick={() => fetchMut.mutate()}
                disabled={fetchMut.isPending || (!website.trim() && !mapsUrl.trim())}
                className="h-11"
              >
                {fetchMut.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                <Bi ar="جلب البيانات" en="Fetch data" />
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
                          {key === "description_ar" || key === "description_en" ? (
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
          {applyResult ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <Check className="h-4 w-4" />
                <span className="text-sm font-medium">
                  <Bi ar="تم الاعتماد بنجاح" en="Applied successfully" />
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
                  setStep("sources");
                  setSessionId(null);
                  setDraft(null);
                  setApproved({});
                  setAiEnhanced({});
                  setWebsite("");
                  setMapsUrl("");
                }}
              >
                <Bi ar="جلسة جديدة" en="New session" />
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-sm">
                  <Bi ar="وجهة الحفظ" en="Destination" />
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
                <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <Bi ar="ملخص الحقول المعتمدة" en="Approved fields summary" />
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

              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setStep("review")}>
                  <Bi ar="رجوع للمراجعة" en="Back to review" />
                </Button>
                <Button
                  onClick={() => applyMut.mutate()}
                  disabled={
                    applyMut.isPending ||
                    (mode === "business" && !businessId.trim()) ||
                    Object.values(approved).filter((v) => v && v.trim()).length === 0
                  }
                >
                  {applyMut.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  <Bi ar="اعتماد وحفظ" en="Approve & save" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
    </DashboardLayout>
  );
}