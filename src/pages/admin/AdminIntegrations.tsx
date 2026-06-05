/**
 * SERVICE-CONFIGURATION-GOVERNANCE-AUDIT-1 (Phase 2)
 * Unified Integrations dashboard. Runs every health probe in parallel and
 * renders a compact status grid. No keys are ever displayed.
 */
import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Activity, RefreshCw, ExternalLink, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bi } from "@/components/common/Bilingual";
import { useNoIndex } from "@/hooks/useNoIndex";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";

type Status = "ok" | "fail" | "deferred" | "unknown";

interface ServiceCard {
  id: string;
  name: { ar: string; en: string };
  source: string;
  fn: string | null;          // edge function name; null = client-detected
  detailHref?: string;
}

const SERVICES: ServiceCard[] = [
  { id: "google", name: { ar: "Google Maps Platform", en: "Google Maps Platform" }, source: "GOOGLE_MAPS_API_KEY · Supabase Secret", fn: "google-health", detailHref: "/admin/integrations/google" },
  { id: "lovable_ai", name: { ar: "Lovable AI Gateway", en: "Lovable AI Gateway" }, source: "LOVABLE_API_KEY · managed", fn: "lovable-ai-health" },
  { id: "resend", name: { ar: "Resend (البريد)", en: "Resend (Email)" }, source: "RESEND_API_KEY · Supabase Secret", fn: "resend-health" },
  { id: "moyasar", name: { ar: "Moyasar (المدفوعات)", en: "Moyasar (Payments)" }, source: "MOYASAR_SECRET_KEY · Supabase Secret", fn: "moyasar-health" },
  { id: "firecrawl", name: { ar: "Firecrawl (الإثراء)", en: "Firecrawl (Enrichment)" }, source: "FIRECRAWL_API_KEY · Supabase Secret", fn: "firecrawl-health" },
  { id: "gtm", name: { ar: "Google Tag Manager", en: "Google Tag Manager" }, source: "VITE_GTM_ID · build env", fn: null, detailHref: "/admin/analytics-settings" },
];

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
}

async function invokeProbe(fn: string): Promise<ProbeResult> {
  try {
    const { data, error } = await supabase.functions.invoke(fn, { body: {} });
    if (error) return { service: fn, ok: false, errorCode: error.message };
    return (data ?? { service: fn, ok: false, errorCode: "no_response" }) as ProbeResult;
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

const AdminIntegrations = () => {
  useNoIndex();
  const [nonce, setNonce] = useState(0);

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

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-5xl px-4 py-6">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
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
            <Bi ar="تحديث" en="Refresh" />
          </Button>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          {SERVICES.map((svc) => {
            const r = data?.[svc.id];
            const s = statusOf(r);
            return (
              <Card key={svc.id} className="p-4 hover-lift">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-medium text-sm flex items-center gap-2">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <Bi ar={svc.name.ar} en={svc.name.en} />
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground truncate tech-content" dir="ltr">{svc.source}</p>
                  </div>
                  <StatusPill s={s} />
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                  <div><dt className="opacity-70"><Bi ar="زمن" en="Latency" /></dt><dd className="tech-content" dir="ltr">{r?.latencyMs != null ? `${r.latencyMs}ms` : "—"}</dd></div>
                  <div><dt className="opacity-70"><Bi ar="HTTP" en="HTTP" /></dt><dd className="tech-content" dir="ltr">{r?.status ?? "—"}</dd></div>
                  <div><dt className="opacity-70"><Bi ar="آخر فحص" en="Checked" /></dt><dd className="tech-content" dir="ltr">{r?.checkedAt ? new Date(r.checkedAt).toLocaleTimeString() : "—"}</dd></div>
                </dl>
                {(r?.errorCode || (r?.warnings?.length ?? 0) > 0) && (
                  <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300 truncate tech-content" dir="ltr">
                    {r?.errorCode ?? ""}{r?.warnings?.length ? ` · ${r.warnings.join(", ")}` : ""}
                  </p>
                )}
                {svc.detailHref && (
                  <div className="mt-3">
                    <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                      <Link to={svc.detailHref}><ExternalLink className="w-3 h-3 me-1" /><Bi ar="التفاصيل" en="Details" /></Link>
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          <Bi
            ar="جميع الأسرار في Supabase Secrets. لإدارة المفاتيح: الإعدادات → الأسرار."
            en="All secrets live in Supabase Secrets. To manage keys: Settings → Secrets."
          />
        </p>
      </div>
    </DashboardLayout>
  );
};

export default AdminIntegrations;