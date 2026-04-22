import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

type ContentType = 'blog' | 'project' | 'profile_system' | 'promotion' | 'business';
type EventType = 'view' | 'save' | 'share';

function getSessionId(): string {
  const key = 'qi_session_id';
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

export function useContentTracking(contentType: ContentType, contentId?: string) {
  const viewTracked = useRef(false);

  const track = useCallback(
    (eventType: EventType, metadata?: Record<string, unknown>) => {
      if (!contentId) return;

      // Dedupe views client-side per mount
      if (eventType === 'view') {
        if (viewTracked.current) return;
        viewTracked.current = true;
      }

      // Fire-and-forget
      supabase
        .rpc('track_content_interaction', {
          _content_type: contentType,
          _content_id: contentId,
          _event_type: eventType,
          _session_id: getSessionId(),
          _metadata: (metadata ?? {}) as any,
        })
        .then(() => {});
    },
    [contentType, contentId],
  );

  const trackView = useCallback(() => track('view'), [track]);
  const trackSave = useCallback(() => track('save'), [track]);
  const trackShare = useCallback(() => track('share'), [track]);

  return { track, trackView, trackSave, trackShare };
}