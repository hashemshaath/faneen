/**
 * SERVICE-CONFIGURATION-GOVERNANCE-AUDIT-1 (Phase 2)
 * Unified Integrations dashboard. Runs every health probe in parallel and
 * renders a categorized status grid with inline expandable details.
 * No keys are ever displayed. No navigation away from this page —
 * all sub-details (Google sub-APIs, GTM info, etc.) render inline.
 */
import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, RefreshCw, Loader2, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, ChevronUp, MapPin, Mail, CreditCard, Sparkles, Globe, BarChart3,
  KeyRound, ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bi, useBi } from "@/components/common/Bilingual";
import { useNoIndex } from "@/hooks/useNoIndex";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";

type Status = "ok" | "fail" | "deferred" | "unknown";
type Category = "maps" | "comms" | "payments" | "ai" | "analytics";

interface ServiceCard {
  id: string;
  name: { ar: string; en: string };
  description: { ar: string; en: string };
  category: Category;
  icon: typeof Activity;
  source: string;
  fn: string | null;          // edge function name; null = client-detected
  hasDetail?: boolean;        // render inline expandable detail panel
}

const SERVICES: ServiceCard[] = [
  {
    id: "google", category: "maps", icon: MapPin,
    name: { ar: "Google Maps Platform", en: "Google Maps Platform" },
    description: { ar: "خرائط، أماكن، مسارات، تحقق العناوين", en: "Maps, Places, Routes, Address Validation" },
    source: "GOOGLE_MAPS_API_KEY · Supabase Secret",
    fn: "google-health", hasDetail: true,
  },
  {
    id: "lovable_ai", category: "ai", icon: Sparkles,
    name: { ar: "Lovable AI Gateway", en: "Lovable AI Gateway" },
    description: { ar: "بوابة موحّدة لنماذج Gemini و GPT", en: "Unified gateway for Gemini & GPT models" },
    source: "LOVABLE_API_KEY · managed",
    fn: "lovable-ai-health",
  },
  {
    id: "resend", category: "comms", icon: Mail,
    name: { ar: "Resend (البريد)", en: "Resend (Email)" },
    description: { ar: "إرسال البريد المعاملاتي والإشعارات", en: "Transactional email & notifications" },
    source: "RESEND_API_KEY · Supabase Secret",
    fn: "resend-health",
  },
  {
    id: "moyasar", category: "payments", icon: CreditCard,
    name: { ar: "Moyasar (المدفوعات)", en: "Moyasar (Payments)" },
    description: { ar: "بوابة الدفع للاشتراكات والعقود", en: "Payment gateway for subs & contracts" },
    source: "MOYASAR_SECRET_KEY · Supabase Secret",
    fn: "moyasar-health",
  },
  {
    id: "firecrawl", category: "ai", icon: Globe,
    name: { ar: "Firecrawl (الإثراء)", en: "Firecrawl (Enrichment)" },
    description: { ar: "إثراء بيانات المنشآت من الويب", en: "Web-based business data enrichment" },
    source: "FIRECRAWL_API_KEY · Supabase Secret",
    fn: "firecrawl-health",
  },
  {
    id: "gtm", category: "analytics", icon: BarChart3,
    name: { ar: "Google Tag Manager", en: "Google Tag Manager" },
    description: { ar: "إدارة وسوم التحليلات والتتبع", en: "Analytics & tracking tag manager" },
    source: "VITE_GTM_ID · build env",
    fn: null, hasDetail: true,
  },
];

const CATEGORIES: Array<{ id: Category; label: { ar: string; en: string }; icon: typeof Activity }> = [
  { id: "maps", label: { ar: "الخرائط والمواقع", en: "Maps & Location" }, icon: MapPin },
  { id: "comms", label: { ar: "الاتصالات", en: "Communications" }, icon: Mail },
  { id: "payments", label: { ar: "المدفوعات", en: "Payments" }, icon: CreditCard },
  { id: "ai", label: { ar: "الذكاء الاصطناعي والإثراء", en: "AI & Enrichment" }, icon: Sparkles },
  { id: "analytics", label: { ar: "التحليلات", en: "Analytics" }, icon: BarChart3 },
];

interface GoogleApiProbe { ok: boolean; latencyMs: number; status: number; errorCode: string | null }

