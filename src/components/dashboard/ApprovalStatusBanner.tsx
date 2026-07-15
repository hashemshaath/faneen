import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, MapPin, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { getOwnerBusiness } from '@/modules/businesses';
import { useProviderActivation } from '@/hooks/useProviderActivation';

/**
 * F3 — Approval + coverage-nudge banner for providers.
 *
 * Renders above the dashboard content and reflects the single next
 * action the provider must take to become matcher-reachable. Hides itself
 * once the provider is fully active (the ActivationChecklist strip on the
 * provider dashboard already collapses to a small green marker in that
 * state, so the banner is redundant then).
 */
export const ApprovalStatusBanner: React.FC = () => {
  const { user, isProvider } = useAuth();
  const { isRTL } = useLanguage();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  const { data: business } = useQuery({
    queryKey: ['owner-business-for-banner', user?.id],
    enabled: !!user && isProvider,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user) return null;
      const { data } = await getOwnerBusiness<{ id: string; approval_status: string | null }>({
        userId: user.id,
        select: 'id, approval_status',
      });
      return data;
    },
  });

  const businessId = business?.id ?? null;
  const { data: activation } = useProviderActivation({ businessId });

  if (!isProvider || !business) return null;

  const status = business.approval_status;
  const isPending = status === 'draft' || status === 'pending_review';
  const isApproved = status === 'approved' || status === 'published';
  const coverageDone = activation?.steps.find((s) => s.key === 'coverage_set')?.done ?? false;

  if (activation?.isFullyActive) return null;

  if (isPending) {
    return (
      <div
        role="status"
        className="rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700/40 px-4 py-3 flex items-start gap-3 mb-3"
        data-testid="approval-status-banner-pending"
      >
        <Clock className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden />
        <div className="flex-1 text-sm">
          <div className="font-medium text-amber-900 dark:text-amber-100">
            {isRTL ? 'ملفك قيد المراجعة' : 'Your profile is under review'}
          </div>
          <div className="text-amber-800/80 dark:text-amber-200/80 mt-0.5">
            {isRTL
              ? 'عادةً خلال 24 ساعة. سنُعلمك فور الاعتماد.'
              : 'Usually within 24 hours. We will notify you as soon as it is approved.'}
          </div>
        </div>
      </div>
    );
  }

  if (isApproved && !coverageDone) {
    return (
      <div
        role="status"
        className="rounded-lg border border-emerald-300/50 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700/40 px-4 py-3 flex items-start gap-3 mb-3"
        data-testid="approval-status-banner-coverage-nudge"
      >
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" aria-hidden />
        <div className="flex-1 text-sm">
          <div className="font-medium text-emerald-900 dark:text-emerald-100">
            {isRTL ? 'تم اعتماد منشأتك ✅' : 'Your business is approved ✅'}
          </div>
          <div className="text-emerald-800/80 dark:text-emerald-200/80 mt-0.5">
            {isRTL
              ? 'الخطوة التالية: أضف مناطق التغطية لتبدأ باستقبال طلبات عروض الأسعار.'
              : 'Next step: add your service coverage areas to start receiving quote requests.'}
          </div>
        </div>
        <Link
          to="/dashboard/business/coverage"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 py-2 min-h-[36px]"
        >
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {isRTL ? 'إضافة التغطية' : 'Add coverage'}
          <Arrow className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    );
  }

  return null;
};

export default ApprovalStatusBanner;