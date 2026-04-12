import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Scrolls to top on every route change */
export const RouteScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};
