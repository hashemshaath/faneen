import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useParallax } from "@/hooks/useParallax";
import { addToSearchHistory } from "@/services/search";

const tags = ['cat.aluminum', 'cat.iron', 'cat.glass', 'cat.wood', 'cat.accessories', 'cat.designers'] as const;

export const SearchSection = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const titleRef = useParallax<HTMLDivElement>(0.06);
  const formRef = useParallax<HTMLDivElement>(0.1);
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    const q = query.trim();
    if (q) {
      addToSearchHistory(q);
      navigate(`/search?q=${encodeURIComponent(q)}`);
    } else {
      navigate('/search');
    }
  };

  return (
    <section id="providers" className="py-8 sm:py-16 bg-[#142D52] relative overflow-hidden">
      <div className="container relative z-10 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div ref={titleRef}>
            <h2 className="font-heading font-bold text-xl sm:text-3xl md:text-4xl text-white mb-3 sm:mb-6">{t('search.title')}</h2>
            <p className="font-body text-xs sm:text-base text-white/70 mb-6 sm:mb-10">{t('search.desc')}</p>
          </div>
          <div ref={formRef}>
            <form onSubmit={e => { e.preventDefault(); handleSearch(); }} className="flex flex-col sm:flex-row gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-[#E2E6EE]">
              <div className="flex-1 relative">
                <Search className="absolute end-3 sm:end-4 top-1/2 -translate-y-1/2 ic-sm sm:ic-md text-[#94A0B2]" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={t('search.placeholder')}
                  className="w-full pe-10 sm:pe-12 ps-3 sm:ps-4 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-white text-[#1A2230] placeholder:text-[#94A0B2] font-body text-sm border-0 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <Button type="submit" variant="primary" size="appLg" className="active:scale-95 transition-transform">
                {t('search.btn')}
              </Button>
            </form>
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-3 mt-4 sm:mt-6">
              {tags.map(tag => (
                <span
                  key={tag}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(t(tag))}`)}
                  className="px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-body text-white bg-white/10 border border-white/25 hover:bg-white hover:text-[#142D52] active:scale-95 cursor-pointer transition-all"
                >
                  {t(tag)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};