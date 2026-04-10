import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { ArrowLeft, ArrowRight, Sparkles, Shield, Zap } from "lucide-react";

export const CTASection = () => {
  const { isRTL } = useLanguage();
  const { ref: visRef, isVisible } = useScrollAnimation();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section ref={visRef} className="py-16 sm:py-24 bg-background relative overflow-hidden">
      <div className="container px-4 sm:px-6">
        <div
          className={`relative rounded-3xl overflow-hidden bg-gradient-navy p-8 sm:p-12 md:p-16 text-center ${isVisible ? 'animate-fade-in' : 'opacity-0'}`}
        >
          {/* Decorative elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 start-0 w-72 h-72 bg-accent/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 end-0 w-96 h-96 bg-accent/5 rounded-full blur-[120px]" />
            <div className="absolute inset-0 -translate-x-full hover:translate-x-full transition-transform duration-[3000ms] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>

          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/15 text-accent text-xs sm:text-sm font-body font-semibold mb-4 sm:mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              {isRTL ? 'انضم إلينا اليوم' : 'Join Us Today'}
            </div>

            <h2 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl text-surface-nav-foreground mb-4 sm:mb-6">
              {isRTL ? 'ابدأ رحلتك مع فنيين' : 'Start Your Journey with Faneen'}
            </h2>
            <p className="font-body text-sm sm:text-base text-surface-nav-foreground/60 mb-6 sm:mb-8 max-w-lg mx-auto">
              {isRTL
                ? 'سواء كنت تبحث عن مزود خدمة أو ترغب في عرض خدماتك، فنيين هو المكان الأمثل لك'
                : 'Whether you\'re looking for a service provider or want to showcase your services, Faneen is the perfect place for you'}
            </p>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mb-6 sm:mb-8">
              {[
                { icon: Shield, textAr: 'عقود محمية', textEn: 'Protected Contracts' },
                { icon: Zap, textAr: 'تسجيل فوري', textEn: 'Instant Signup' },
                { icon: Sparkles, textAr: 'مجاناً للبدء', textEn: 'Free to Start' },
              ].map((item) => (
                <div key={item.textEn} className="flex items-center gap-1.5 text-surface-nav-foreground/50 text-xs sm:text-sm">
                  <item.icon className="w-4 h-4 text-accent" />
                  <span>{isRTL ? item.textAr : item.textEn}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link to="/auth">
                <Button variant="hero" size="lg" className="px-8 sm:px-10 gap-2 shadow-lg shadow-accent/30 active:scale-95 transition-transform">
                  {isRTL ? 'سجّل الآن مجاناً' : 'Sign Up for Free'}
                  <ArrowIcon className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/search">
                <Button variant="heroOutline" size="lg" className="px-8 sm:px-10 gap-2 active:scale-95 transition-transform">
                  {isRTL ? 'تصفح المزودين' : 'Browse Providers'}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
