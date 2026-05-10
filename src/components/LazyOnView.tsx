import { useEffect, useRef, useState, ReactNode } from "react";

interface LazyOnViewProps {
  /** Children rendered only after the placeholder enters (or nears) the viewport. */
  children: ReactNode;
  /** Reserved height while idle to prevent CLS. */
  minHeight?: number;
  /** IntersectionObserver rootMargin — defaults to a generous 400px. */
  rootMargin?: string;
  /** Optional placeholder to render while waiting. */
  fallback?: ReactNode;
  /** Optional className for the placeholder wrapper. */
  className?: string;
}

/**
 * Defers mounting (and thus the lazy-chunk download for any lazy() child)
 * until the placeholder approaches the viewport. Combined with React.lazy
 * children this prevents the whole below-the-fold tree from appearing in
 * the page's critical request graph.
 */
export const LazyOnView = ({
  children,
  minHeight = 480,
  rootMargin = "400px 0px",
  fallback = null,
  className,
}: LazyOnViewProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, rootMargin]);

  if (shown) return <>{children}</>;
  return (
    <div
      ref={ref}
      className={className}
      style={{ minHeight, contain: "layout paint" }}
      aria-hidden="true"
    >
      {fallback}
    </div>
  );
};

export default LazyOnView;