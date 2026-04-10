import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { ThemeToggle } from '@/components/ThemeToggle';
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
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
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
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
          </div>
        ))}

        {/* Slide content */}
        <div className="absolute bottom-0 start-0 end-0 p-8 z-10">
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
                  <h2 className="font-heading font-bold text-3xl text-white mb-2">
                    {isRTL ? slide.title_ar : slide.title_en}
                  </h2>
                  <p className="text-white/80 text-sm max-w-md">
                    {isRTL ? slide.desc_ar : slide.desc_en}
                  </p>
                </>
              )}
            </div>
          ))}

          {/* Dots */}
          <div className="flex gap-2 mt-6">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  currentSlide === i
                    ? 'w-8 bg-white'
                    : 'w-1.5 bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Logo watermark */}
        <div className="absolute top-6 start-6 z-10 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
            <span className="font-heading font-black text-lg text-white">ف</span>
          </div>
          <div>
            <h1 className="font-heading font-bold text-base text-white leading-none">فنيين</h1>
            <span className="text-[10px] text-white/60">Faneen</span>
          </div>
        </div>

        {/* Stats badges */}
        <div className="absolute top-6 end-6 z-10 flex flex-col gap-2">
          <div className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs">
            ⭐ {isRTL ? '+5,000 مزود خدمة' : '5,000+ Providers'}
          </div>
          <div className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs">
            🏆 {isRTL ? '+10,000 مشروع مكتمل' : '10,000+ Completed'}
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-gold flex items-center justify-center">
              <span className="font-heading font-black text-base text-secondary-foreground">ف</span>
            </div>
            <div>
              <h1 className="font-heading font-bold text-sm text-foreground leading-none">فنيين</h1>
              <span className="text-[10px] text-accent">Faneen</span>
            </div>
          </div>
          <div className="hidden lg:block" />

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="px-3 py-1.5 text-xs rounded-full border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              {language === 'ar' ? 'English' : 'عربي'}
            </button>
          </div>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6">
          <div className="w-full max-w-[420px]">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 text-center">
          <p className="text-[10px] text-muted-foreground">
            © {new Date().getFullYear()} Faneen. {isRTL ? 'جميع الحقوق محفوظة' : 'All rights reserved'}
          </p>
        </div>
      </div>
    </div>
  );
};
