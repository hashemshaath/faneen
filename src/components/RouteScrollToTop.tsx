import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { pushPageView } from "@/lib/gtm";

/** Scrolls to top (or to a #hash anchor) on route change and pushes a SPA page_view to GTM. */
export const RouteScrollToTop = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Defer one frame so the target element exists in the DOM after route change.
      const id = hash.slice(1);
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else window.scrollTo(0, 0);
      });
    } else {
      window.scrollTo(0, 0);
    }
    // Push virtual page_view for GTM (SPA navigation). No-op if GTM disabled.
    pushPageView(pathname + search);
  }, [pathname, search, hash]);

  return null;
};
