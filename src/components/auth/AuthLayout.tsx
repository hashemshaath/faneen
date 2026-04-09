import React from 'react';
import { useLanguage } from '@/i18n/LanguageContext';

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, language, setLanguage } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center">
              <span className="font-heading font-black text-xl text-secondary-foreground">ف</span>
            </div>
            <div className="text-start">
              <h1 className="font-heading font-bold text-xl text-foreground leading-none">فنيين</h1>
              <span className="text-xs text-gold font-body">Faneen</span>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          {children}
        </div>

        {/* Language toggle */}
        <div className="text-center mt-4">
          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="text-sm text-muted-foreground hover:text-gold transition-colors"
          >
            {t('nav.language')}
          </button>
        </div>
      </div>
    </div>
  );
};
