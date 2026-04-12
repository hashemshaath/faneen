import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Shield, Star, Trophy, CheckCircle2 } from 'lucide-react';
import authSlide1 from '@/assets/auth-slide-1.jpg';
import authSlide2 from '@/assets/auth-slide-2.jpg';
import authSlide3 from '@/assets/auth-slide-3.jpg';

const slides = [
  {
    image: authSlide1,
    title_ar: 'واجهات ألمنيوم فاخرة',
    title_en: 'Premium Aluminum Facades',
    desc_ar: 'تصاميم معمارية راقية بأعلى معايير الجودة والحرفية',
    desc_en: 'Architectural designs with the highest quality standards',
  },
  {
    image: authSlide2,
    title_ar: 'تركيب وتنفيذ احترافي',
    title_en: 'Professional Installation',
    desc_ar: 'فنيون معتمدون لتنفيذ مشاريعك بدقة متناهية',
    desc_en: 'Certified technicians for precise project execution',
  },
  {
    image: authSlide3,
    title_ar: 'أعمال حديد وحدادة فنية',
    title_en: 'Artistic Iron & Metalwork',
    desc_ar: 'درابزينات وأبواب حديد بتصاميم عصرية وكلاسيكية',
    desc_en: 'Railings and doors with modern & classic designs',
  },
];

const features = [
  { icon: Star, label_ar: '+5,000 مزود خدمة', label_en: '5,000+ Providers' },
  { icon: Trophy, label_ar: '+10,000 مشروع مكتمل', label_en: '10,000+ Projects' },
  { icon: CheckCircle2, label_ar: 'ضمان جودة معتمد', label_en: 'Quality Guaranteed' },
];

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, language, setLanguage, isRTL } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Image Slider */}
      <div className="hidden md:flex md:w-[50%] lg:w-[55%] relative overflow-hidden">
        {slides.map((slide, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-all duration-[1.5s] ease-in-out"
            style={{
              opacity: currentSlide === i ? 1 : 0,
              transform: currentSlide === i ? 'scale(1)' : 'scale(1.08)',
            }}
          >
            <img
              src={slide.image}
              alt={isRTL ? slide.title_ar : slide.title_en}
              className="w-full h-full object-cover"
              width={960}
              height={1080}
              loading={i === 0 ? undefined : 'lazy'}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117]/95 via-[#0d1117]/30 to-[#0d1117]/10" />
          </div>
        ))}

        {/* Logo */}
        <div className="absolute top-8 start-10 z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-2xl flex items-center justify-center border border-white/15 shadow-2xl">
            <span className="font-heading font-black text-2xl text-white">ف</span>
          </div>
          <div>
            <h1 className="font-heading font-bold text-xl text-white leading-none tracking-tight">فنيين</h1>
            <span className="text-[11px] text-white/40 tracking-widest uppercase">Faneen</span>
          </div>
        </div>

        {/* Feature badges */}
        <div className="absolute top-8 end-10 z-10 flex flex-col gap-2">
          {features.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/[0.07] backdrop-blur-2xl border border-white/10 text-white text-xs shadow-xl transition-all duration-500"
              style={{
                opacity: currentSlide >= 0 ? 1 : 0,
                transitionDelay: `${i * 150}ms`,
              }}
            >
              <f.icon className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="font-medium">{isRTL ? f.label_ar : f.label_en}</span>
            </div>
          ))}
        </div>

        {/* Slide content */}
        <div className="absolute bottom-0 start-0 end-0 p-10 pb-12 z-10">
          {slides.map((slide, i) => (
            <div
              key={i}
              className="transition-all duration-700 ease-out"
              style={{
                opacity: currentSlide === i ? 1 : 0,
                transform: currentSlide === i ? 'translateY(0)' : 'translateY(24px)',
                position: currentSlide === i ? 'relative' : 'absolute',
                pointerEvents: currentSlide === i ? 'auto' : 'none',
              }}
            >
              {currentSlide === i && (
                <>
                  <h2 className="font-heading font-bold text-[2.5rem] text-white mb-3 leading-[1.15] tracking-tight">
                    {isRTL ? slide.title_ar : slide.title_en}
                  </h2>
                  <p className="text-white/50 text-[15px] max-w-md leading-relaxed">
                    {isRTL ? slide.desc_ar : slide.desc_en}
                  </p>
                </>
              )}
            </div>
          ))}

          {/* Progress indicators */}
          <div className="flex gap-2 mt-10">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className="h-1 rounded-full transition-all duration-700 overflow-hidden bg-white/15"
                style={{ width: currentSlide === i ? '48px' : '12px' }}
              >
                {currentSlide === i && (
                  <div
                    className="h-full bg-accent rounded-full animate-[progress_6s_linear]"
                    key={`progress-${currentSlide}`}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 sm:px-10 py-6">
          <div className="flex items-center gap-2.5 md:hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center shadow-md">
              <span className="font-heading font-black text-lg text-secondary-foreground">ف</span>
            </div>
            <div>
              <h1 className="font-heading font-bold text-base text-foreground leading-none">فنيين</h1>
              <span className="text-[10px] text-accent tracking-wider">Faneen</span>
            </div>
          </div>
          <div className="hidden md:block" />

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="px-4 py-2.5 text-xs font-medium rounded-xl border border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all duration-300"
            >
              {language === 'ar' ? 'English' : 'عربي'}
            </button>
          </div>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center px-5 sm:px-10 py-4">
          <div className="w-full max-w-[420px]">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 flex items-center justify-center gap-4">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
            <Shield className="w-3 h-3" />
            {isRTL ? 'بياناتك محمية بتشفير 256-bit' : '256-bit encrypted'}
          </div>
          <span className="text-muted-foreground/20">·</span>
          <p className="text-[10px] text-muted-foreground/50">
            © {new Date().getFullYear()} Faneen
          </p>
        </div>
      </div>
    </div>
  );
};
