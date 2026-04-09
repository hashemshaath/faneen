import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { Facebook, Twitter, Instagram, Youtube, Linkedin, Mail, Phone, MapPin, ArrowUp } from "lucide-react";

export const Footer = () => {
  const { t, language, isRTL } = useLanguage();

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const socialLinks = [
    { icon: Twitter, href: "#", label: "Twitter / X" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Youtube, href: "#", label: "YouTube" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
  ];

  return (
    <footer className="relative bg-primary overflow-hidden">
      {/* Decorative top border */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />

      {/* Newsletter / CTA section */}
      <div className="border-b border-primary-foreground/10">
        <div className="container py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-start">
            <h3 className="font-heading font-bold text-xl text-primary-foreground">
              {isRTL ? 'ابقَ على اطلاع بآخر المستجدات' : 'Stay updated with the latest'}
            </h3>
            <p className="font-body text-sm text-primary-foreground/50 mt-1">
              {isRTL ? 'تابعنا على وسائل التواصل الاجتماعي' : 'Follow us on social media'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {socialLinks.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-primary-foreground/15 flex items-center justify-center text-primary-foreground/50 hover:bg-gold hover:text-secondary-foreground hover:border-gold transition-all duration-300"
              >
                <s.icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div className="container py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-gold flex items-center justify-center shadow-lg shadow-gold/20">
                <span className="font-heading font-black text-lg text-secondary-foreground">ف</span>
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-primary-foreground">فنيين</h3>
                <span className="text-xs text-gold font-body">Faneen.com</span>
              </div>
            </div>
            <p className="font-body text-sm text-primary-foreground/50 leading-relaxed">
              {t('footer.desc')}
            </p>
            <div className="space-y-3 text-sm text-primary-foreground/50">
              <a href="mailto:info@faneen.com" className="flex items-center gap-2 hover:text-gold transition-colors">
                <Mail className="w-4 h-4 text-gold/70" />
                info@faneen.com
              </a>
              <a href="tel:+966500000000" className="flex items-center gap-2 hover:text-gold transition-colors">
                <Phone className="w-4 h-4 text-gold/70" />
                +966 50 000 0000
              </a>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gold/70 shrink-0" />
                <span>{isRTL ? 'المملكة العربية السعودية' : 'Saudi Arabia'}</span>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div>
            <h4 className="font-heading font-bold text-primary-foreground mb-5 flex items-center gap-2">
              <span className="w-5 h-0.5 bg-gold rounded-full" />
              {t('footer.sections')}
            </h4>
            <ul className="space-y-3 font-body text-sm text-primary-foreground/50">
              <li><a href="#" className="hover:text-gold hover:ps-1 transition-all duration-200">{t('cat.aluminum')}</a></li>
              <li><a href="#" className="hover:text-gold hover:ps-1 transition-all duration-200">{t('cat.iron')}</a></li>
              <li><a href="#" className="hover:text-gold hover:ps-1 transition-all duration-200">{t('cat.glass')}</a></li>
              <li><a href="#" className="hover:text-gold hover:ps-1 transition-all duration-200">{t('cat.wood')}</a></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-heading font-bold text-primary-foreground mb-5 flex items-center gap-2">
              <span className="w-5 h-0.5 bg-gold rounded-full" />
              {t('footer.services')}
            </h4>
            <ul className="space-y-3 font-body text-sm text-primary-foreground/50">
              <li><Link to="/projects" className="hover:text-gold hover:ps-1 transition-all duration-200">{isRTL ? 'المشاريع' : 'Projects'}</Link></li>
              <li><Link to="/blog" className="hover:text-gold hover:ps-1 transition-all duration-200">{isRTL ? 'المدونة' : 'Blog'}</Link></li>
              <li><Link to="/offers" className="hover:text-gold hover:ps-1 transition-all duration-200">{isRTL ? 'العروض' : 'Offers'}</Link></li>
              <li><a href="#" className="hover:text-gold hover:ps-1 transition-all duration-200">{t('footer.contracts')}</a></li>
              <li><a href="#" className="hover:text-gold hover:ps-1 transition-all duration-200">{t('footer.installments')}</a></li>
              <li><a href="#" className="hover:text-gold hover:ps-1 transition-all duration-200">{t('footer.warranties')}</a></li>
            </ul>
          </div>

          {/* Contact & Legal */}
          <div>
            <h4 className="font-heading font-bold text-primary-foreground mb-5 flex items-center gap-2">
              <span className="w-5 h-0.5 bg-gold rounded-full" />
              {t('footer.contact')}
            </h4>
            <ul className="space-y-3 font-body text-sm text-primary-foreground/50">
              <li><a href="#" className="hover:text-gold hover:ps-1 transition-all duration-200">{t('footer.support')}</a></li>
              <li><a href="#" className="hover:text-gold hover:ps-1 transition-all duration-200">{t('footer.partnerships')}</a></li>
              <li><a href="#" className="hover:text-gold hover:ps-1 transition-all duration-200">{t('footer.privacy')}</a></li>
              <li><a href="#" className="hover:text-gold hover:ps-1 transition-all duration-200">{t('footer.terms')}</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-primary-foreground/10">
        <div className="container py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-body text-xs text-primary-foreground/30">
            {t('footer.rights')}
          </p>
          <button
            onClick={scrollToTop}
            aria-label="Scroll to top"
            className="w-9 h-9 rounded-full border border-primary-foreground/15 flex items-center justify-center text-primary-foreground/40 hover:bg-gold hover:text-secondary-foreground hover:border-gold transition-all duration-300"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
};
