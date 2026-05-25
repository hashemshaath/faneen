import { useLanguage } from "@/i18n/LanguageContext";
import { Facebook, Twitter, Instagram, Youtube, Linkedin, ArrowUp } from "lucide-react";

const socialLinks = [
  { icon: Twitter, href: "https://x.com/qitaatcom", label: "X" },
  { icon: Instagram, href: "https://instagram.com/qitaatcom", label: "Instagram" },
  { icon: Facebook, href: "https://facebook.com/qitaatcom", label: "Facebook" },
  { icon: Youtube, href: "https://youtube.com/@qitaatcom", label: "YouTube" },
  { icon: Linkedin, href: "https://linkedin.com/company/qitaatcom", label: "LinkedIn" },
];

export const FooterBottom = ({ visible }: { visible: boolean }) => {
  const { t, isRTL } = useLanguage();
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className="border-t border-surface-nav-foreground/[0.08]">
      <div className={`container-app py-5 sm:py-6 safe-pb transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
          {/* Copyright & extra links */}
          <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-4 order-2 sm:order-1 text-center sm:text-start">
            <p className="font-body text-xs text-surface-nav-foreground/75 leading-snug">
              {t('footer.rights')}
            </p>
            <div className="hidden sm:block w-px h-3 bg-surface-nav-foreground/15" />
            <p className="font-body text-xs text-surface-nav-foreground/65 leading-snug">
              {isRTL ? 'صُنع بـ ❤️ في السعودية' : 'Made with ❤️ in Saudi Arabia'}
            </p>
          </div>

          {/* Social icons — 36px on very small phones (320px), 40px standard mobile, 36px desktop */}
          <div className="flex items-center gap-1.5 sm:gap-2 order-1 sm:order-2">
            {socialLinks.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                target="_blank"
                rel="noopener noreferrer"
                data-tappable
                className="w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-surface-nav-foreground/[0.06] border border-surface-nav-foreground/15 flex items-center justify-center text-surface-nav-foreground/85 hover:bg-primary/15 hover:text-primary hover:border-primary/35 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <s.icon className="w-4 h-4" />
              </a>
            ))}

            <div className="w-px h-5 bg-surface-nav-foreground/[0.12] mx-0.5 sm:mx-1" />

            <button
              onClick={scrollToTop}
              aria-label={isRTL ? 'العودة إلى الأعلى' : 'Scroll to top'}
              className="w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center text-primary hover:bg-primary hover:text-secondary-foreground hover:border-primary transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