interface ProbeResult {
  service: string;
  ok?: boolean;
  deferred?: boolean;
  latencyMs?: number;
  status?: number;
  errorCode?: string | null;
  missing?: string[];
  checkedAt?: string;
  warnings?: string[];
  apis?: Partial<Record<"places" | "geocoding" | "routes" | "address_validation", GoogleApiProbe | null>>;
  healthScore?: number;
}

async function invokeProbe(fn: string): Promise<ProbeResult> {
  try {
    const { data, error } = await supabase.functions.invoke(fn, { body: {} });
    if (error) return { service: fn, ok: false, errorCode: error.message };
    const result = (data ?? { service: fn, ok: false, errorCode: "no_response" }) as ProbeResult;
    // google-health returns deferred + apis without top-level ok; compute it.
    if (result.apis && result.ok === undefined) {
      const probes = Object.values(result.apis).filter(Boolean) as GoogleApiProbe[];
      result.ok = probes.length > 0 && probes.every((p) => p.ok);
    }
    if (!result.checkedAt) result.checkedAt = new Date().toISOString();
    return result;
  } catch (e) {
    return { service: fn, ok: false, errorCode: e instanceof Error ? e.message : "exception" };
  }
}

function clientDetect(id: string): ProbeResult {
  if (id === "gtm") {
    const gtmId = (import.meta.env as Record<string, string | undefined>).VITE_GTM_ID ?? "";
    return { service: "gtm", ok: !!gtmId, deferred: !gtmId, errorCode: gtmId ? null : "missing_secret", checkedAt: new Date().toISOString(), missing: gtmId ? [] : ["VITE_GTM_ID"] };
  }
  return { service: id, ok: false, errorCode: "unknown_client_probe" };
}

function statusOf(r?: ProbeResult): Status {
  if (!r) return "unknown";
  if (r.deferred) return "deferred";
  if (r.ok) return "ok";
  return "fail";
}

function StatusPill({ s }: { s: Status }) {
  if (s === "ok") return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15"><CheckCircle2 className="w-3 h-3 me-1" /><Bi ar="يعمل" en="Healthy" /></Badge>;
  if (s === "fail") return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500/15"><XCircle className="w-3 h-3 me-1" /><Bi ar="معطّل" en="Failing" /></Badge>;
  if (s === "deferred") return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15"><AlertTriangle className="w-3 h-3 me-1" /><Bi ar="غير مهيّأ" en="Deferred" /></Badge>;
  return <Badge variant="outline"><Bi ar="غير معروف" en="Unknown" /></Badge>;
}

function SummaryStat({
  icon: Icon, label, value, tone,
}: { icon: typeof Activity; label: React.ReactNode; value: number; tone: "ok" | "fail" | "deferred" | "neutral" }) {
  const toneCls =
    tone === "ok" ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
    : tone === "fail" ? "text-rose-600 dark:text-rose-400 bg-rose-500/10"
    : tone === "deferred" ? "text-amber-600 dark:text-amber-400 bg-amber-500/10"
    : "text-muted-foreground bg-muted/40";
  return (
    <Card className="p-3 flex items-center gap-3">
      <span className={`h-9 w-9 rounded-lg inline-flex items-center justify-center ${toneCls}`}>
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
        <p className="text-lg font-semibold leading-tight tech-content" dir="ltr">{value}</p>
      </div>
    </Card>
  );
}

const GOOGLE_API_LABELS: Record<string, { ar: string; en: string }> = {
  places: { ar: "Places — الأماكن", en: "Places" },
  geocoding: { ar: "Geocoding — تحويل العناوين", en: "Geocoding" },
  routes: { ar: "Routes — المسارات", en: "Routes" },
  address_validation: { ar: "Address Validation — تحقق العناوين", en: "Address Validation" },
};

