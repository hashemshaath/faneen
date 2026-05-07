/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { translations, type Language, type TranslationKey } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  dir: 'rtl' | 'ltr';
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('qitaat_lang');
      return (saved === 'en' || saved === 'ar') ? saved : 'ar';
    } catch {
      return 'ar';
    }
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try { localStorage.setItem('qitaat_lang', lang); } catch { /* ignore */ }
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    const entry = translations[key];
    return entry ? entry[language] : key;
  }, [language]);

  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const isRTL = language === 'ar';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
    // Body class strategy for global selectors (.rtl / .ltr)
    const body = document.body;
    if (body) {
      body.classList.toggle('rtl', isRTL);
      body.classList.toggle('ltr', !isRTL);
    }
  }, [dir, language, isRTL]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
