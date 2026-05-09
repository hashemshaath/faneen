import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Scrolls to top on every route change and pushes a SPA page_view to GTM dataLayer */
export const RouteScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    // Push virtual page_view for GTM (SPA navigation).
    type DLWindow = Window & { dataLayer?: Array<Record<string, unknown>> };
    const w = window as DLWindow;
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({
      event: 'page_view',
      page_path: pathname + search,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, search]);

  return null;
};
