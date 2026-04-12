import { useLanguage } from "@/i18n/LanguageContext";
import { Mail, Phone, MapPin, Shield, Award } from "lucide-react";

export const FooterBrand = () => {
  const { t, isRTL } = useLanguage();

  const contactItems = [
    { icon: Mail, text: "info@faneen.com", href: "mailto:info@faneen.com" },
    { icon: Phone, text: "+966 50 000 0000", href: "tel:+966500000000" },
    { icon: MapPin, text: isRTL ? 'المملكة العربية السعودية' : 'Saudi Arabia' },
  ];

  const badges = [
    { icon: Shield, label: isRTL ? 'منصة موثوقة' : 'Trusted Platform' },
    { icon: Award, label: isRTL ? 'خدمة معتمدة' : 'Certified Service' },
  ];

  return (
    <div className="col-span-2 space-y-6">
      {/* Logo */}
      <div className="flex items-center gap-3 group">
        <div className="w-12 h-12 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-lg shadow-gold/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-400">
          <span className="font-heading font-black text-lg text-secondary-foreground">ف</span>
        </div>
        <div>
          <h3 className="font-heading font-bold text-xl text-surface-nav-foreground tracking-tight">فنيين</h3>
          <span className="text-[11px] text-gold/70 font-body tracking-wide">Faneen.com</span>
        </div>
      </div>

      <p className="font-body text-[13px] text-surface-nav-foreground/40 leading-relaxed max-w-xs">
        {t('footer.desc')}
      </p>

      {/* Trust badges */}
      <div className="flex items-center gap-3">
        {badges.map((badge) => (
          <div key={badge.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold/[0.06] border border-gold/10">
            <badge.icon className="w-3.5 h-3.5 text-gold/70" />
            <span className="text-[11px] font-medium text-surface-nav-foreground/50">{badge.label}</span>
          </div>
        ))}
      </div>

      {/* Contact info */}
      <div className="space-y-2.5">
        {contactItems.map((item, i) => (
          <div key={i} className="group flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-surface-nav-foreground/[0.05] flex items-center justify-center group-hover:bg-gold/10 transition-colors">
              <item.icon className="w-3.5 h-3.5 text-gold/60 group-hover:text-gold transition-colors" />
            </span>
            {item.href ? (
              <a href={item.href} className="text-xs sm:text-[13px] text-surface-nav-foreground/45 hover:text-gold transition-colors">{item.text}</a>
            ) : (
              <span className="text-xs sm:text-[13px] text-surface-nav-foreground/45">{item.text}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
