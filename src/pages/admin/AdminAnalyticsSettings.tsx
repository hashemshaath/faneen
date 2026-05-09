import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useNoIndex } from "@/hooks/useNoIndex";
import {
  Activity, BarChart3, CheckCircle2, XCircle, Shield, ShieldAlert,
  RefreshCw, ExternalLink, Cookie, Eye, AlertTriangle,
} from "lucide-react";
import {
  getGtmId,
  readStoredConsent,
  type ConsentState,
} from "@/lib/gtm";
import { getDiagEntries, subscribeDiag, type DiagEntry } from "@/lib/diagnostics";

type DataLayerWindow = Window & {
  dataLayer?: Array<Record<string, unknown> | IArguments>;
  google_tag_manager?: Record<string, unknown>;
  gtag?: (...a: unknown[]) => void;
};

interface DetectionState {
  gtmId: string | null;
  gtmContainerLoaded: boolean;
  gaTagDetected: boolean;
  dataLayerLength: number;
  pageViews: number;
  consentEvents: number;
  scriptOnPage: boolean;
}

function detect(): DetectionState {
  const gtmId = getGtmId();
  if (typeof window === "undefined") {
    return {
      gtmId, gtmContainerLoaded: false, gaTagDetected: false,
      dataLayerLength: 0, pageViews: 0, consentEvents: 0, scriptOnPage: false,
    };
  }
  const w = window as DataLayerWindow;
  const dl = Array.isArray(w.dataLayer) ? w.dataLayer : [];
  const containers = w.google_tag_manager ?? {};
  const containerLoaded = !!gtmId && Object.prototype.hasOwnProperty.call(containers, gtmId);
  const scriptOnPage = !!document.querySelector('script[src*="googletagmanager.com/gtm.js"]');

  let pageViews = 0;
  let consentEvents = 0;
  let gaTagDetected = false;
  for (const raw of dl) {
    const item = raw as Record<string, unknown>;
    if (!item) continue;
    if (item.event === "page_view" || item.event === "gtm.historyChange") pageViews++;
    if (item.event === "consent_update") consentEvents++;
    // GA4 config events appear in dataLayer as gtag('config','G-XXX')
    if (typeof item[1] === "string" && /^G-[A-Z0-9]+$/.test(item[1] as string)) gaTagDetected = true;
  }
  return {
    gtmId,
    gtmContainerLoaded: containerLoaded,
    gaTagDetected,
    dataLayerLength: dl.length,
    pageViews,
    consentEvents,
    scriptOnPage,
  };
}

const SIGNAL_LABELS_AR: Record<keyof ConsentState, string> = {
  ad_storage: "تخزين الإعلانات",
  ad_user_data: "بيانات مستخدم الإعلانات",
  ad_personalization: "تخصيص الإعلانات",
  analytics_storage: "تخزين التحليلات",
  functionality_storage: "تخزين الوظائف",
  security_storage: "تخزين الأمان",
};
const SIGNAL_LABELS_EN: Record<keyof ConsentState, string> = {
  ad_storage: "Ad storage",
  ad_user_data: "Ad user data",
  ad_personalization: "Ad personalization",
  analytics_storage: "Analytics storage",
  functionality_storage: "Functionality storage",
  security_storage: "Security storage",
};

const AdminAnalyticsSettings = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const [, setTick] = useState(0);
  const [diag, setDiag] = useState<DiagEntry[]>(() => getDiagEntries());

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 2000);
    const unsub = subscribeDiag(() => setDiag(getDiagEntries()));
    return () => { window.clearInterval(id); unsub(); };
  }, []);

  const state = useMemo(detect, [/* recomputed each render via tick */]);
  const stored = useMemo(readStoredConsent, [diag.length]);

  const cspViolations = useMemo(
    () => diag.filter((d) => d.source === "csp").slice(-10).reverse(),
    [diag],
  );
  const extensionNoise = useMemo(
    () => diag.filter((d) => d.source === "extension").slice(-10).reverse(),
    [diag],
  );

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const tx = isRTL
    ? {
        title: "إعدادات التحليلات والموافقة",
        sub: "حالة Google Tag Manager وGA4 وحالة موافقة الزائر الحالية. تشخيص فقط — لا يحفظ أي بيانات.",
        gtm: "Google Tag Manager",
        ga: "Google Analytics 4",
        consent: "حالة الموافقة (Consent Mode v2)",
        csp: "انتهاكات سياسة أمان المحتوى",
        ext: "ضوضاء إضافات المتصفح",
        refresh: "تحديث",
        loaded: "محمّل",
        notLoaded: "غير محمّل",
        detected: "مكتشف",
        notDetected: "غير مكتشف",
        granted: "مسموح",
        denied: "مرفوض",
        unknown: "غير معروف",
        none: "لا توجد إدخالات",
        decision: "القرار",
        savedAt: "محفوظ في",
        gtmId: "معرّف الحاوية",
        scriptInjected: "تم حقن السكربت",
        containerReady: "الحاوية جاهزة",
        dlEvents: "أحداث dataLayer",
        pageViews: "page_view",
        consentEvents: "consent_update",
        notConfigured: "غير مُعدّ — VITE_GTM_ID غير مضبوط.",
        viewDiag: "فتح التشخيصات الكاملة",
        nope: "—",
      }
    : {
        title: "Analytics & Consent",
        sub: "Live status of Google Tag Manager, GA4, and the current visitor's Consent Mode v2 state. Diagnostic only — nothing is persisted server-side.",
        gtm: "Google Tag Manager",
        ga: "Google Analytics 4",
        consent: "Consent state (Consent Mode v2)",
        csp: "CSP violations",
        ext: "Browser-extension noise",
        refresh: "Refresh",
        loaded: "Loaded",
        notLoaded: "Not loaded",
        detected: "Detected",
        notDetected: "Not detected",
        granted: "Granted",
        denied: "Denied",
        unknown: "Unknown",
        none: "No entries captured",
        decision: "Decision",
        savedAt: "Saved at",
        gtmId: "Container ID",
        scriptInjected: "Script injected",
        containerReady: "Container ready",
        dlEvents: "dataLayer events",
        pageViews: "page_view",
        consentEvents: "consent_update",
        notConfigured: "Not configured — VITE_GTM_ID is unset.",
        viewDiag: "Open full diagnostics",
        nope: "—",
      };

  const Pill = ({ ok, labelOk, labelBad }: { ok: boolean; labelOk: string; labelBad: string }) => (
    <Badge
      variant="outline"
      className={ok
        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1"
        : "bg-destructive/10 text-destructive border-destructive/30 gap-1"}
    >
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {ok ? labelOk : labelBad}
    </Badge>
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
        <header className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              {tx.title}
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">{tx.sub}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refresh} className="gap-1">
              <RefreshCw className="w-4 h-4" /> {tx.refresh}
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link to="/diagnostics"><Activity className="w-4 h-4" /> {tx.viewDiag}</Link>
            </Button>
          </div>
        </header>

        {/* GTM card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-4 h-4 text-primary" /> {tx.gtm}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {state.gtmId ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Stat label={tx.gtmId} value={<code className="tech-content text-xs">{state.gtmId}</code>} />
                  <Stat label={tx.scriptInjected} value={<Pill ok={state.scriptOnPage} labelOk={tx.loaded} labelBad={tx.notLoaded} />} />
                  <Stat label={tx.containerReady} value={<Pill ok={state.gtmContainerLoaded} labelOk={tx.loaded} labelBad={tx.notLoaded} />} />
                  <Stat label={tx.dlEvents} value={<span className="tech-content font-semibold">{state.dataLayerLength}</span>} />
                </div>
                <Separator />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Stat label={tx.pageViews} value={<span className="tech-content font-semibold">{state.pageViews}</span>} />
                  <Stat label={tx.consentEvents} value={<span className="tech-content font-semibold">{state.consentEvents}</span>} />
                  <Stat label={tx.ga} value={<Pill ok={state.gaTagDetected} labelOk={tx.detected} labelBad={tx.notDetected} />} />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> {tx.notConfigured}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Consent card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Cookie className="w-4 h-4 text-primary" /> {tx.consent}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="secondary" className="gap-1">
                {tx.decision}: <span className="font-semibold">{stored?.decision ?? tx.unknown}</span>
              </Badge>
              {stored?.ts ? (
                <Badge variant="outline" className="gap-1 tech-content">
                  {tx.savedAt}: {new Date(stored.ts).toLocaleString(isRTL ? "ar" : "en")}
                </Badge>
              ) : null}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(SIGNAL_LABELS_EN) as Array<keyof ConsentState>).map((k) => {
                const v = stored?.state?.[k];
                const label = isRTL ? SIGNAL_LABELS_AR[k] : SIGNAL_LABELS_EN[k];
                return (
                  <div key={k} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                    <span className="text-sm">{label}</span>
                    {v ? (
                      <Pill ok={v === "granted"} labelOk={tx.granted} labelBad={tx.denied} />
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Eye className="w-3 h-3" /> {tx.unknown}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* CSP violations card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="w-4 h-4 text-destructive" /> {tx.csp}
              <Badge variant="outline" className="ms-auto tech-content">{cspViolations.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cspViolations.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tx.none}</p>
            ) : (
              <ul className="space-y-2">
                {cspViolations.map((e) => (
                  <li key={e.id} className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs">
                    <div className="font-semibold text-destructive break-all">{e.message}</div>
                    {e.detail && (
                      <pre className="mt-1 whitespace-pre-wrap text-muted-foreground tech-content max-h-40 overflow-auto">
                        {e.detail}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Extension noise card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ExternalLink className="w-4 h-4 text-muted-foreground" /> {tx.ext}
              <Badge variant="outline" className="ms-auto tech-content">{extensionNoise.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {extensionNoise.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tx.none}</p>
            ) : (
              <ul className="space-y-2">
                {extensionNoise.map((e) => (
                  <li key={e.id} className="rounded-lg border bg-muted/30 p-3 text-xs">
                    <div className="font-medium break-all">{e.message}</div>
                    {e.detail && (
                      <pre className="mt-1 whitespace-pre-wrap text-muted-foreground tech-content max-h-32 overflow-auto">
                        {e.detail}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-lg border bg-muted/30 px-3 py-2">
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
    <div className="text-sm">{value}</div>
  </div>
);

export default AdminAnalyticsSettings;