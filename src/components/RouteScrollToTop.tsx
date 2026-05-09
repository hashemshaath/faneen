import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { pushPageView } from "@/lib/gtm";

/** Scrolls to top on every route change and pushes a SPA page_view to GTM dataLayer */
export const RouteScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    // Push virtual page_view for GTM (SPA navigation). No-op if GTM disabled.
    pushPageView(pathname + search);
  }, [pathname, search]);

  return null;
};
