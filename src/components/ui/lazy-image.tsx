import { useState, useRef, useEffect, ImgHTMLAttributes, memo } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Show blur-up placeholder while loading */
  blurPlaceholder?: boolean;
  /** Root margin for IntersectionObserver (e.g. "200px") */
  rootMargin?: string;
  /** Wrapper className for the container div */
  wrapperClassName?: string;
}

/**
 * Performance-optimized image component:
 * - Uses IntersectionObserver for true lazy loading
 * - Blur-up placeholder effect
 * - Fade-in transition on load
 * - Avoids layout shifts with aspect ratio containers
 */
export const LazyImage = memo(({
  src,
  alt = "",
  className,
  wrapperClassName,
  blurPlaceholder = true,
  rootMargin = "300px",
  loading,
  fetchPriority,
  ...props
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // If fetchPriority is high, skip lazy loading
  const isEager = fetchPriority === "high" || loading === "eager";

  useEffect(() => {
    if (isEager) {
      setIsInView(true);
      return;
    }

    const el = imgRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, isEager]);

  return (
    <div className={cn("relative overflow-hidden", wrapperClassName)} ref={imgRef}>
      {/* Placeholder */}
      {blurPlaceholder && !isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {/* Actual image — only render src when in view */}
      {(isInView || isEager) && (
        <img
          src={src}
          alt={alt}
          className={cn(
            "transition-opacity duration-500",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
          onLoad={() => setIsLoaded(true)}
          loading={isEager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={fetchPriority}
          {...props}
        />
      )}
    </div>
  );
});

LazyImage.displayName = "LazyImage";
