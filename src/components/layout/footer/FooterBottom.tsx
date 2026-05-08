import { useLanguage } from "@/i18n/LanguageContext";
import { Facebook, Twitter, Instagram, Youtube, Linkedin, ArrowUp } from "lucide-react";

const socialLinks = [
  { icon: Twitter, href: "#", label: "X" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Youtube, href: "#", label: "YouTube" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
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

          {/* Social icons — uniform 44px on mobile, 36px desktop */}
          <div className="flex items-center gap-2 order-1 sm:order-2">
            {socialLinks.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 sm:w-9 sm:h-9 rounded-full bg-surface-nav-foreground/[0.06] border border-surface-nav-foreground/15 flex items-center justify-center text-surface-nav-foreground/85 hover:bg-gold/15 hover:text-gold hover:border-gold/35 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
              >
                <s.icon className="w-4 h-4" />
              </a>
            ))}

            <div className="w-px h-6 bg-surface-nav-foreground/[0.12] mx-1" />

            <button
              onClick={scrollToTop}
              aria-label={isRTL ? 'العودة إلى الأعلى' : 'Scroll to top'}
              className="w-11 h-11 sm:w-9 sm:h-9 rounded-full bg-gold/10 border border-gold/25 flex items-center justify-center text-gold hover:bg-gold hover:text-secondary-foreground hover:border-gold transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
