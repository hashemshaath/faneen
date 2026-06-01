/**
 * MEMBERSHIP-PAGE-REDESIGN-2 — Service activation alignment.
 *
 * Governance-safe section that sets correct expectations between
 * membership tier and actual service activation. Mirrors existing
 * platform behavior (DashboardServices upgrade prompts, admin/brand
 * review, provider self-pause, no leads/sales guarantee). No prices,
 * no numeric limits, no fabricated SLAs.
 */
import { ShieldCheck, BadgeCheck, PauseCircle, AlertTriangle } from 'lucide-react';

interface Props { isRTL: boolean }

const items = [
  { icon: BadgeCheck, ar: 'بعض الخدمات قد تتطلب خطة أعلى لتفعيلها وفق حدود الباقة.', en: 'Some services may require a higher plan to activate based on plan limits.' },
  { icon: ShieldCheck, ar: 'بعض الخدمات والعلامات تخضع لمراجعة من إدارة قطاعات قبل النشر.', en: 'Some services and brands are reviewed by the Qitaat team before publishing.' },
  { icon: PauseCircle, ar: 'يمكن أن تتوقف الخدمة مؤقتًا من المزود أو الإدارة لأسباب تشغيلية.', en: 'A service can be paused temporarily by the provider or by admins for operational reasons.' },
  { icon: AlertTriangle, ar: 'الترقية تنظّم الظهور والمزايا، ولا تعني ضمان الطلبات أو المبيعات.', en: 'Upgrading organizes visibility and benefits — it does not guarantee leads or sales.' },
] as const;

export const ServiceActivationAlignment = ({ isRTL }: Props) => {
  return (
    <section
      aria-labelledby="membership-service-alignment-title"
      className="max-w-5xl mx-auto mt-12 sm:mt-16 rounded-2xl border border-border/60 bg-card p-6 sm:p-8"
    >
      <header className="mb-5 sm:mb-6">
        <h2
          id="membership-service-alignment-title"
          className="font-heading font-bold text-xl sm:text-2xl text-foreground"
        >
          {isRTL ? 'كيف تتوافق العضوية مع تفعيل الخدمات؟' : 'How memberships align with service activation'}
        </h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          {isRTL
            ? 'قواعد واضحة لتجنّب أي توقعات غير دقيقة قبل الترقية.'
            : 'Clear rules so you know exactly what changes (and what does not) when you upgrade.'}
        </p>
      </header>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <li
              key={i}
              className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-4"
            >
              <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary">
                <Icon className="w-4 h-4" aria-hidden />
              </span>
              <p className="text-sm text-foreground/85 leading-relaxed">
                {isRTL ? item.ar : item.en}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default ServiceActivationAlignment;