import { useLanguage } from "@/i18n/LanguageContext";
import { Mail, Phone, MapPin, Shield, Award, MessageCircle } from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";

export const FooterBrand = () => {
  const { t, isRTL } = useLanguage();

  const contactItems = [
    { icon: Mail, text: "care@qitaat.com", href: "mailto:care@qitaat.com" },
    { icon: Mail, text: "info@qitaat.com", href: "mailto:info@qitaat.com" },
    { icon: Phone, text: "+966 56 922 0777", href: "tel:+966569220777" },
    { icon: MessageCircle, text: "+966 56 922 0777", href: "https://wa.me/966569220777" },
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
          <div key={badge.label} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-primary/[0.07] border border-primary/15">
            <badge.icon aria-hidden="true" className="w-3.5 h-3.5 text-primary/85 shrink-0" />
            <span className="text-[11px] font-medium text-surface-nav-foreground/90 leading-none">{badge.label}</span>
          </div>
        ))}
      </div>

      {/* Contact info */}
      <address className="not-italic space-y-2" aria-label={isRTL ? 'بيانات التواصل' : 'Contact information'}>
        {contactItems.map((item, i) => (
          <div key={i} className="group flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-surface-nav-foreground/[0.05] flex items-center justify-center group-hover:bg-primary/10 transition-colors shrink-0">
              <item.icon aria-hidden="true" className="w-3.5 h-3.5 text-primary/80 group-hover:text-primary transition-colors" />
            </span>
            {item.href ? (
              <a href={item.href} className="text-sm text-surface-nav-foreground/90 hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-nav focus-visible:outline-none rounded tech-content">{item.text}</a>
            ) : (
              <span className="text-sm text-surface-nav-foreground/85">{item.text}</span>
            )}
          </div>
        ))}
      </address>
    </div>
  );
};
