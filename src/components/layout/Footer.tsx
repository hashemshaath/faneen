import { useState, useEffect, useRef } from "react";
import { PrefetchLink } from "@/components/PrefetchLink";
import { useLanguage } from "@/i18n/LanguageContext";
import { Facebook, Twitter, Instagram, Youtube, Linkedin, Mail, Phone, MapPin, ArrowUp, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const useInView = (threshold = 0.15) => {
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
    } catch (err: any) {
      toast.error(isRTL ? "حدث خطأ، حاول مجدداً" : "Something went wrong, try again");
    } finally {
      setLoading(false);
    }
  };

  const socialLinks = [
    { icon: Twitter, href: "#", label: "Twitter / X", color: "hover:bg-[#1DA1F2]" },
    { icon: Instagram, href: "#", label: "Instagram", color: "hover:bg-[#E4405F]" },
    { icon: Facebook, href: "#", label: "Facebook", color: "hover:bg-[#1877F2]" },
    { icon: Youtube, href: "#", label: "YouTube", color: "hover:bg-[#FF0000]" },
    { icon: Linkedin, href: "#", label: "LinkedIn", color: "hover:bg-[#0A66C2]" },
  ];

  const { ref: nlRef, visible: nlVisible } = useInView();
  const { ref: gridRef, visible: gridVisible } = useInView();

  return (
    <footer className="relative bg-surface-nav overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-gold/[0.03] rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-gold/[0.04] rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gold/[0.02] rounded-full blur-3xl" />
      </div>

      {/* Decorative top border */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />

      {/* Newsletter section */}
      <div ref={nlRef} className="border-b border-primary-foreground/10 relative">
        <div className={`container py-12 transition-all duration-700 ${nlVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="relative rounded-2xl bg-gradient-to-br from-gold/10 via-gold/5 to-transparent border border-gold/15 p-8 md:p-10 overflow-hidden">
            {/* Sparkle decorations */}
            <Sparkles className="absolute top-4 right-6 w-5 h-5 text-gold/20 animate-pulse" />
            <Sparkles className="absolute bottom-6 left-8 w-4 h-4 text-gold/15 animate-pulse [animation-delay:1s]" />

            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="text-center lg:text-start flex-1">
                <h3 className="font-heading font-bold text-xl md:text-2xl text-surface-nav-foreground">
                  {isRTL ? '📬 اشترك في نشرتنا البريدية' : '📬 Subscribe to our newsletter'}
                </h3>
                <p className="font-body text-sm text-surface-nav-foreground/50 mt-2 max-w-md">
                  {isRTL
                    ? 'احصل على آخر الأخبار والعروض والنصائح مباشرة في بريدك الإلكتروني'
                    : 'Get the latest news, offers, and tips delivered directly to your inbox'}
                </p>
              </div>

              <form onSubmit={handleSubscribe} className="flex w-full lg:w-auto max-w-md gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-surface-nav-foreground/30 pointer-events-none" />
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={isRTL ? "بريدك الإلكتروني..." : "Your email..."}
                    className="ps-10 bg-surface-nav-foreground/5 border-primary-foreground/15 text-surface-nav-foreground placeholder:text-surface-nav-foreground/30 focus:border-gold/50 focus:ring-gold/20 h-11"
                    dir="ltr"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={subscribed || loading}
                  className={`h-11 px-5 gap-2 font-bold transition-all duration-500 ${
                    subscribed
                      ? 'bg-green-500 hover:bg-green-500 text-white scale-105'
                      : 'bg-gradient-gold text-secondary-foreground hover:shadow-lg hover:shadow-gold/25 hover:scale-[1.03]'
                  }`}
                >
                  {subscribed ? (
                    <>✓ {isRTL ? 'تم!' : 'Done!'}</>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {isRTL ? 'اشترك' : 'Subscribe'}
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Social links bar */}
      <div className="border-b border-primary-foreground/10">
        <div className={`container py-6 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-700 delay-200 ${nlVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="font-body text-sm text-surface-nav-foreground/50">
            {isRTL ? 'تابعنا على وسائل التواصل الاجتماعي' : 'Follow us on social media'}
          </p>
          <div className="flex items-center gap-2">
            {socialLinks.map((s, i) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-10 h-10 rounded-full border border-primary-foreground/15 flex items-center justify-center text-surface-nav-foreground/50 ${s.color} hover:text-white hover:border-transparent hover:scale-110 transition-all duration-300`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <s.icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div ref={gridRef} className="container py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className={`space-y-5 transition-all duration-700 ${gridVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center shadow-lg shadow-gold/20 group-hover:scale-110 group-hover:shadow-gold/40 transition-all duration-300">
                <span className="font-heading font-black text-lg text-secondary-foreground">ف</span>
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-surface-nav-foreground">فنيين</h3>
                <span className="text-xs text-gold font-body">Faneen.com</span>
              </div>
            </div>
            <p className="font-body text-sm text-surface-nav-foreground/50 leading-relaxed">
              {t('footer.desc')}
            </p>
            <div className="space-y-3 text-sm text-surface-nav-foreground/50">
              <a href="mailto:info@faneen.com" className="flex items-center gap-2 hover:text-gold transition-colors group/link">
                <Mail className="w-4 h-4 text-gold/70 group-hover/link:scale-110 transition-transform" />
                info@faneen.com
              </a>
              <a href="tel:+966500000000" className="flex items-center gap-2 hover:text-gold transition-colors group/link">
                <Phone className="w-4 h-4 text-gold/70 group-hover/link:scale-110 transition-transform" />
                +966 50 000 0000
              </a>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gold/70 shrink-0" />
                <span>{isRTL ? 'المملكة العربية السعودية' : 'Saudi Arabia'}</span>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className={`transition-all duration-700 delay-100 ${gridVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <h4 className="font-heading font-bold text-surface-nav-foreground mb-5 flex items-center gap-2">
              <span className="w-5 h-0.5 bg-gold rounded-full" />
              {t('footer.sections')}
            </h4>
            <ul className="space-y-3 font-body text-sm text-surface-nav-foreground/50">
              <li><a href="#" className="hover:text-gold hover:ps-1 transition-all duration-200">{t('cat.aluminum')}</a></li>
              <li><a href="#" className="hover:text-gold hover:ps-1 transition-all duration-200">{t('cat.iron')}</a></li>
              <li><a href="#" className="hover:text-gold hover:ps-1 transition-all duration-200">{t('cat.glass')}</a></li>
              <li><a href="#" className="hover:text-gold hover:ps-1 transition-all duration-200">{t('cat.wood')}</a></li>
            </ul>
          </div>

          {/* Services */}
          <div className={`transition-all duration-700 delay-200 ${gridVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <h4 className="font-heading font-bold text-surface-nav-foreground mb-5 flex items-center gap-2">
              <span className="w-5 h-0.5 bg-gold rounded-full" />
              {t('footer.services')}
            </h4>
            <ul className="space-y-3 font-body text-sm text-surface-nav-foreground/50">
              <li><PrefetchLink to="/projects" className="hover:text-gold hover:ps-1 transition-all duration-200">{isRTL ? 'المشاريع' : 'Projects'}</PrefetchLink></li>
              <li><PrefetchLink to="/blog" className="hover:text-gold hover:ps-1 transition-all duration-200">{isRTL ? 'المدونة' : 'Blog'}</PrefetchLink></li>
              <li><PrefetchLink to="/offers" className="hover:text-gold hover:ps-1 transition-all duration-200">{isRTL ? 'العروض' : 'Offers'}</PrefetchLink></li>
              <li><a href="#" className="hover:text-gold hover:ps-1 transition-all duration-200">{t('footer.contracts')}</a></li>
              <li><a href="#" className="hover:text-gold hover:ps-1 transition-all duration-200">{t('footer.installments')}</a></li>
              <li><a href="#" className="hover:text-gold hover:ps-1 transition-all duration-200">{t('footer.warranties')}</a></li>
            </ul>
          </div>

          {/* Contact & Legal */}
          <div className={`transition-all duration-700 delay-300 ${gridVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <h4 className="font-heading font-bold text-surface-nav-foreground mb-5 flex items-center gap-2">
              <span className="w-5 h-0.5 bg-gold rounded-full" />
              {t('footer.contact')}
            </h4>
            <ul className="space-y-3 font-body text-sm text-surface-nav-foreground/50">
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
          <p className="font-body text-xs text-surface-nav-foreground/30">
            {t('footer.rights')}
          </p>
          <button
            onClick={scrollToTop}
            aria-label="Scroll to top"
            className="w-10 h-10 rounded-full border border-primary-foreground/15 flex items-center justify-center text-surface-nav-foreground/40 hover:bg-gold hover:text-secondary-foreground hover:border-gold hover:scale-110 hover:-translate-y-1 transition-all duration-300"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
};
