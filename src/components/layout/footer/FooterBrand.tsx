import { useLanguage } from "@/i18n/LanguageContext";
import { Mail, Phone, MapPin, Shield, Award } from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";

export const FooterBrand = () => {
  const { t, isRTL } = useLanguage();

  const contactItems = [
    { icon: Mail, text: "info@qitaat.com", href: "mailto:info@qitaat.com" },
    { icon: Phone, text: "+966 50 000 0000", href: "tel:+966500000000" },
    { icon: MapPin, text: isRTL ? 'المملكة العربية السعودية' : 'Saudi Arabia' },
  ];

  const badges = [
    { icon: Shield, label: isRTL ? 'منصة موثوقة' : 'Trusted Platform' },
    { icon: Award, label: isRTL ? 'خدمة معتمدة' : 'Certified Service' },
  ];

  return (
    <div className="col-span-2 space-y-5">
      {/* Logo */}
      <div className="flex items-center group">
        <BrandLogo
          variant="full"
          tone="dark"
          size="footer"
          alt={isRTL ? 'قِطاعات — الصفحة الرئيسية' : 'Qitaat — Home'}
          imgClassName="transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>

      <p className="font-body text-sm text-surface-nav-foreground/80 leading-relaxed max-w-sm">
        {t('footer.desc')}
      </p>

      {/* Trust badges */}
      <div className="flex flex-wrap items-center gap-2">
        {badges.map((badge) => (
          <div key={badge.label} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-gold/[0.07] border border-gold/15">
            <badge.icon aria-hidden="true" className="w-3.5 h-3.5 text-gold/85 shrink-0" />
            <span className="text-[11px] font-medium text-surface-nav-foreground/90 leading-none">{badge.label}</span>
          </div>
        ))}
      </div>

      {/* Contact info */}
      <address className="not-italic space-y-2" aria-label={isRTL ? 'بيانات التواصل' : 'Contact information'}>
        {contactItems.map((item, i) => (
          <div key={i} className="group flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-surface-nav-foreground/[0.05] flex items-center justify-center group-hover:bg-gold/10 transition-colors shrink-0">
              <item.icon aria-hidden="true" className="w-3.5 h-3.5 text-gold/80 group-hover:text-gold transition-colors" />
            </span>
            {item.href ? (
              <a href={item.href} className="text-sm text-surface-nav-foreground/90 hover:text-gold transition-colors focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface-nav focus-visible:outline-none rounded tech-content">{item.text}</a>
            ) : (
              <span className="text-sm text-surface-nav-foreground/85">{item.text}</span>
            )}
          </div>
        ))}
      </address>
    </div>
  );
};
