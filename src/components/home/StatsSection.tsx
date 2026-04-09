import { useLanguage } from "@/i18n/LanguageContext";

const stats = [
  { value: "2,500+", labelKey: 'stats.providers' as const },
  { value: "15,000+", labelKey: 'stats.reviews' as const },
  { value: "8,200+", labelKey: 'stats.projects' as const },
  { value: "98%", labelKey: 'stats.satisfaction' as const },
];

export const StatsSection = () => {
  const { t } = useLanguage();

  return (
    <section className="py-16 bg-muted/50">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(stat => (
            <div key={stat.labelKey} className="text-center">
              <div className="font-heading font-black text-3xl md:text-4xl text-gradient-gold mb-2">{stat.value}</div>
              <div className="font-body text-sm text-muted-foreground">{t(stat.labelKey)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
