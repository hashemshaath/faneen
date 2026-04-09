import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useParallax } from "@/hooks/useParallax";

const tags = ['cat.aluminum', 'cat.iron', 'cat.glass', 'cat.wood', 'cat.accessories', 'cat.designers'] as const;

export const SearchSection = () => {
  const { t } = useLanguage();
  const titleRef = useParallax<HTMLDivElement>(0.06);
  const formRef = useParallax<HTMLDivElement>(0.1);

  return (
    <section id="providers" className="py-24 bg-gradient-navy relative overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, hsl(42 85% 55% / 0.3) 0%, transparent 50%)" }} />
      <div className="container relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div ref={titleRef}>
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-primary-foreground mb-6">{t('search.title')}</h2>
            <p className="font-body text-primary-foreground/60 mb-10">{t('search.desc')}</p>
          </div>
          <div ref={formRef}>
            <div className="flex flex-col sm:flex-row gap-3 p-3 rounded-2xl bg-primary-foreground/10 border border-gold/20">
              <div className="flex-1 relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-foreground/40" />
                <input
                  type="text"
                  placeholder={t('search.placeholder')}
                  className="w-full pr-12 pl-4 py-4 rounded-xl bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 font-body text-sm border-0 outline-none focus:ring-2 focus:ring-gold/50"
                />
              </div>
              <Button variant="hero" size="lg" className="px-8">
                {t('search.btn')}
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              {tags.map(tag => (
                <span key={tag} className="px-4 py-1.5 rounded-full text-xs font-body text-gold border border-gold/30 hover:bg-gold/10 cursor-pointer transition-colors">
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
