import { Link, LinkProps } from "react-router-dom";
import { useCallback, useRef } from "react";

// Map of routes to their lazy import functions
const routeImports: Record<string, () => Promise<any>> = {
  "/search": () => import("@/pages/Search"),
  "/offers": () => import("@/pages/Offers"),
  "/compare": () => import("@/pages/Compare"),
  "/profile-systems": () => import("@/pages/ProfileSystems"),
  "/projects": () => import("@/pages/Projects"),
  "/blog": () => import("@/pages/Blog"),
  "/auth": () => import("@/pages/Auth"),
  "/dashboard": () => import("@/pages/dashboard/DashboardOverview"),
  "/contracts": () => import("@/pages/Contracts"),
  "/notifications": () => import("@/pages/Notifications"),
  "/compare-profiles": () => import("@/pages/CompareProfiles"),
  "/categories": () => import("@/pages/Categories"),
  "/membership": () => import("@/pages/Membership"),
  "/about": () => import("@/pages/About"),
  "/contact": () => import("@/pages/Contact"),
};

const prefetched = new Set<string>();

/**
 * A Link that prefetches the target page's JS chunk on hover/focus.
 * Falls back to a normal Link for unknown routes.
 */
export const PrefetchLink = ({ to, onMouseEnter, onFocus, ...props }: LinkProps) => {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const prefetch = useCallback(() => {
    const path = typeof to === "string" ? to : to.pathname || "";
    if (prefetched.has(path)) return;
    const importFn = routeImports[path];
    if (importFn) {
      prefetched.add(path);
      importFn();
    }
  }, [to]);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      timerRef.current = setTimeout(prefetch, 65); // small delay to avoid prefetch on quick pass-through
      onMouseEnter?.(e);
    },
    [prefetch, onMouseEnter]
  );

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLAnchorElement>) => {
      prefetch();
      onFocus?.(e);
    },
    [prefetch, onFocus]
  );

  return (
    <Link
      to={to}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      {...props}
    />
  );
};
