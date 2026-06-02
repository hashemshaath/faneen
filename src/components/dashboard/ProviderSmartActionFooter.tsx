import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles, Plus, Image as ImageIcon, Inbox, Crown, LifeBuoy, Wrench, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useProviderReadiness } from '@/hooks/useProviderReadiness';
import { useMembershipVisibility } from '@/hooks/useMembershipVisibility';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  servicesCount: number;
  portfolioCount: number;
  leadsCount: number;
  isFreePlan: boolean;
  publicUsername: string | null;
}

type Action = {
  key: string;
  titleAr: string; titleEn: string;
  descAr: string;  descEn: string;
  ctaAr: string;   ctaEn: string;
  to: string;
  icon: typeof Sparkles;
  external?: boolean;
};

/**
 * PROVIDER-DASHBOARD-REDESIGN-1 — Smart "next best action" footer.
 * Picks one deterministic action based on current profile state.
 * No fake promises. Honors membership visibility.
 */
export function ProviderSmartActionFooter({
  servicesCount, portfolioCount, leadsCount, isFreePlan, publicUsername,
}: Props) {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const { completion, missing, isPublic, business } = useProviderReadiness(user?.id);
  const membershipVisibility = useMembershipVisibility();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  if (!user || !business) return null;

  const next: Action = (() => {
    if (completion < 70 || missing.length > 0) {
      return {
        key: 'profile',
        titleAr: 'أكمل ملف منشأتك',
        titleEn: 'Complete your profile',
        descAr: 'الملف المكتمل يساعد العملاء على فهم خدماتك ويزيد فرص ظهورك في البحث.',
        descEn: 'A complete profile helps customers understand your services and improves your visibility.',
        ctaAr: 'استكمال الملف', ctaEn: 'Complete profile',
        to: '/dashboard/business-completion',
        icon: Sparkles,
      };
    }
    if (servicesCount === 0) {
      return {
        key: 'services',
        titleAr: 'أضف خدماتك الأساسية',
        titleEn: 'Add your core services',
        descAr: 'أضف خدماتك حتى تظهر في البحث والمقارنة.',
        descEn: 'Add services so they appear in search and comparison.',
        ctaAr: 'إضافة خدمة', ctaEn: 'Add a service',
        to: '/dashboard/services',
        icon: Wrench,
      };
    }
    if (portfolioCount === 0) {
      return {
        key: 'portfolio',
        titleAr: 'أضف أعمالاً منفذة',
        titleEn: 'Add showcase projects',
        descAr: 'إضافة 3 أعمال منفذة تزيد من ثقة العملاء بمنشأتك.',
        descEn: 'Adding completed projects builds customer trust in your business.',
        ctaAr: 'إضافة مشروع', ctaEn: 'Add a project',
        to: '/dashboard/projects',
        icon: ImageIcon,
      };
    }
    if (leadsCount > 0) {
      return {
        key: 'leads',
        titleAr: 'راجع الفرص الجديدة',
        titleEn: 'Review new opportunities',
        descAr: 'الردّ السريع على الطلبات يحسّن فرص التحويل.',
        descEn: 'Responding quickly to leads improves conversion.',
        ctaAr: 'فتح الطلبات', ctaEn: 'Open leads',
        to: '/dashboard/leads',
        icon: Inbox,
      };
    }
    if (isFreePlan && membershipVisibility.membershipPathOrNull) {
      return {
        key: 'membership',
        titleAr: 'وسّع باقتك',
        titleEn: 'Upgrade your plan',
        descAr: 'بعض المزايا تعتمد على الخطة وإعدادات الحساب.',
        descEn: 'Some features depend on your plan and account settings.',
        ctaAr: 'عرض الباقات', ctaEn: 'View plans',
        to: membershipVisibility.membershipPathOrNull,
        icon: Crown,
      };
    }
    if (isPublic && publicUsername) {
      return {
        key: 'public',
        titleAr: 'شارك صفحتك العامة',
        titleEn: 'Share your public profile',
        descAr: 'ملفك منشور — يمكنك مشاركة الرابط مع عملائك.',
        descEn: 'Your profile is live — share the link with your customers.',
        ctaAr: 'مشاهدة الصفحة', ctaEn: 'View public page',
        to: `/${publicUsername}`,
        icon: ExternalLink,
      };
    }
    return {
      key: 'support',
      titleAr: 'هل تحتاج مساعدة؟',
      titleEn: 'Need a hand?',
      descAr: 'فريق الدعم جاهز لمساعدتك على الاستفادة القصوى من قطاعات.',
      descEn: 'Our support team is ready to help you make the most of Qitaat.',
      ctaAr: 'تواصل مع الدعم', ctaEn: 'Contact support',
      to: '/contact',
      icon: LifeBuoy,
    };
  })();

  return (
    <section
      aria-label={isRTL ? 'الخطوة التالية الأهم' : 'Next best action'}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-primary/20',
        'bg-gradient-to-br from-primary/8 via-card to-info/5 p-4 sm:p-6 shadow-[var(--elev-1)]',
      )}
    >
      <div className="pointer-events-none absolute -top-16 -end-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" aria-hidden />
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 h-11 w-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center ring-1 ring-primary/25">
            <next.icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">
              {isRTL ? 'ابدأ من أهم خطوة الآن' : 'Start with your next best step'}
            </p>
            <h3 className="font-heading font-bold text-base sm:text-lg leading-tight text-foreground mt-0.5">
              {isRTL ? next.titleAr : next.titleEn}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-prose">
              {isRTL ? next.descAr : next.descEn}
            </p>
          </div>
        </div>
        <Button asChild size="lg" className="shrink-0 gap-1.5 h-11">
          <Link to={next.to}>
            <Plus className="h-4 w-4 hidden" aria-hidden />
            {isRTL ? next.ctaAr : next.ctaEn}
            <Arrow className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

export default ProviderSmartActionFooter;