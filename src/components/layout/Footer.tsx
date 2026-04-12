import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { FooterNewsletter } from "./footer/FooterNewsletter";
import { FooterBrand } from "./footer/FooterBrand";
import { FooterLinks } from "./footer/FooterLinks";
import { FooterBottom } from "./footer/FooterBottom";

const useInView = (threshold = 0.1) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
};

export const Footer = () => {
  const { language } = useLanguage();
  const { ref: footerRef, visible } = useInView();

  return (
    <footer ref={footerRef} role="contentinfo" aria-label={language === 'ar' ? 'تذييل الموقع' : 'Site footer'} className="relative bg-surface-nav overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 start-1/4 w-[500px] h-[500px] bg-gold/[0.02] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 end-1/4 w-[400px] h-[400px] bg-gold/[0.03] rounded-full blur-[100px]" />
      </div>

      {/* Top accent line */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

      <FooterNewsletter visible={visible} />

      {/* Main Grid */}
      <div className="container py-12 sm:py-16 px-4 sm:px-6">
        <div className={`grid grid-cols-2 md:grid-cols-5 gap-8 sm:gap-10 lg:gap-14 transition-all duration-700 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <FooterBrand />
          <FooterLinks />
        </div>
      </div>

      <FooterBottom visible={visible} />
    </footer>
  );
};
