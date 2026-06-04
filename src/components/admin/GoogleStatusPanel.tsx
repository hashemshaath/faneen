// Inline Google integration status panel for /admin/data-enrichment.
// Shows server/browser key presence and per-API health (Places, Geocoding,
// Routes, Address Validation) using fetchGoogleHealth. No popups.
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bi, useBi } from "@/components/common/Bilingual";
import { CheckCircle2, XCircle, RefreshCw, KeyRound, Activity, Loader2 } from "lucide-react";
import { fetchGoogleHealth } from "@/modules/google";
import type { GoogleApi, GoogleProbe } from "@/modules/google/types";

const API_LABELS: Record<GoogleApi, { ar: string; en: string }> = {
  places: { ar: "Places (الأماكن)", en: "Places" },
  geocoding: { ar: "Geocoding (تحويل العناوين)", en: "Geocoding" },
  routes: { ar: "Routes (المسارات)", en: "Routes" },
  address_validation: { ar: "Address Validation", en: "Address Validation" },
};

function StatusDot({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    : <XCircle className="h-4 w-4 text-rose-600" />;
}

export function GoogleStatusPanel() {
  const bi = useBi();
  const browserKeyPresent = Boolean(
    import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY,
  );

  const q = useQuery({
    queryKey: ["admin", "google-health"],
    queryFn: fetchGoogleHealth,
    staleTime: 60_000,
  });

  const data = q.data;
  const serverKeyMissing = data?.missing?.includes("GOOGLE_MAPS_API_KEY") ?? false;
  const serverKeyPresent = data ? !serverKeyMissing : false;

  return (
    <Card className="mb-4 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">
          <Bi ar="حالة تكامل Google" en="Google integration status" />
        </h2>
        {data?.healthScore !== undefined && (
          <Badge variant="outline" className="h-5 text-[10px]">
            {data.healthScore}%
          </Badge>
        )}
        <span className="ms-auto flex items-center gap-2">
          {q.isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => q.refetch()}>
            <RefreshCw className="h-3.5 w-3.5 me-1" />
            <Bi ar="تحديث" en="Refresh" />
          </Button>
        </span>
      </div>

      {/* Keys */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2 text-xs">
          <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">
            <Bi ar="مفتاح الخادم" en="Server key" />
          </span>
          <span className="text-muted-foreground">GOOGLE_MAPS_API_KEY</span>
          <span className="ms-auto">
            {q.isLoading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <StatusDot ok={serverKeyPresent} />}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2 text-xs">
          <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">
            <Bi ar="مفتاح المتصفح" en="Browser key" />
          </span>
          <span className="text-muted-foreground">VITE_..._BROWSER_KEY</span>
          <span className="ms-auto"><StatusDot ok={browserKeyPresent} /></span>
        </div>
      </div>

      {/* APIs */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {(Object.keys(API_LABELS) as GoogleApi[]).map((api) => {
          const probe: GoogleProbe | null | undefined = data?.apis?.[api];
          const ok = probe?.ok === true;
          return (
            <div
              key={api}
              className="flex items-center gap-2 rounded-lg border bg-card p-2 text-xs"
            >
              <span className="font-medium">{bi(API_LABELS[api].ar, API_LABELS[api].en)}</span>
              <span className="ms-auto flex items-center gap-2">
                {probe ? (
                  <>
                    <span className="text-muted-foreground">
                      {probe.latencyMs}ms
                    </span>
                    {!ok && probe.status > 0 && (
                      <Badge variant="outline" className="h-5 text-[10px]">
                        HTTP {probe.status}
                      </Badge>
                    )}
                    {!ok && probe.errorCode && (
                      <Badge variant="outline" className="h-5 text-[10px]">
                        {probe.errorCode}
                      </Badge>
                    )}
                    <StatusDot ok={ok} />
                  </>
                ) : q.isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Badge variant="outline" className="h-5 text-[10px]">
                    <Bi ar="غير مفعّل" en="not enabled" />
                  </Badge>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {data?.deferred && (
        <p className="mt-3 text-[11px] text-amber-700">
          <Bi
            ar="الخدمة معطّلة لأن مفاتيح Google غير مُعدّة بالكامل."
            en="Service deferred — Google credentials are not fully configured."
          />
          {data.missing?.length ? ` (${data.missing.join(", ")})` : ""}
        </p>
      )}
      {data?.checkedAt && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          <Bi ar="آخر فحص" en="Last checked" />: {new Date(data.checkedAt).toLocaleString()}
        </p>
      )}
    </Card>
  );
}