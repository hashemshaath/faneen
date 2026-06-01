import React from 'react';
import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { Button } from '@/components/ui/button';
import { useDirection } from '@/hooks/useDirection';
import { useMembershipVisibility } from '@/hooks/useMembershipVisibility';

interface Props {
  feature: string;
  businessId?: string | null;
  /** When true, render children disabled with overlay instead of hiding */
  mode?: 'hide' | 'disable' | 'upgrade';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Wraps any UI to gate it by membership feature.
 * - mode="hide"    → renders nothing if not allowed (default)
 * - mode="disable" → renders children inside an inert wrapper
 * - mode="upgrade" → renders an inline upgrade prompt
 */
export const FeatureGate: React.FC<Props> = ({ feature, businessId, mode = 'hide', fallback, children }) => {
  const { isRTL } = useDirection();
  const { allowed, isLoading } = useFeatureGate(feature, businessId);
  const membershipVisibility = useMembershipVisibility();

  if (isLoading) return null;
  if (allowed) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  if (mode === 'disable') {
    return (
      <div aria-disabled className="opacity-50 pointer-events-none select-none" data-feature-locked={feature}>
        {children}
      </div>
    );
  }

  if (mode === 'upgrade') {
    return (
      <div className="rounded-xl border border-dashed bg-muted/40 p-6 flex items-center justify-between gap-4 tech-content">
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 text-muted-foreground mt-0.5" aria-hidden />
          <div className="text-sm">
            <p className="font-medium">
              {isRTL ? 'هذه الميزة تتطلب باقة أعلى' : 'This feature requires a higher plan'}
            </p>
            <p className="text-muted-foreground">
              {membershipVisibility.shouldShowUpgradeCTA
                ? (isRTL ? 'قم بترقية اشتراكك للوصول.' : 'Upgrade your membership to unlock.')
                : (isRTL ? membershipVisibility.unavailableMessage.ar : membershipVisibility.unavailableMessage.en)}
            </p>
          </div>
        </div>
        {membershipVisibility.membershipPathOrNull ? (
          <Button asChild size="sm">
            <Link to={membershipVisibility.membershipPathOrNull}>{isRTL ? 'ترقية' : 'Upgrade'}</Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link to="/contact">{isRTL ? 'تواصل مع الدعم' : 'Contact support'}</Link>
          </Button>
        )}
      </div>
    );
  }

  return null;
};

/**
 * Route guard variant — redirects to /membership when feature missing.
 * Use as element wrapper: <RequireFeature feature="x"><Page/></RequireFeature>
 */
export const RequireFeature: React.FC<{ feature: string; businessId?: string | null; children: React.ReactNode }> = ({
  feature,
  businessId,
  children,
}) => {
  const { allowed, isLoading } = useFeatureGate(feature, businessId);
  const { isRTL } = useDirection();
  if (isLoading) return null;
  if (allowed) return <>{children}</>;
  return (
    <div className="container mx-auto py-16">
      <FeatureGate feature={feature} businessId={businessId} mode="upgrade">
        {null}
      </FeatureGate>
      <p className="text-center text-muted-foreground mt-6 text-sm">
        {isRTL ? 'لا تتوفر لديك صلاحية الوصول لهذه الصفحة ضمن باقتك الحالية.' : 'Your current plan does not include access to this page.'}
      </p>
    </div>
  );
};