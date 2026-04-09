import { Layers, Shield, Building2, Wrench, Users } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const categories = [
  { icon: Layers, titleKey: 'cat.aluminum' as const, descKey: 'cat.aluminum.desc' as const, color: "from-blue-500/20 to-blue-600/5" },
  { icon: Shield, titleKey: 'cat.iron' as const, descKey: 'cat.iron.desc' as const, color: "from-slate-500/20 to-slate-600/5" },
  { icon: Layers, titleKey: 'cat.glass' as const, descKey: 'cat.glass.desc' as const, color: "from-cyan-500/20 to-cyan-600/5" },
  { icon: Building2, titleKey: 'cat.wood' as const, descKey: 'cat.wood.desc' as const, color: "from-amber-500/20 to-amber-600/5" },
  { icon: Wrench, titleKey: 'cat.accessories' as const, descKey: 'cat.accessories.desc' as const, color: "from-rose-500/20 to-rose-600/5" },
  { icon: Users, titleKey: 'cat.designers' as const, descKey: 'cat.designers.desc' as const, color: "from-violet-500/20 to-violet-600/5" },
];

export const CategoriesSection = () => {
  const { t } = useLanguage();

  return (
    <section id="categories" className="py-24 bg-background">
      <div className="container">
        <div className="text-center mb-16">
          <span className="text-sm font-body text-gold font-semibold tracking-wider">{t('categories.label')}</span>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mt-3">{t('categories.title')}</h2>
          <p className="font-body text-muted-foreground mt-4 max-w-xl mx-auto">{t('categories.desc')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat, i) => (
            <div
              key={cat.titleKey}
              className="group relative p-8 rounded-2xl bg-card border border-border hover:border-gold/40 transition-all duration-500 cursor-pointer"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-xl bg-gradient-gold flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <cat.icon className="w-7 h-7 text-secondary-foreground" />
                </div>
                <h3 className="font-heading font-bold text-xl text-card-foreground mb-2">{t(cat.titleKey)}</h3>
                <p className="font-body text-muted-foreground text-sm">{t(cat.descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
