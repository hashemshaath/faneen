import { useEffect, useRef } from "react";

/**
 * Applies a parallax translateY effect to the referenced element based on scroll position.
 * Honors `prefers-reduced-motion`. Scroll listener is only attached while the
 * element is intersecting the viewport (saves work once the user scrolls away).
 * @param speed - Multiplier for the parallax effect (0 = no movement, 0.5 = half scroll speed)
 */
export function useParallax<T extends HTMLElement = HTMLDivElement>(speed = 0.15) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const windowH = window.innerHeight;
        // Only apply when element is in/near viewport
        if (rect.bottom > -100 && rect.top < windowH + 100) {
          const center = rect.top + rect.height / 2 - windowH / 2;
          el.style.transform = `translateY(${center * speed}px)`;
        }
        ticking = false;
      });
    };

    let attached = false;
    const attach = () => {
      if (attached) return;
      window.addEventListener("scroll", handleScroll, { passive: true });
      attached = true;
      handleScroll();
    };
    const detach = () => {
      if (!attached) return;
      window.removeEventListener("scroll", handleScroll);
      attached = false;
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) attach();
        else detach();
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      detach();
    };
  }, [speed]);

  return ref;
}
