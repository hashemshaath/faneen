import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Shield, Star, Trophy } from 'lucide-react';
import authSlide1 from '@/assets/auth-slide-1.jpg';
import authSlide2 from '@/assets/auth-slide-2.jpg';
import authSlide3 from '@/assets/auth-slide-3.jpg';

const slides = [
  {
    image: authSlide1,
    title_ar: 'تصاميم داخلية فاخرة',
    title_en: 'Luxury Interior Design',
    desc_ar: 'نوصلك بأفضل المتخصصين في التصميم الداخلي',
    desc_en: 'Connect with top interior design professionals',
  },
  {
    image: authSlide2,
    title_ar: 'مقاولات احترافية',
    title_en: 'Professional Construction',
    desc_ar: 'مهندسون ومقاولون معتمدون لمشاريعك',
    desc_en: 'Certified engineers and contractors for your projects',
  },
  {
    image: authSlide3,
    title_ar: 'خدمات فنية متخصصة',
    title_en: 'Specialized Technical Services',
    desc_ar: 'فنيون متخصصون في جميع الأعمال الكهربائية والصيانة',
    desc_en: 'Specialists in all electrical and maintenance work',
  },
];

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, language, setLanguage, isRTL } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Image Slider - Left/Right half */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {slides.map((slide, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
            style={{ opacity: currentSlide === i ? 1 : 0 }}
          >
            <img
              src={slide.image}
              alt={isRTL ? slide.title_ar : slide.title_en}
              className="w-full h-full object-cover"
              width={960}
              height={1080}
              loading={i === 0 ? undefined : 'lazy'}
            />
            {/* Rich gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a2533]/90 via-[#1a2533]/40 to-[#1a2533]/20" />
          </div>
        ))}

        {/* Slide content */}
        <div className="absolute bottom-0 start-0 end-0 p-10 z-10">
          {slides.map((slide, i) => (
            <div
              key={i}
              className="transition-all duration-700"
              style={{
                opacity: currentSlide === i ? 1 : 0,
                transform: currentSlide === i ? 'translateY(0)' : 'translateY(20px)',
                position: currentSlide === i ? 'relative' : 'absolute',
                pointerEvents: currentSlide === i ? 'auto' : 'none',
              }}
            >
              {currentSlide === i && (
                <>
                  <h2 className="font-heading font-bold text-4xl text-white mb-3 leading-tight">
                    {isRTL ? slide.title_ar : slide.title_en}
                  </h2>
                  <p className="text-white/70 text-base max-w-lg leading-relaxed">
                    {isRTL ? slide.desc_ar : slide.desc_en}
                  </p>
                </>
              )}
            </div>
          ))}

          {/* Dots */}
          <div className="flex gap-2.5 mt-8">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  currentSlide === i
                    ? 'w-10 bg-accent'
                    : 'w-2 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Logo watermark */}
        <div className="absolute top-8 start-10 z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-xl flex items-center justify-center border border-white/20 shadow-lg">
            <span className="font-heading font-black text-xl text-white">ف</span>
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg text-white leading-none">فنيين</h1>
            <span className="text-xs text-white/50">Faneen</span>
          </div>
        </div>

        {/* Stats badges */}
        <div className="absolute top-8 end-10 z-10 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-xl border border-white/15 text-white text-xs shadow-lg">
            <Star className="w-3.5 h-3.5 text-accent" />
            {isRTL ? '+5,000 مزود خدمة' : '5,000+ Providers'}
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-xl border border-white/15 text-white text-xs shadow-lg">
            <Trophy className="w-3.5 h-3.5 text-accent" />
            {isRTL ? '+10,000 مشروع مكتمل' : '10,000+ Completed'}
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-5">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center shadow-md">
              <span className="font-heading font-black text-lg text-secondary-foreground">ف</span>
            </div>
            <div>
              <h1 className="font-heading font-bold text-base text-foreground leading-none">فنيين</h1>
              <span className="text-[10px] text-accent">Faneen</span>
            </div>
          </div>
          <div className="hidden lg:block" />

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="px-3.5 py-2 text-xs font-medium rounded-xl border border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            >
              {language === 'ar' ? 'English' : 'عربي'}
            </button>
          </div>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-6">
          <div className="w-full max-w-[440px]">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 flex items-center justify-center gap-4">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
            <Shield className="w-3 h-3" />
            {isRTL ? 'بياناتك محمية بتشفير 256-bit' : '256-bit encrypted'}
          </div>
          <span className="text-muted-foreground/30">·</span>
          <p className="text-[10px] text-muted-foreground/60">
            © {new Date().getFullYear()} Faneen
          </p>
        </div>
      </div>
    </div>
  );
};
