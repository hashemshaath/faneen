import { useEffect, useRef } from "react";

/**
 * Applies a parallax translateY effect to the referenced element based on scroll position.
 * @param speed - Multiplier for the parallax effect (0 = no movement, 0.5 = half scroll speed)
 */
export function useParallax<T extends HTMLElement = HTMLDivElement>(speed = 0.15) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

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

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // initial position
    return () => window.removeEventListener("scroll", handleScroll);
  }, [speed]);

  return ref;
}
