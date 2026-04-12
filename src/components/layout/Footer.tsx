import { useState, useEffect, useRef } from "react";
import { PrefetchLink } from "@/components/PrefetchLink";
import { useLanguage } from "@/i18n/LanguageContext";
import { Facebook, Twitter, Instagram, Youtube, Linkedin, Mail, Phone, MapPin, ArrowUp, Send, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  const { t, language, isRTL } = useLanguage();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(isRTL ? "يرجى إدخال بريد إلكتروني صالح" : "Please enter a valid email");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .upsert({ email: email.trim().toLowerCase(), is_active: true, unsubscribed_at: null }, { onConflict: 'email' });
      if (error) throw error;
      setSubscribed(true);
      toast.success(isRTL ? "تم الاشتراك بنجاح! 🎉" : "Subscribed successfully! 🎉");
      setEmail("");
      setTimeout(() => setSubscribed(false), 4000);
    } catch {
      toast.error(isRTL ? "حدث خطأ، حاول مجدداً" : "Something went wrong, try again");
    } finally {
      setLoading(false);
    }
  };

  const socialLinks = [
    { icon: Twitter, href: "#", label: "X" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Youtube, href: "#", label: "YouTube" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
  ];

  const { ref: footerRef, visible } = useInView();

  return (
    <footer ref={footerRef} className="relative bg-surface-nav overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 start-1/4 w-[500px] h-[500px] bg-gold/[0.02] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 end-1/4 w-[400px] h-[400px] bg-gold/[0.03] rounded-full blur-[100px]" />
      </div>

      {/* Top accent line */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

      {/* ═══ Newsletter CTA ═══ */}
      <div className="relative border-b border-surface-nav-foreground/[0.06]">
        <div className={`container py-10 sm:py-14 px-4 sm:px-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-br from-gold/[0.08] to-gold/[0.02] border border-gold/10 p-6 sm:p-10 md:p-12 overflow-hidden">
            {/* Pattern dots */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
              style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--gold)) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            <Sparkles className="absolute top-5 end-6 w-6 h-6 text-gold/15 animate-pulse hidden md:block" />

            <div className="relative flex flex-col lg:flex-row items-center gap-6 lg:gap-12">
              <div className="text-center lg:text-start flex-1 space-y-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-gold uppercase tracking-wider">
                  <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {isRTL ? 'النشرة البريدية' : 'Newsletter'}
                </span>
                <h3 className="font-heading font-bold text-xl sm:text-2xl md:text-3xl text-surface-nav-foreground leading-tight">
                  {isRTL ? 'ابقَ على اطلاع بأحدث الأخبار' : 'Stay up to date with the latest'}
                </h3>
                <p className="font-body text-xs sm:text-sm text-surface-nav-foreground/40 max-w-lg">
                  {isRTL
                    ? 'احصل على آخر الأخبار والعروض الحصرية والنصائح المهنية مباشرة في بريدك'
                    : 'Get the latest news, exclusive offers, and professional tips delivered to your inbox'}
                </p>
              </div>

              <form onSubmit={handleSubscribe} className="flex w-full lg:w-auto lg:min-w-[380px] gap-2.5">
                <div className="relative flex-1">
                  <Mail className="absolute top-1/2 -translate-y-1/2 start-3.5 w-4 h-4 text-surface-nav-foreground/25 pointer-events-none" />
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={isRTL ? "بريدك الإلكتروني..." : "Your email address..."}
                    className="ps-10 bg-surface-nav-foreground/[0.06] border-surface-nav-foreground/10 text-surface-nav-foreground placeholder:text-surface-nav-foreground/25 focus:border-gold/40 focus:ring-gold/15 h-11 sm:h-12 text-sm rounded-xl"
                    dir="ltr"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={subscribed || loading}
                  className={`h-11 sm:h-12 px-5 sm:px-6 gap-2 font-bold text-sm rounded-xl transition-all duration-500 shrink-0 ${
                    subscribed
                      ? 'bg-emerald-500 hover:bg-emerald-500 text-white scale-105'
                      : 'bg-gradient-gold text-secondary-foreground hover:shadow-lg hover:shadow-gold/25 hover:scale-[1.02]'
                  }`}
                >
                  {subscribed ? (
                    <>✓ {isRTL ? 'تم!' : 'Done!'}</>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline">{isRTL ? 'اشتراك' : 'Subscribe'}</span>
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Main Grid ═══ */}
      <div className="container py-12 sm:py-16 px-4 sm:px-6">
        <div className={`grid grid-cols-2 md:grid-cols-5 gap-8 sm:gap-10 lg:gap-14 transition-all duration-700 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

          {/* Brand column */}
          <div className="col-span-2 space-y-5">
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

            {/* Contact info */}
            <div className="space-y-2.5">
              {[
                { icon: Mail, text: "info@faneen.com", href: "mailto:info@faneen.com" },
                { icon: Phone, text: "+966 50 000 0000", href: "tel:+966500000000" },
                { icon: MapPin, text: isRTL ? 'المملكة العربية السعودية' : 'Saudi Arabia' },
              ].map((item, i) => (
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

          {/* Sections */}
          <div>
            <h4 className="font-heading font-bold text-sm text-surface-nav-foreground mb-5 pb-2 border-b border-surface-nav-foreground/[0.06]">
              {t('footer.sections')}
            </h4>
            <ul className="space-y-3 font-body text-[13px] text-surface-nav-foreground/40">
              {[
                { label: t('cat.aluminum'), to: '/search?category=aluminum' },
                { label: t('cat.iron'), to: '/search?category=iron' },
                { label: t('cat.glass'), to: '/search?category=glass' },
                { label: t('cat.wood'), to: '/search?category=wood' },
              ].map((item, i) => (
                <li key={i}>
                  <PrefetchLink to={item.to} className="group flex items-center gap-1.5 hover:text-gold transition-all duration-200">
                    <span className="w-1 h-1 rounded-full bg-gold/30 group-hover:bg-gold group-hover:scale-150 transition-all" />
                    {item.label}
                  </PrefetchLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-heading font-bold text-sm text-surface-nav-foreground mb-5 pb-2 border-b border-surface-nav-foreground/[0.06]">
              {t('footer.services')}
            </h4>
            <ul className="space-y-3 font-body text-[13px] text-surface-nav-foreground/40">
              {[
                { label: isRTL ? 'المشاريع' : 'Projects', to: '/projects' },
                { label: isRTL ? 'المدونة' : 'Blog', to: '/blog' },
                { label: isRTL ? 'العروض' : 'Offers', to: '/offers' },
                { label: t('footer.contracts'), to: '/contracts' },
              ].map((item, i) => (
                <li key={i}>
                  <PrefetchLink to={item.to} className="group flex items-center gap-1.5 hover:text-gold transition-all duration-200">
                    <span className="w-1 h-1 rounded-full bg-gold/30 group-hover:bg-gold group-hover:scale-150 transition-all" />
                    {item.label}
                  </PrefetchLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Legal */}
          <div>
            <h4 className="font-heading font-bold text-sm text-surface-nav-foreground mb-5 pb-2 border-b border-surface-nav-foreground/[0.06]">
              {t('footer.contact')}
            </h4>
            <ul className="space-y-3 font-body text-[13px] text-surface-nav-foreground/40">
              {[
                { label: t('footer.support'), to: '/contact' },
                { label: t('footer.partnerships'), to: '/about' },
                { label: t('footer.privacy'), to: '/privacy' },
                { label: t('footer.terms'), to: '/terms' },
              ].map((item, i) => (
                <li key={i}>
                  <PrefetchLink to={item.to} className="group flex items-center gap-1.5 hover:text-gold transition-all duration-200">
                    <span className="w-1 h-1 rounded-full bg-gold/30 group-hover:bg-gold group-hover:scale-150 transition-all" />
                    {item.label}
                  </PrefetchLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ═══ Bottom Bar ═══ */}
      <div className="border-t border-surface-nav-foreground/[0.06]">
        <div className={`container py-5 sm:py-6 px-4 sm:px-6 transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <p className="font-body text-[11px] sm:text-xs text-surface-nav-foreground/25 order-2 sm:order-1">
              {t('footer.rights')}
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-1.5 order-1 sm:order-2">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-surface-nav-foreground/[0.04] border border-surface-nav-foreground/[0.06] flex items-center justify-center text-surface-nav-foreground/35 hover:bg-gold/15 hover:text-gold hover:border-gold/20 hover:scale-110 transition-all duration-300"
                >
                  <s.icon className="w-3.5 h-3.5" />
                </a>
              ))}

              {/* Divider */}
              <div className="w-px h-5 bg-surface-nav-foreground/[0.08] mx-1.5" />

              {/* Scroll to top */}
              <button
                onClick={scrollToTop}
                aria-label="Scroll to top"
                className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/15 flex items-center justify-center text-gold/60 hover:bg-gold hover:text-secondary-foreground hover:border-gold hover:scale-110 hover:-translate-y-0.5 transition-all duration-300"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
