import React, { useState, useMemo } from 'react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Shield, Info, AlertTriangle, Check, Undo2, Building2, Send, Clock } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { MembershipHeader } from '@/components/membership/MembershipHeader';
import { CurrentSubscriptionCard } from '@/components/membership/CurrentSubscriptionCard';
import { PlanCard } from '@/components/membership/PlanCard';
import { FeatureComparisonTable } from '@/components/membership/FeatureComparisonTable';
import { track } from '@/lib/analytics-events';
import { Button } from '@/components/ui/button';

const tierOrder = ['free', 'basic', 'premium', 'enterprise'];

const Membership = () => {
  const { language, isRTL } = useLanguage();
  usePageMeta({
    title: language === 'ar' ? 'باقات العضوية - اشترك واحصل على مميزات حصرية | قِطاعات' : 'Membership Plans - Subscribe for Exclusive Benefits | Qitaat',
    description: language === 'ar' ? 'اختر باقة العضوية المناسبة لعملك واحصل على مميزات حصرية لتطوير أعمالك.' : 'Choose the right membership plan for your business and get exclusive benefits.',
  });
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  const [pendingDowngrade, setPendingDowngrade] = useState<{ id: string; tier: string } | null>(null);
  const [noBusinessNotice, setNoBusinessNotice] = useState(false);

  // Privacy-safe: tier of current user (or 'anonymous') — no PII.
  React.useEffect(() => {
    track.membershipPlanView({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: plans = [] } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: async () => {
      const { data } = await supabase.from('membership_plans').select('*').eq('is_active', true).order('sort_order');
      return data ?? [];
    },
  });

  const { data: myBusiness } = useQuery({
    queryKey: ['my-business-membership', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('businesses').select('id, membership_tier, name_ar, name_en').eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: mySubscription } = useQuery({
    queryKey: ['my-subscription', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('membership_subscriptions')
        .select('*, plan:membership_plans(name_ar, name_en, tier)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const subscribeMutation = useMutation({
    mutationFn: async (planId: string) => {
      if (!user || !myBusiness) throw new Error(isRTL ? 'يجب تسجيل الدخول وإنشاء نشاط تجاري أولاً' : 'Login and create a business first');
      const { error } = await supabase.rpc('subscribe_to_plan' , {
        _user_id: user.id,
        _plan_id: planId,
        _business_id: myBusiness.id,
        _billing_cycle: billingCycle,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['my-business-membership'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSubscribingPlanId(null);
      toast.success(isRTL ? 'تم تفعيل الاشتراك بنجاح! 🎉' : 'Subscription activated! 🎉');
    },
    onError: (e: Error) => { setSubscribingPlanId(null); toast.error(e.message); },
  });

  // Manual upgrade request flow (paid plans). Replaces self-serve activation in beta.
  const requestUpgradeMutation = useMutation({
    mutationFn: async (plan: { id: string; tier: string }) => {
      if (!user || !myBusiness) throw new Error(isRTL ? 'يجب تسجيل الدخول وإنشاء نشاط تجاري أولاً' : 'Login and create a business first');
      // Prevent duplicate pending requests for same business+tier
      const { data: existing } = await supabase
        .from('membership_upgrade_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('business_id', myBusiness.id)
        .eq('requested_tier', plan.tier)
        .eq('status', 'pending')
        .maybeSingle();
      if (existing) return { duplicate: true };
      const { error } = await supabase.from('membership_upgrade_requests').insert({
        user_id: user.id,
        business_id: myBusiness.id,
        current_tier: currentTier,
        requested_tier: plan.tier,
        requested_plan_id: plan.id,
        billing_cycle: billingCycle,
      });
      if (error) throw error;
      return { duplicate: false };
    },
    onSuccess: (res) => {
      setSubscribingPlanId(null);
      queryClient.invalidateQueries({ queryKey: ['my-upgrade-requests'] });
      if (res?.duplicate) {
        toast.info(isRTL ? 'لديك طلب ترقية معلّق لهذه الباقة بالفعل.' : 'You already have a pending request for this plan.');
      } else {
        toast.success(isRTL ? 'تم إرسال طلب الترقية، وسيتواصل معك فريق قطاعات قريباً.' : 'Upgrade request sent. Our team will contact you shortly.');
      }
    },
    onError: (e: Error) => { setSubscribingPlanId(null); toast.error(e.message); },
  });

  // Show pending upgrade requests for current user (status banner).
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['my-upgrade-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('membership_upgrade_requests')
        .select('id, requested_tier, status, created_at')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!mySubscription) throw new Error('No active subscription');
      const { error } = await supabase.rpc('cancel_subscription' , { _subscription_id: mySubscription.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['my-business-membership'] });
      toast.success(isRTL ? 'تم إلغاء الاشتراك' : 'Subscription cancelled');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const currentTier = myBusiness?.membership_tier || 'free';
  const currentTierIndex = tierOrder.indexOf(currentTier);

  const handleSubscribe = (plan: { id: string; tier: string }) => {
    track.membershipPlanClick({ membership_tier: plan.tier });
    if (!user) { navigate('/auth'); return; }
    if (!myBusiness) {
      setNoBusinessNotice(true);
      return;
    }
    const planTierIndex = tierOrder.indexOf(plan.tier);
    const isDowngradeAction = planTierIndex < currentTierIndex;
    // Free clicked while on a paid plan = downgrade-like; needs confirmation.
    if (isDowngradeAction) {
      setPendingDowngrade({ id: plan.id, tier: plan.tier });
      return;
    }
    if (plan.tier === 'free') {
      // Already on free, nothing to do.
      return;
    }
    // Paid upgrade — manual request flow (no immediate activation in beta).
    setSubscribingPlanId(plan.id);
    requestUpgradeMutation.mutate(plan);
  };

  const confirmDowngrade = () => {
    if (!pendingDowngrade) return;
    setSubscribingPlanId(pendingDowngrade.id);
    subscribeMutation.mutate(pendingDowngrade.id);
    setPendingDowngrade(null);
  };

  const daysRemaining = useMemo(() => {
    if (!mySubscription?.expires_at) return null;
    const diff = new Date(mySubscription.expires_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  }, [mySubscription]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container px-4 py-10 sm:py-16">
        <MembershipHeader isRTL={isRTL} billingCycle={billingCycle} setBillingCycle={setBillingCycle} plans={plans} />

        <div className="max-w-3xl mx-auto mb-6 rounded-xl border border-info/30 bg-info/5 px-4 py-3 flex items-start gap-2 text-xs text-foreground/80">
          <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {isRTL
              ? 'نسخة تجريبية — يتم تفعيل الترقيات يدوياً حالياً دون أي رسوم. سيتم إضافة الدفع الإلكتروني لاحقاً.'
              : 'Beta — upgrades are manually activated for now with no charge. Online payment will be added later.'}
          </p>
        </div>

        {user && noBusinessNotice && !myBusiness && (
          <div className="max-w-3xl mx-auto mb-6 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 flex items-start gap-3">
            <Building2 className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-relaxed mb-2">
                {isRTL ? 'للاشتراك في باقة، أضف منشأتك أولاً.' : 'To subscribe to a plan, add your business first.'}
              </p>
              <div className="flex gap-2">
                <Link to="/onboarding">
                  <Button size="sm" className="h-8 text-xs gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    {isRTL ? 'إضافة منشأة' : 'Add business'}
                  </Button>
                </Link>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setNoBusinessNotice(false)}>
                  {isRTL ? 'إخفاء' : 'Dismiss'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {pendingRequests.length > 0 && (
          <div className="max-w-3xl mx-auto mb-6 rounded-xl border border-info/30 bg-info/5 px-4 py-3 flex items-start gap-2 text-xs text-foreground/80">
            <Clock className="w-4 h-4 text-info shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {isRTL
                ? `لديك ${pendingRequests.length} طلب ترقية قيد المراجعة من فريق قطاعات.`
                : `You have ${pendingRequests.length} upgrade request(s) being reviewed by the Qitaat team.`}
            </p>
          </div>
        )}

        {pendingDowngrade && (
          <div className="max-w-3xl mx-auto mb-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="text-sm text-foreground leading-relaxed mb-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              {pendingDowngrade.tier === 'free'
                ? (isRTL
                    ? 'سيؤدي الانتقال للباقة المجانية إلى تقليل المزايا والحدود المتاحة.'
                    : 'Switching to the Free plan will reduce your benefits and limits.')
                : (isRTL
                    ? 'سيؤدي خفض الباقة إلى تقليل بعض المزايا والحدود المتاحة.'
                    : 'Downgrading will reduce some of your benefits and limits.')}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" className="h-8 text-xs gap-1.5" onClick={confirmDowngrade} disabled={subscribeMutation.isPending}>
                <Check className="w-3.5 h-3.5" />
                {isRTL ? 'تأكيد خفض الباقة' : 'Confirm downgrade'}
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setPendingDowngrade(null)}>
                <Undo2 className="w-3.5 h-3.5" />
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </div>
        )}

        {user && mySubscription && (
          <CurrentSubscriptionCard
            isRTL={isRTL}
            currentTier={currentTier}
            mySubscription={mySubscription}
            daysRemaining={daysRemaining}
            cancelMutation={cancelMutation}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const planTierIndex = tierOrder.indexOf(plan.tier);
            const isCurrentPlan = !!(currentTier === plan.tier && mySubscription);
            const isUpgrade = planTierIndex > currentTierIndex;
            const isDowngrade = planTierIndex < currentTierIndex && planTierIndex > 0;

            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                billingCycle={billingCycle}
                isRTL={isRTL}
                language={language}
                isCurrentPlan={isCurrentPlan}
                isUpgrade={isUpgrade}
                isDowngrade={isDowngrade}
                isSubscribing={subscribingPlanId === plan.id}
                onSubscribe={handleSubscribe}
              />
            );
          })}
        </div>

        <FeatureComparisonTable isRTL={isRTL} />

        <div className="text-center mt-10">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            {isRTL ? 'جميع الخطط تشمل حماية كاملة للبيانات والخصوصية' : 'All plans include full data protection and privacy'}
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Membership;
