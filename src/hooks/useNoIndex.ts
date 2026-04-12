import { useEffect } from 'react';

/**
 * Sets noindex meta tag for private pages (dashboard, admin).
 * Call at the top of any protected page component.
 */
export function useNoIndex() {
  useEffect(() => {
    let el = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', 'robots');
      document.head.appendChild(el);
    }
    el.setAttribute('content', 'noindex, nofollow');

    return () => {
      // Restore default on unmount
      if (el) {
        el.setAttribute('content', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
      }
    };
  }, []);
}
