import { ArrowUp } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

export const ScrollToTop = () => {
  const [visible, setVisible] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 400);
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollPercent(docHeight > 0 ? Math.min((window.scrollY / docHeight) * 100, 100) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollUp = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (scrollPercent / 100) * circumference;

  return (
    <button
      onClick={scrollUp}
      aria-label="العودة للأعلى"
      className={`fixed bottom-6 start-6 z-50 w-12 h-12 rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/30 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
        <circle
          cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-200"
        />
      </svg>
      <ArrowUp className="w-4.5 h-4.5 relative z-10 group-hover:-translate-y-0.5 transition-transform" />
    </button>
  );
};
