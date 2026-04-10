import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useCountUp } from "@/hooks/useCountUp";
import { memo } from "react";
import { Building2, Star, FolderOpen, TrendingUp } from "lucide-react";

const stats = [
  { end: 2500, suffix: "+", labelKey: 'stats.providers' as const, icon: Building2 },
  { end: 15000, suffix: "+", labelKey: 'stats.reviews' as const, icon: Star },
  { end: 8200, suffix: "+", labelKey: 'stats.projects' as const, icon: FolderOpen },
  { end: 98, suffix: "%", labelKey: 'stats.satisfaction' as const, icon: TrendingUp },
];

const StatItem = memo(({ end, suffix, labelKey, index, isVisible, icon: Icon }: {
  end: number; suffix: string; labelKey: string; index: number; isVisible: boolean; icon: any;
}) => {
  const { t } = useLanguage();
  const display = useCountUp(end, isVisible, 2200);

  return (
    <div
      className={`relative text-center p-4 sm:p-6 rounded-2xl bg-card/80 dark:bg-card/50 border border-border/50 dark:border-border/30 backdrop-blur-sm hover:border-accent/30 transition-all duration-500 group ${isVisible ? 'animate-card-slide-up' : 'opacity-0'}`}
      style={{ animationDelay: `${index * 120}ms`, animationFillMode: 'both' }}
    >
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/10 dark:bg-accent/15 flex items-center justify-center mx-auto mb-2.5 sm:mb-3 group-hover:bg-gradient-gold group-hover:scale-110 transition-all duration-300">
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-accent group-hover:text-secondary-foreground transition-colors" />
      </div>
      <div className="font-heading font-black text-2xl sm:text-3xl md:text-4xl text-gradient-gold mb-1 sm:mb-2">
        {isVisible ? display + suffix : "0" + suffix}
      </div>
      <div className="font-body text-[11px] sm:text-sm text-muted-foreground">{t(labelKey as any)}</div>
    </div>
  );
});

StatItem.displayName = 'StatItem';

export const StatsSection = () => {
  const { ref: visRef, isVisible } = useScrollAnimation();

  return (
    <section className="py-10 sm:py-20 bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
      </div>
      <div ref={visRef} className="container px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          {stats.map((stat, i) => (
            <StatItem key={stat.labelKey} {...stat} index={i} isVisible={isVisible} />
          ))}
        </div>
      </div>
    </section>
  );
};
