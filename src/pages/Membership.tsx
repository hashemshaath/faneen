import React, { useState, useMemo } from 'react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MembershipHeader } from '@/components/membership/MembershipHeader';
import { CurrentSubscriptionCard } from '@/components/membership/CurrentSubscriptionCard';
import { PlanCard } from '@/components/membership/PlanCard';
import { FeatureComparisonTable } from '@/components/membership/FeatureComparisonTable';

const tierOrder = ['free', 'basic', 'premium', 'enterprise'];

const Membership = () => {
  const { language, isRTL } = useLanguage();
  usePageMeta({
    title: language === 'ar' ? 'باقات العضوية - اشترك واحصل على مميزات حصرية | فنيين' : 'Membership Plans - Subscribe for Exclusive Benefits | Faneen',
    description: language === 'ar' ? 'اختر باقة العضوية المناسبة لعملك واحصل على مميزات حصرية لتطوير أعمالك.' : 'Choose the right membership plan for your business and get exclusive benefits.',
  });
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);

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
      const { error } = await supabase.rpc('subscribe_to_plan' as any, {
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
    onError: (e) => { setSubscribingPlanId(null); toast.error(e.message); },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!mySubscription) throw new Error('No active subscription');
      const { error } = await supabase.rpc('cancel_subscription' as any, { _subscription_id: mySubscription.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['my-business-membership'] });
      toast.success(isRTL ? 'تم إلغاء الاشتراك' : 'Subscription cancelled');
    },
    onError: (e) => toast.error(e.message),
  });

  const currentTier = myBusiness?.membership_tier || 'free';
  const currentTierIndex = tierOrder.indexOf(currentTier);

  const handleSubscribe = (plan) => {
    if (!user) { navigate('/auth'); return; }
    if (!myBusiness) {
      toast.error(isRTL ? 'يجب إنشاء نشاط تجاري أولاً من لوحة التحكم' : 'Create a business profile first from dashboard');
      return;
    }
    if (plan.tier === 'free') {
      toast.info(isRTL ? 'هذه الخطة المجانية الافتراضية' : 'This is the default free plan');
      return;
    }
    setSubscribingPlanId(plan.id);
    subscribeMutation.mutate(plan.id);
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
        <MembershipHeader isRTL={isRTL} billingCycle={billingCycle} setBillingCycle={setBillingCycle} />

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
