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
    <section ref={visRef} className="py-16 sm:py-28 bg-background relative overflow-hidden">
      <div className="container px-4 sm:px-6">
        <div
          className={`relative rounded-3xl overflow-hidden bg-gradient-navy p-10 sm:p-14 md:p-20 text-center ${isVisible ? 'animate-fade-in' : 'opacity-0'}`}
        >
          {/* Decorative elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 start-0 w-80 h-80 bg-accent/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 end-0 w-96 h-96 bg-accent/5 rounded-full blur-[140px]" />
          </div>

          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent/15 text-accent text-xs sm:text-sm font-body font-semibold mb-5 sm:mb-7">
              <Sparkles className="w-4 h-4" />
              {isRTL ? 'انضم إلينا اليوم' : 'Join Us Today'}
            </div>

            <h2 className="font-heading font-bold text-2xl sm:text-4xl md:text-5xl text-surface-nav-foreground mb-5 sm:mb-7 leading-tight">
              {isRTL ? 'ابدأ رحلتك مع فنيين' : 'Start Your Journey with Faneen'}
            </h2>
            <p className="font-body text-sm sm:text-lg text-surface-nav-foreground/55 mb-7 sm:mb-10 max-w-lg mx-auto leading-relaxed">
              {isRTL
                ? 'سواء كنت تبحث عن مزود خدمة أو ترغب في عرض خدماتك، فنيين هو المكان الأمثل لك'
                : 'Whether you\'re looking for a service provider or want to showcase your services, Faneen is the perfect place for you'}
            </p>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-10 mb-7 sm:mb-10">
              {[
                { icon: Shield, textAr: 'عقود محمية', textEn: 'Protected Contracts' },
                { icon: Zap, textAr: 'تسجيل فوري', textEn: 'Instant Signup' },
                { icon: Sparkles, textAr: 'مجاناً للبدء', textEn: 'Free to Start' },
              ].map((item) => (
                <div key={item.textEn} className="flex items-center gap-2 text-surface-nav-foreground/50 text-xs sm:text-sm">
                  <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                  <span>{isRTL ? item.textAr : item.textEn}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link to="/auth">
                <Button variant="hero" size="lg" className="px-10 sm:px-12 py-3.5 gap-2 shadow-lg shadow-accent/30 active:scale-95 transition-transform text-sm sm:text-base font-semibold">
                  {isRTL ? 'سجّل الآن مجاناً' : 'Sign Up for Free'}
                  <ArrowIcon className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/search">
                <Button variant="heroOutline" size="lg" className="px-10 sm:px-12 py-3.5 gap-2 active:scale-95 transition-transform text-sm sm:text-base">
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