function GoogleDetail({ r }: { r?: ProbeResult }) {
  const bi = useBi();
  if (!r) return <p className="text-xs text-muted-foreground"><Bi ar="جارٍ الفحص..." en="Probing..." /></p>;
  const apis = r.apis ?? {};
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <ShieldCheck className="w-3.5 h-3.5" />
        <Bi ar="فحص فرعي لكل واجهة برمجية" en="Per-API sub-probes" />
        {r.healthScore !== undefined && (
          <Badge variant="outline" className="h-5 text-[10px] ms-auto">{r.healthScore}%</Badge>
        )}
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {Object.entries(GOOGLE_API_LABELS).map(([key, label]) => {
          const p = apis[key as keyof typeof apis];
          const ok = p?.ok === true;
          return (
            <div key={key} className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5 text-[11px]">
              <span className="font-medium truncate">{bi(label.ar, label.en)}</span>
              <span className="ms-auto flex items-center gap-1.5">
                {p ? (
                  <>
                    <span className="text-muted-foreground tech-content" dir="ltr">{p.latencyMs}ms</span>
                    {!ok && p.status > 0 && (
                      <Badge variant="outline" className="h-4 text-[9px] tech-content">HTTP {p.status}</Badge>
                    )}
                    {ok
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      : <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                  </>
                ) : (
                  <Badge variant="outline" className="h-4 text-[9px]"><Bi ar="غير مفعّل" en="off" /></Badge>
                )}
              </span>
            </div>
          );
        })}
      </div>
      {r.missing && r.missing.length > 0 && (
        <p className="text-[11px] text-amber-700 dark:text-amber-300">
          <Bi ar="مفاتيح ناقصة" en="Missing keys" />:{" "}
          <span className="tech-content" dir="ltr">{r.missing.join(", ")}</span>
        </p>
      )}
    </div>
  );
}

