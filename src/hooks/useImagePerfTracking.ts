/**
 * Image perf tracking hook (hybrid mode — see image-perf memory).
 *
 * Wires a logical route key into the existing Web Vitals collector so each
 * sample carries `route_key`, and ships one synthetic `IMG` event per
 * page-view counting the number of <img> elements rendered. Sampled to
 * 10% on the client to keep payload volume low; the existing
 * `ingest-web-vitals` edge function persists everything to
 * `web_vitals_events` for the /admin/performance dashboard.
 */
import { useEffect } from 'react';
import { setPerfRouteKey, recordImageCount } from '@/utils/reportWebVitals';

const SAMPLE_RATE = 0.1; // 10%

export function useImagePerfTracking(routeKey: string) {
  useEffect(() => {
    setPerfRouteKey(routeKey);
    const sampled = Math.random() < SAMPLE_RATE;
    if (!sampled) return () => setPerfRouteKey(undefined);

    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      // Wait one more frame to let lazy-loaded above-the-fold images attach.
      requestAnimationFrame(() => {
        if (cancelled) return;
        const count = document.querySelectorAll('img').length;
        recordImageCount(routeKey, count);
      });
    };

    if (document.readyState === 'complete') {
      const t = window.setTimeout(measure, 1500);
      return () => {
        cancelled = true;
        window.clearTimeout(t);
        setPerfRouteKey(undefined);
      };
    }
    const onLoad = () => window.setTimeout(measure, 1500);
    window.addEventListener('load', onLoad, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener('load', onLoad);
      setPerfRouteKey(undefined);
    };
  }, [routeKey]);
}

export default useImagePerfTracking;