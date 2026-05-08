import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

function getSessionId(): string {
  const key = 'qi_landing_session';
  let s = sessionStorage.getItem(key);
  if (!s) {
    s = crypto.randomUUID();
    sessionStorage.setItem(key, s);
  }
  return s;
}

function getDevice(): string {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function readUtm() {
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get('utm_source') ?? undefined,
    utm_medium: p.get('utm_medium') ?? undefined,
    utm_campaign: p.get('utm_campaign') ?? undefined,
    utm_content: p.get('utm_content') ?? undefined,
    utm_term: p.get('utm_term') ?? undefined,
  };
}

interface TrackArgs {
  event_type: 'view' | 'cta_click' | 'signup' | 'scroll_depth' | 'video_play' | 'form_start' | 'form_submit';
  section?: string;
  cta_id?: string;
  metadata?: Record<string, unknown>;
}

export function useLandingTracking(enabled = true) {
  const viewTracked = useRef(false);
  const scrollMarks = useRef(new Set<number>());

  const track = useCallback(async (args: TrackArgs) => {
    if (!enabled) return;
    const session_id = getSessionId();
    const utm = readUtm();
    const payload = {
      event_type: args.event_type,
      section: args.section ?? null,
      cta_id: args.cta_id ?? null,
      session_id,
      referrer: document.referrer || null,
      device: getDevice(),
      path: window.location.pathname,
      metadata: JSON.parse(JSON.stringify(args.metadata ?? {})),
      ...utm,
    } as never;
    try {
      await supabase.from('provider_landing_metrics').insert([payload]);
    } catch {
      /* ignore tracking errors */
    }
  }, [enabled]);

  // Auto page view
  useEffect(() => {
    if (!enabled || viewTracked.current) return;
    viewTracked.current = true;
    void track({ event_type: 'view', section: 'page' });
  }, [enabled, track]);

  // Scroll depth
  useEffect(() => {
    if (!enabled) return;
    const onScroll = () => {
      const h = document.documentElement;
      const pct = Math.round(((window.scrollY + window.innerHeight) / h.scrollHeight) * 100);
      [25, 50, 75, 100].forEach((m) => {
        if (pct >= m && !scrollMarks.current.has(m)) {
          scrollMarks.current.add(m);
          void track({ event_type: 'scroll_depth', section: `depth_${m}`, metadata: { pct: m } });
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [enabled, track]);

  return { track };
}
