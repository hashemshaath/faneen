import { TrendingUp, ShieldCheck, Headset, Sparkles, BarChart3, Star } from 'lucide-react';

interface Props { isRTL: boolean }

const benefits = [
  { icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/10', ar: { t: 'ظهور أفضل', d: 'ترتيب متقدم في نتائج البحث وصفحات الأقسام لزيادة وصولك للعملاء.' }, en: { t: 'Better Visibility', d: 'Top placement in search results and category pages to reach more customers.' } },
  { icon: Star, color: 'text-warning', bg: 'bg-warning/10', ar: { t: 'شارة موثّقة', d: 'شارة الموثوقية تعزّز ثقة العملاء وتزيد معدلات التحويل.' }, en: { t: 'Verified Badge', d: 'A verified badge boosts customer trust and conversion rates.' } },
  { icon: BarChart3, color: 'text-info', bg: 'bg-info/10', ar: { t: 'تحليلات متقدمة', d: 'تقارير تفصيلية عن الزيارات والاستفسارات وأداء منشأتك.' }, en: { t: 'Advanced Analytics', d: 'Detailed reports on visits, leads, and your business performance.' } },
  { icon: Sparkles, color: 'text-primary', bg: 'bg-primary/10', ar: { t: 'أدوات الذكاء الاصطناعي', d: 'مساعد ذكي لكتابة المحتوى، تحسين الصور، وتوليد الردود تلقائياً.' }, en: { t: 'AI Tools', d: 'Smart assistant for content writing, image enhancement, and auto-replies.' } },
  { icon: Headset, color: 'text-success', bg: 'bg-success/10', ar: { t: 'دعم مخصص', d: 'فريق دعم مختص يستجيب خلال ساعات لاستفساراتك ومتطلباتك.' }, en: { t: 'Dedicated Support', d: 'A specialized team responds within hours to your questions.' } },
  { icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10', ar: { t: 'حماية وأمان', d: 'بنية تحتية آمنة، نسخ احتياطي يومي، وحماية كاملة لبياناتك.' }, en: { t: 'Security & Privacy', d: 'Secure infrastructure, daily backups, and full data protection.' } },
];

export const MembershipBenefits = ({ isRTL }: Props) => (
  <section className="max-w-6xl mx-auto mt-16 sm:mt-20" aria-labelledby="membership-benefits-title">
    <div className="text-center mb-8 sm:mb-10">
      <h2 id="membership-benefits-title" className="font-heading font-bold text-2xl sm:text-3xl text-foreground mb-2">
        {isRTL ? 'لماذا الترقية؟' : 'Why Upgrade?'}
      </h2>
      <p className="text-sm text-muted-foreground max-w-xl mx-auto">
        {isRTL ? 'مزايا احترافية تساعدك على النمو والتميّز في قطاعك' : 'Professional features that help you grow and stand out in your sector'}
      </p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {benefits.map((b, i) => {
        const Icon = b.icon;
        const t = isRTL ? b.ar : b.en;
        return (
          <div key={i} className="group rounded-2xl border border-border/60 bg-card p-5 hover-lift hover:border-accent/30 transition-all">
            <div className={`w-11 h-11 rounded-xl ${b.bg} flex items-center justify-center mb-3 transition-transform group-hover:scale-110`}>
              <Icon className={`w-5 h-5 ${b.color}`} />
            </div>
            <h3 className="font-heading font-semibold text-base text-foreground mb-1.5">{t.t}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{t.d}</p>
          </div>
        );
      })}
    </div>
  </section>
);
