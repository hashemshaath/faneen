import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { FooterNewsletter } from "./footer/FooterNewsletter";
import { FooterBrand } from "./footer/FooterBrand";
import { FooterLinks } from "./footer/FooterLinks";
import { FooterBottom } from "./footer/FooterBottom";
import { MobileFooter } from "./footer/MobileFooter";
import { WhatsAppFab } from "@/components/common/WhatsAppFab";

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
    <>
    <footer
      ref={footerRef}
      role="contentinfo"
      aria-label={language === 'ar' ? 'تذييل الموقع' : 'Site footer'}
      className="relative bg-surface-nav overflow-hidden"
      // Brand spec: footer is a single dark navy block (#131722) with light text.
      // Locally override the surface-nav tokens so all child styles
      // (text-surface-nav-foreground, bg-surface-nav-foreground/* …) flip
      // to white-on-navy without touching the global navbar surface.
      style={{
        ['--surface-nav' as string]: '222 27% 10%',
        ['--surface-nav-foreground' as string]: '0 0% 100%',
      }}
    >
      {/* Top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      {/* Mobile: compact footer */}
      <MobileFooter />

      {/* Tablet & Desktop: full footer */}
      <div className="hidden md:block">
        <FooterNewsletter visible={visible} />
        <div className="container-app py-10 sm:py-12 lg:py-14">
          <div className={`grid grid-cols-2 md:grid-cols-5 gap-y-8 gap-x-6 sm:gap-x-8 lg:gap-x-12 transition-all duration-700 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <FooterBrand />
            <FooterLinks />
          </div>
        </div>
        <FooterBottom visible={visible} />
      </div>
    </footer>
  );
};
