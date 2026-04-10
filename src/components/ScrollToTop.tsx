import { ArrowUp } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

export const ScrollToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollUp = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <button
      onClick={scrollUp}
      aria-label="العودة للأعلى"
      className={`fixed bottom-6 start-6 z-50 w-11 h-11 rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/30 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
};
