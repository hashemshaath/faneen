import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

function getSessionId() {
  const key = 'qi_session_id';
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

export function useProviderTracking() {
  const viewTracked = useRef(false);

  const track = useCallback(
    (eventType: 'section_view' | 'card_click' | 'view_all_click', providerId?: string, providerUsername?: string) => {
      // Dedupe section_view per session
      if (eventType === 'section_view') {
        if (viewTracked.current) return;
        viewTracked.current = true;
      }
      // Fire-and-forget — never block UI
      supabase
        .from('provider_interactions')
        .insert({
          event_type: eventType,
          provider_id: providerId || null,
          provider_username: providerUsername || null,
          session_id: getSessionId(),
        } as any)
        .then(() => {});
    },
    [],
  );

  return { track };
}