function GtmDetail({ r }: { r?: ProbeResult }) {
  const gtmId = (import.meta.env as Record<string, string | undefined>).VITE_GTM_ID ?? "";
  return (
    <div className="space-y-2 text-[11px]">
      <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5">
        <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-medium"><Bi ar="معرّف الحاوية" en="Container ID" /></span>
        <span className="ms-auto tech-content text-muted-foreground" dir="ltr">
          {gtmId ? gtmId : "—"}
        </span>
      </div>
      <p className="text-muted-foreground">
        <Bi
          ar="يُهيّأ عبر متغيّر البناء VITE_GTM_ID ويتم تحميله مع موافقة المستخدم."
          en="Configured via VITE_GTM_ID build var; loaded with user consent."
        />
      </p>
      {!gtmId && (
        <p className="text-amber-700 dark:text-amber-300">
          <Bi ar="غير مُعدّ — لا يتم تحميل GTM." en="Not configured — GTM is not loaded." />
        </p>
      )}
      {r?.checkedAt && (
        <p className="text-[10px] text-muted-foreground tech-content" dir="ltr">
          {new Date(r.checkedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

const AdminIntegrations = () => {
  useNoIndex();
  const [nonce, setNonce] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["admin", "integrations", nonce],
    queryFn: async () => {
      const entries = await Promise.all(
        SERVICES.map(async (s) => [s.id, s.fn ? await invokeProbe(s.fn) : clientDetect(s.id)] as const),
      );
      return Object.fromEntries(entries) as Record<string, ProbeResult>;
    },
    staleTime: 30_000,
  });

  const onRefresh = useCallback(() => { setNonce((n) => n + 1); refetch(); }, [refetch]);
  const toggle = useCallback((id: string) => setExpanded((m) => ({ ...m, [id]: !m[id] })), []);

  const counts = useMemo(() => {
    const c = { ok: 0, fail: 0, deferred: 0, total: SERVICES.length };
    for (const svc of SERVICES) {
      const s = statusOf(data?.[svc.id]);
      if (s === "ok") c.ok += 1;
      else if (s === "fail") c.fail += 1;
      else if (s === "deferred") c.deferred += 1;
    }
    return c;
  }, [data]);

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-6xl px-4 py-6 space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <Bi ar="التكاملات الخارجية" en="External Integrations" />
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <Bi
                ar="نقطة التحكم المركزية لجميع خدمات الطرف الثالث. لا تُعرض المفاتيح هنا — فقط حالة التشغيل."
                en="Single control point for all third-party services. Keys are never displayed — only operational status."
              />
            </p>
          </div>
          <Button variant="outline" size="sm" className="hover-lift" onClick={onRefresh} disabled={isFetching}>
            {isFetching ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <RefreshCw className="w-4 h-4 me-1" />}
            <Bi ar="تحديث الكل" en="Refresh all" />
          </Button>
        </header>

        {/* Summary */}
        <section className="grid gap-2 grid-cols-2 sm:grid-cols-4">
          <SummaryStat icon={Activity} value={counts.total} tone="neutral"
            label={<Bi ar="إجمالي الخدمات" en="Total services" />} />
          <SummaryStat icon={CheckCircle2} value={counts.ok} tone="ok"
            label={<Bi ar="تعمل" en="Healthy" />} />
          <SummaryStat icon={XCircle} value={counts.fail} tone="fail"
            label={<Bi ar="معطّلة" en="Failing" />} />
          <SummaryStat icon={AlertTriangle} value={counts.deferred} tone="deferred"
            label={<Bi ar="غير مهيّأة" en="Deferred" />} />
        </section>

        {/* Categorized service grid — everything inline, no external nav */}
        {CATEGORIES.map((cat) => {
          const items = SERVICES.filter((s) => s.category === cat.id);
          if (items.length === 0) return null;
          const CatIcon = cat.icon;
          return (
            <section key={cat.id} aria-labelledby={`cat-${cat.id}`} className="space-y-2">
              <h2 id={`cat-${cat.id}`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <CatIcon className="w-3.5 h-3.5" />
                <Bi ar={cat.label.ar} en={cat.label.en} />
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((svc) => {
                  const r = data?.[svc.id];
                  const s = statusOf(r);
                  const Icon = svc.icon;
                  const isOpen = !!expanded[svc.id];
                  return (
                    <Card key={svc.id} className="p-4 hover-lift">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex items-start gap-2.5">
                          <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary inline-flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-medium text-sm">
                              <Bi ar={svc.name.ar} en={svc.name.en} />
                            </h3>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              <Bi ar={svc.description.ar} en={svc.description.en} />
                            </p>
                            <p className="mt-1 text-[10px] text-muted-foreground truncate tech-content" dir="ltr">
                              {svc.source}
                            </p>
                          </div>
                        </div>
                        <StatusPill s={s} />
                      </div>

                      <dl className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                        <div>
                          <dt className="opacity-70"><Bi ar="زمن" en="Latency" /></dt>
                          <dd className="tech-content" dir="ltr">{r?.latencyMs != null ? `${r.latencyMs}ms` : "—"}</dd>
                        </div>
                        <div>
                          <dt className="opacity-70"><Bi ar="HTTP" en="HTTP" /></dt>
                          <dd className="tech-content" dir="ltr">{r?.status ?? "—"}</dd>
                        </div>
                        <div>
                          <dt className="opacity-70"><Bi ar="آخر فحص" en="Checked" /></dt>
                          <dd className="tech-content" dir="ltr">
                            {r?.checkedAt ? new Date(r.checkedAt).toLocaleTimeString() : "—"}
                          </dd>
                        </div>
                      </dl>

                      {(r?.errorCode || (r?.warnings?.length ?? 0) > 0) && (
                        <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300 truncate tech-content" dir="ltr">
                          {r?.errorCode ?? ""}{r?.warnings?.length ? ` · ${r.warnings.join(", ")}` : ""}
                        </p>
                      )}

                      {svc.hasDetail && (
                        <>
                          <Button
                            type="button" variant="ghost" size="sm"
                            className="mt-3 h-8 text-xs w-full justify-between"
                            onClick={() => toggle(svc.id)}
                            aria-expanded={isOpen}
                          >
                            <span><Bi ar="تفاصيل مضمّنة" en="Inline details" /></span>
                            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </Button>
                          {isOpen && (
                            <div className="mt-2 rounded-lg border bg-muted/20 p-3">
                              {svc.id === "google" && <GoogleDetail r={r} />}
                              {svc.id === "gtm" && <GtmDetail r={r} />}
                            </div>
                          )}
                        </>
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}

        <Card className="p-4 bg-muted/30 border-dashed">
          <p className="text-xs text-muted-foreground flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>
              <Bi
                ar="جميع الأسرار محفوظة في Supabase Secrets ولا تظهر أبداً في الواجهة. لإدارة المفاتيح: الإعدادات → الأسرار. الفحوصات تستدعي وظائف الحافة فقط ولا تكشف المفاتيح."
                en="All secrets live in Supabase Secrets and are never displayed in the UI. To manage keys: Settings → Secrets. Probes call edge functions only and never expose keys."
              />
            </span>
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminIntegrations;