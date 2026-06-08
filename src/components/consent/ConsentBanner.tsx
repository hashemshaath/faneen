import { useEffect, useState, useCallback } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  CONSENT_ACCEPT_ALL,
  CONSENT_REJECT_NON_ESSENTIAL,
  CONSENT_STORAGE_KEY,
  pushConsentUpdate,
  readStoredConsent,
  updateConsent,
  type ConsentState,
} from "@/lib/gtm";
import { ShieldCheck, Settings2 } from "lucide-react";

/**
 * Lightweight bilingual Consent Mode v2 banner.
 *
 * - Shows only when no choice exists in localStorage(`qitaat_consent_v1`).
 * - Mounts AFTER first paint via `requestIdleCallback` to avoid CWV impact.
 * - Fixed-position overlay → no document layout shift.
 * - Respects iOS safe-area via `env(safe-area-inset-bottom)`.
 * - Pushes Consent Mode v2 update to dataLayer (no PII).
 */
const COPY = {
  ar: {
    title: "نحترم خصوصيتك",
    body:
      "نستخدم الكوكيز لتحسين تجربتك.",
    accept: "قبول",
    reject: "رفض",
    manage: "تفضيلات",
    save: "حفظ",
    analytics: "إحصاءات الاستخدام",
    ads: "تخصيص الإعلانات",
    essential: "ضرورية (دائمًا مفعّلة)",
    close: "إغلاق",
  },
  en: {
    title: "We respect your privacy",
    body:
      "We use cookies to improve your experience.",
    accept: "Accept",
    reject: "Reject",
    manage: "Preferences",
    save: "Save",
    analytics: "Usage analytics",
    ads: "Ad personalization",
    essential: "Essential (always on)",
    close: "Close",
  },
};

export const ConsentBanner = () => {
  const { isRTL } = useLanguage();
  const t = COPY[isRTL ? "ar" : "en"];

  const [open, setOpen] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [ads, setAds] = useState(false);

  // Mount check, deferred to idle to keep LCP/INP clean.
  useEffect(() => {
    const decide = () => {
      const stored = readStoredConsent();
      if (!stored) setOpen(true);
    };
    type IdleW = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const w = window as IdleW;
    if (typeof w.requestIdleCallback === "function") {
      w.requestIdleCallback(decide, { timeout: 1500 });
    } else {
      setTimeout(decide, 400);
    }
    // Re-open if another component dispatches the custom event.
    const onOpen = () => setOpen(true);
    window.addEventListener("qitaat:consent-open", onOpen);
    return () => window.removeEventListener("qitaat:consent-open", onOpen);
  }, []);

  const persistAndPush = useCallback(
    (state: ConsentState, decision: "accept_all" | "reject_non_essential") => {
      // updateConsent already persists + pushes; pass through.
      void state;
      updateConsent(decision);
      setOpen(false);
    },
    [],
  );

  const acceptAll = () => persistAndPush(CONSENT_ACCEPT_ALL, "accept_all");
  const rejectNonEssential = () =>
    persistAndPush(CONSENT_REJECT_NON_ESSENTIAL, "reject_non_essential");

  const saveCustom = () => {
    // If user customizes: any "granted" toggle counts as accept_all-ish only if
    // both analytics + ads are on; otherwise treat as reject for ads when off.
    // To keep the API surface to two decisions, map custom toggles deterministically:
    if (analytics && ads) {
      persistAndPush(CONSENT_ACCEPT_ALL, "accept_all");
    } else if (!analytics && !ads) {
      persistAndPush(CONSENT_REJECT_NON_ESSENTIAL, "reject_non_essential");
    } else {
      // Mixed: build a custom state and persist directly via dataLayer.
      const state: ConsentState = {
        ad_storage: ads ? "granted" : "denied",
        ad_user_data: ads ? "granted" : "denied",
        ad_personalization: ads ? "granted" : "denied",
        analytics_storage: analytics ? "granted" : "denied",
        functionality_storage: "granted",
        security_storage: "granted",
      };
      try {
        localStorage.setItem(
          CONSENT_STORAGE_KEY,
          JSON.stringify({
            decision: analytics ? "accept_all" : "reject_non_essential",
            state,
            ts: Date.now(),
          }),
        );
      } catch {
        /* ignore */
      }
      // Use the shared gtag() helper so GTM recognizes the consent command.
      pushConsentUpdate(state, "custom");
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t.title}
      className="fixed inset-x-0 bottom-0 z-[60] px-2 sm:px-3 pointer-events-none"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-xl pointer-events-auto rounded-xl border border-border bg-background/95 backdrop-blur-md shadow-md px-3 py-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p className="flex-1 min-w-0 text-xs text-muted-foreground truncate">
            <span className="font-medium text-foreground">{t.title}.</span> {t.body}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" onClick={acceptAll} className="h-7 px-2.5 text-xs">
              {t.accept}
            </Button>
            <Button size="sm" variant="ghost" onClick={rejectNonEssential} className="h-7 px-2 text-xs text-muted-foreground">
              {t.reject}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowManage((v) => !v)}
              className="h-7 w-7 p-0 text-muted-foreground"
              aria-label={t.manage}
            >
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {showManage && (
          <div className="mt-2 space-y-1.5 rounded-lg border border-border bg-muted/30 p-2">
            <label className="flex items-center justify-between gap-3 text-xs">
              <span className="text-foreground/80">{t.essential}</span>
              <input type="checkbox" checked disabled className="h-4 w-4 accent-primary" aria-label={t.essential} />
            </label>
            <label className="flex items-center justify-between gap-3 text-xs cursor-pointer">
              <span className="text-foreground/80">{t.analytics}</span>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="h-4 w-4 accent-primary"
                aria-label={t.analytics}
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-xs cursor-pointer">
              <span className="text-foreground/80">{t.ads}</span>
              <input
                type="checkbox"
                checked={ads}
                onChange={(e) => setAds(e.target.checked)}
                className="h-4 w-4 accent-primary"
                aria-label={t.ads}
              />
            </label>
            <div className="flex justify-end">
              <Button size="sm" variant="secondary" onClick={saveCustom} className="h-7 px-3 text-xs">
                {t.save}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsentBanner;