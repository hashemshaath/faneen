/**
 * GOOGLE-INTEGRATION-GOVERNANCE-AUDIT-1
 * Admin → Integrations → Google Services — health dashboard. No popups.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, ShieldCheck, AlertTriangle, Activity, MapPin, Navigation, Route as RouteIcon, MapPinned } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bi } from "@/components/common/Bilingual";
import { useNoIndex } from "@/hooks/useNoIndex";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { healthService, type GoogleHealthResponse, type GoogleApi } from "@/modules/google";
import { GoogleStatusPanel } from "@/components/admin/GoogleStatusPanel";

const API_META: Record<GoogleApi, { ar: string; en: string; Icon: typeof MapPin }> = {
  places: { ar: "Places API", en: "Places API", Icon: MapPin },
  geocoding: { ar: "Geocoding API", en: "Geocoding API", Icon: Navigation },
  routes: { ar: "Routes API", en: "Routes API", Icon: RouteIcon },
  address_validation: { ar: "Address Validation", en: "Address Validation", Icon: MapPinned },
};

function StatusDot({ ok }: { ok: boolean | null }) {
  const cls = ok === null ? "bg-muted-foreground/40" : ok ? "bg-emerald-500" : "bg-rose-500";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`} aria-hidden />;
}

const AdminGoogleServices = () => {
  useNoIndex();
  const [nonce, setNonce] = useState(0);

  const { data, isLoading, isFetching, refetch } = useQuery<GoogleHealthResponse | null>({
    queryKey: ["admin", "google-health", nonce],
    queryFn: () => healthService.fetchGoogleHealth(),
    staleTime: 30_000,
  });

  const deferred = !!data?.deferred;
  const score = data?.healthScore ?? 0;
  const probes = data?.apis ? Object.values(data.apis).filter(Boolean) as NonNullable<GoogleHealthResponse["apis"][GoogleApi]>[] : [];
  const referrerIssue = probes.some((p) => p.authIssue === "referrer_restricted");
  const apiDisabled = probes.some((p) => p.authIssue === "api_not_enabled");
  const keyInvalid = probes.some((p) => p.authIssue === "key_invalid");

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-5xl px-4 py-6">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              <Bi ar="خدمات Google" en="Google Services" />
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <Bi
                ar="حالة وصلاحية تكاملات Google Maps Platform داخل قطاعات."
                en="Health and quotas for every Google Maps Platform integration used by Qitaat."
              />
            </p>
          </div>
          <Button
            variant="outline" size="sm"
            className="hover-lift"
            onClick={() => { setNonce((n) => n + 1); refetch(); }}
            disabled={isFetching}
          >
            {isFetching ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <RefreshCw className="me-2 h-4 w-4" />}
            <Bi ar="إعادة الفحص" en="Re-check" />
          </Button>
        </header>

        <GoogleStatusPanel />

        <Card className="mb-6 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <div className="text-sm text-muted-foreground">
                  <Bi ar="نتيجة الصحة العامة" en="Overall Health Score" />
                </div>
                <div className="text-2xl font-semibold tech-content">
                  {isLoading ? "—" : `${score}%`}
                </div>
              </div>
            </div>
            {deferred ? (
              <Badge variant="outline" className="gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <Bi ar="إعدادات ناقصة" en="Configuration missing" />
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <Bi ar="مفاتيح الخادم نشطة" en="Server keys active" />
              </Badge>
            )}
          </div>
          {deferred && data?.missing?.length ? (
            <p className="mt-3 text-xs text-muted-foreground">
              <Bi ar="الأسرار الناقصة:" en="Missing secrets:" /> <span className="tech-content">{data.missing.join(", ")}</span>
            </p>
          ) : null}
        </Card>

        {(referrerIssue || apiDisabled || keyInvalid) && (
          <Card className="mb-6 border-amber-300 bg-amber-50 p-4 text-amber-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-1 text-sm">
                {referrerIssue && (
                  <p>
                    <strong><Bi ar="قيد HTTP Referrer مفعّل على المفتاح الخادمي." en="HTTP Referrer restriction detected on the server key." /></strong>{" "}
                    <Bi
                      ar="افتح Google Cloud → Credentials → عدّل GOOGLE_MAPS_API_KEY → Application restrictions = None، ثم اضغط إعادة الفحص."
                      en="Open Google Cloud → Credentials → edit GOOGLE_MAPS_API_KEY → Application restrictions = None, then re-check."
                    />
                  </p>
                )}
                {apiDisabled && (
                  <p>
                    <Bi
                      ar="فعّل في GCP: Places API (New), Geocoding, Routes, Address Validation."
                      en="Enable in GCP: Places API (New), Geocoding, Routes, Address Validation."
                    />
                  </p>
                )}
                {keyInvalid && (
                  <p>
                    <Bi ar="المفتاح غير صالح — أنشئ مفتاحًا جديدًا وحدّث السر GOOGLE_MAPS_API_KEY." en="Invalid key — create a new one and update the GOOGLE_MAPS_API_KEY secret." />
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(Object.keys(API_META) as GoogleApi[]).map((k) => {
            const meta = API_META[k];
            const probe = data?.apis?.[k] ?? null;
            const usage = data?.usage?.find((u) => u.api === k);
            const Icon = meta.Icon;
            return (
              <Card key={k} className="p-5 hover-lift">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold"><Bi ar={meta.ar} en={meta.en} /></div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <StatusDot ok={probe?.ok ?? null} />
                        {probe === null
                          ? <Bi ar="غير مفحوص" en="Not checked" />
                          : probe.ok
                            ? <span><Bi ar="جاهز" en="Healthy" /> · <span className="tech-content">HTTP {probe.status}</span></span>
                            : <span><Bi ar="فشل" en="Failed" /> · <span className="tech-content">HTTP {probe.status}</span> · <span className="tech-content">{probe.errorCode ?? probe.authIssue ?? "error"}</span></span>}
                      </div>
                    </div>
                  </div>
                  {probe && (
                    <span className="text-xs text-muted-foreground tech-content">{probe.latencyMs}ms</span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="rounded-lg border border-border bg-card p-2">
                    <div className="text-muted-foreground"><Bi ar="نجاح 24س" en="OK 24h" /></div>
                    <div className="mt-0.5 font-semibold tech-content text-emerald-600">{usage?.ok ?? 0}</div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-2">
                    <div className="text-muted-foreground"><Bi ar="فشل 24س" en="Err 24h" /></div>
                    <div className="mt-0.5 font-semibold tech-content text-rose-600">{usage?.err ?? 0}</div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-2">
                    <div className="text-muted-foreground"><Bi ar="متوسط الزمن" en="Avg ms" /></div>
                    <div className="mt-0.5 font-semibold tech-content">{usage?.avg_latency_ms ?? 0}</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Bi
            ar="لا تُعرض أبدًا مفاتيح API هنا. جميع الطلبات تمر عبر وحدات الخادم."
            en="API keys are never displayed here. All calls are proxied through server-side edge functions."
          />
          {data?.checkedAt && (
            <span className="ms-2 tech-content">· {new Date(data.checkedAt).toLocaleString()}</span>
          )}
        </p>
      </div>
    </DashboardLayout>
  );
};

export default AdminGoogleServices;