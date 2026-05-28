import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Shield } from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { AuthShowcase } from './AuthShowcase';

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language, setLanguage, isRTL } = useLanguage();

  return (
    <div className="min-h-screen flex bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Industrial showcase panel (SVG, no raster images) */}
      <div className="hidden md:flex md:w-[50%] lg:w-[55%] relative">
        <AuthShowcase />
      </div>

      {/* Form side */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 sm:px-10 py-6">
          <div className="flex items-center gap-2.5 md:hidden">
            <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
              <BrandLogo variant="full" tone="auto" size={40} priority alt="قِطاعات — Qitaat" />
            </Link>
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
        <div className="flex-1 flex items-center justify-center px-5 sm:px-8 lg:px-12 py-6 sm:py-8">
          <div className="w-full max-w-[460px] sm:max-w-[520px] lg:max-w-[560px]">
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
            © {new Date().getFullYear()} Qitaat
          </p>
        </div>
      </div>
    </div>
  );
};
