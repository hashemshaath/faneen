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
    <div className="border-t border-surface-nav-foreground/[0.06]">
      <div className={`container py-5 sm:py-6 px-4 sm:px-6 safe-min-pb transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Copyright & extra links */}
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 order-2 sm:order-1">
            <p className="font-body text-[11px] sm:text-xs text-surface-nav-foreground/70">
              {t('footer.rights')}
            </p>
            <div className="hidden sm:block w-px h-3 bg-surface-nav-foreground/10" />
            <p className="font-body text-[10px] text-surface-nav-foreground/70">
              {isRTL ? 'صُنع بـ ❤️ في السعودية' : 'Made with ❤️ in Saudi Arabia'}
            </p>
          </div>

          {/* Social icons */}
          <div className="flex items-center gap-1.5 order-1 sm:order-2">
            {socialLinks.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 sm:w-9 sm:h-9 rounded-xl bg-surface-nav-foreground/[0.06] border border-surface-nav-foreground/20 flex items-center justify-center text-surface-nav-foreground/85 hover:bg-gold/15 hover:text-gold hover:border-gold/30 hover:scale-110 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
              >
                <s.icon className="ic-sm" />
              </a>
            ))}

            <div className="w-px h-5 bg-surface-nav-foreground/[0.08] mx-1.5" />

            <button
              onClick={scrollToTop}
              aria-label={isRTL ? 'العودة إلى الأعلى' : 'Scroll to top'}
              className="w-11 h-11 sm:w-9 sm:h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold/85 hover:bg-gold hover:text-secondary-foreground hover:border-gold hover:scale-110 hover:-translate-y-0.5 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
            >
              <ArrowUp className="ic-sm" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
