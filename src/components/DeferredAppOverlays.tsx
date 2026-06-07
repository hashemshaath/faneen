import { Suspense, useEffect, useState, lazy } from "react";
import { lazyRetry } from "@/lib/lazyRetry";

const ConsentBanner = lazyRetry(() => import("./consent/ConsentBanner"));
const BuildVersionWatcher = lazyRetry(() => import("./BuildVersionWatcher"));
const HelpLauncherFloating = lazyRetry(() => import("./help/HelpLauncherFloating"));

/**
 * Defers all non-critical app overlays (consent banner, help launcher,
 * build-version watcher) until AFTER window `load` + `requestIdleCallback`.
 *
 * Previously these were rendered eagerly inside <Suspense> at App root —
 * which meant their JS chunks + initial render work competed with the
 * homepage LCP paint. They are not needed for first paint or first input,
 * so we hold them out of the critical chain entirely.
 */
export const DeferredAppOverlays = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const mount = () => {
      if (cancelled) return;
      type IdleWin = Window & {
        requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      };
      const w = window as IdleWin;
      const idle = (cb: () => void) =>
        typeof w.requestIdleCallback === "function"
          ? w.requestIdleCallback(cb, { timeout: 4000 })
          : window.setTimeout(cb, 2500);
      idle(() => { if (!cancelled) setReady(true); });
    };
    if (document.readyState === "complete") mount();
    else window.addEventListener("load", mount, { once: true });
    return () => { cancelled = true; };
  }, []);

  if (!ready) return null;

  return (
    <>
      <Suspense fallback={null}><ConsentBanner /></Suspense>
      <Suspense fallback={null}><BuildVersionWatcher /></Suspense>
      <Suspense fallback={null}><HelpLauncherFloating /></Suspense>
    </>
  );
};

export default DeferredAppOverlays;