import { Building2, Star, Activity, Globe } from 'lucide-react';

interface Props { isRTL: boolean }

const stats = [
  { icon: Building2, ar: 'منشأة موثّقة', en: 'Verified businesses', value: '+1,200' },
  { icon: Star, ar: 'متوسط التقييم', en: 'Average rating', value: '4.8/5' },
  { icon: Activity, ar: 'وقت تشغيل', en: 'Uptime', value: '99.9%' },
  { icon: Globe, ar: 'قطاعات صناعية', en: 'Industrial sectors', value: '7+' },
];

export const MembershipTrustStrip = ({ isRTL }: Props) => (
  <section className="max-w-5xl mx-auto mt-12 sm:mt-16">
    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-accent/5 p-6 sm:p-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="text-center">
              <div className="inline-flex w-10 h-10 rounded-xl bg-accent/10 text-accent items-center justify-center mb-2">
                <Icon className="w-5 h-5" />
              </div>
              <div className="font-heading font-bold text-2xl sm:text-3xl text-foreground tracking-tight tech-content">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{isRTL ? s.ar : s.en}</div>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);
