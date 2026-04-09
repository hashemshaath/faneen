import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from 0 to `end` when `start` becomes true.
 * Returns the current display value as a formatted string.
 */
export function useCountUp(end: number, start: boolean, duration = 2000, suffix = "") {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!start) {
      setValue(0);
      return;
    }

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * end));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [start, end, duration]);

  return value.toLocaleString() + suffix;
}
