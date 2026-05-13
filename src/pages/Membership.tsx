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
import { PromoCodeRedeem } from '@/components/membership/PromoCodeRedeem';
import { RenewalStatusBanner } from '@/components/membership/RenewalStatusBanner';
import { MembershipKeysManager } from '@/components/membership/MembershipKeysManager';
import { track } from '@/lib/analytics-events';
import { Button } from '@/components/ui/button';

const tierOrder = ['free', 'basic', 'premium', 'enterprise'];

const Membership = () => {
  const { language, isRTL } = useLanguage();
  usePageMeta({
    title: language === 'ar' ? 'باقات العضوية - اشترك واحصل على مميزات حصرية | قِطاعات' : 'Membership Plans - Subscribe for Exclusive Benefits | Qitaat',
    description: language === 'ar' ? 'اختر باقة العضوية المناسبة لعملك واحصل على مميزات حصرية لتطوير أعمالك.' : 'Choose the right membership plan for your business and get exclusive benefits.',
  });
  const { user, profile } = useAuth();
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
    queryKey: ['my-business-membership', user?.id, profile?.account_type],
    queryFn: async () => {
      if (!user) return null;
      // 1. Owner: pick the most recently created business they own
      const owned = await supabase
        .from('businesses')
        .select('id, ref_id, membership_tier, name_ar, name_en')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (owned.data && owned.data.length > 0) return owned.data[0];

      // 2. Staff fallback: business they manage (owner/manager role)
      const staff = await supabase
        .from('business_staff')
        .select('business_id, role, businesses:business_id(id, ref_id, membership_tier, name_ar, name_en)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .in('role', ['owner', 'manager'])
        .limit(1);
      const row = staff.data?.[0] as { businesses?: { id: string; ref_id: string | null; membership_tier: string; name_ar: string | null; name_en: string | null } } | undefined;
      if (row?.businesses) return row.businesses;

      // 3. Self-heal: business/company accounts must always have an entity.
      // Auto-create a draft business so the manager is linked to the entity
      // (entity-first model) and plan selection never blocks with "no business".
      const acct = profile?.account_type;
      if (acct === 'business' || acct === 'company') {
        const placeholderUsername =
          'biz-' + user.id.replace(/-/g, '').slice(0, 12);
        const placeholderName =
          (profile?.full_name && profile.full_name.trim()) ||
          (isRTL ? 'منشأة' : 'Business');
        const created = await supabase
          .from('businesses')
          .insert({
            user_id: user.id,
            name_ar: placeholderName,
            username: placeholderUsername,
            approval_status: 'draft',
            username_status: 'pending',
          })
          .select('id, ref_id, membership_tier, name_ar, name_en')
          .maybeSingle();
        if (created.data) return created.data;
      }
      return null;
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
        .in('status', ['active', 'past_due'])
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
      const { data: inserted, error } = await supabase.from('membership_upgrade_requests').insert({
        user_id: user.id,
        business_id: myBusiness.id,
        current_tier: currentTier,
        requested_tier: plan.tier,
        requested_plan_id: plan.id,
        billing_cycle: billingCycle,
        note: (myBusiness as { ref_id?: string | null }).ref_id
          ? `Bound to business ${(myBusiness as { ref_id?: string | null }).ref_id}`
          : null,
      }).select('id').maybeSingle();
      if (error) throw error;
      return { duplicate: false, requestId: inserted?.id as string | undefined, tier: plan.tier };
    },
    onSuccess: async (res) => {
      setSubscribingPlanId(null);
      queryClient.invalidateQueries({ queryKey: ['my-upgrade-requests'] });
      if (res?.duplicate) {
        toast.info(isRTL ? 'لديك طلب ترقية معلّق لهذه الباقة بالفعل.' : 'You already have a pending request for this plan.');
        return;
      } else {
        toast.success(isRTL ? 'تم إرسال طلب الترقية، وسيتواصل معك فريق قطاعات قريباً.' : 'Upgrade request sent. Our team will contact you shortly.');
      }
      // Best-effort: in-app notification + confirmation email. Never blocks success.
      const requestId = res?.requestId;
      if (!requestId || !user) return;
      const businessName = myBusiness?.name_ar || myBusiness?.name_en || undefined;
      try {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title_ar: 'تم استلام طلب ترقية الباقة',
          title_en: 'Upgrade request received',
          body_ar: 'سيقوم فريق قِطاعات بمراجعة طلبك والتواصل معك قريباً.',
          body_en: 'The Qitaat team will review your request and contact you shortly.',
          notification_type: 'system',
          reference_type: 'membership_upgrade_request',
          reference_id: requestId,
          action_url: '/membership',
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[Membership] notification insert failed', err);
      }
      if (user.email) {
        try {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'membership-upgrade-request-submitted',
              recipientEmail: user.email,
              idempotencyKey: `membership-upgrade-submitted-${requestId}`,
              templateData: { businessName, requestedTier: res?.tier },
            },
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[Membership] upgrade-submitted email failed', err);
        }
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
      const subId = mySubscription.id as string;
      const { error } = await supabase.rpc('cancel_subscription' , { _subscription_id: subId });
      if (error) throw error;
      return { subId };
    },
    onSuccess: async (res) => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['my-business-membership'] });
      toast.success(isRTL ? 'تم إلغاء الاشتراك' : 'Subscription cancelled');
      const subId = res?.subId;
      if (!user || !subId) return;
      const businessName = myBusiness?.name_ar || myBusiness?.name_en || undefined;
      try {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title_ar: 'تم إلغاء الاشتراك',
          title_en: 'Subscription cancelled',
          body_ar: 'تم إلغاء الاشتراك والعودة إلى الباقة المجانية. يمكنك طلب الترقية في أي وقت.',
          body_en: 'Subscription cancelled and your account is on the Free plan. You can request an upgrade anytime.',
          notification_type: 'system',
          reference_type: 'membership_subscription_cancelled',
          reference_id: subId,
          action_url: '/membership',
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[Membership] cancel notification failed', err);
      }
      if (user.email) {
        try {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'membership-subscription-cancelled',
              recipientEmail: user.email,
              idempotencyKey: `membership-cancelled-${subId}`,
              templateData: { businessName },
            },
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[Membership] cancel email failed', err);
        }
      }
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

        {user && myBusiness && (myBusiness as { ref_id?: string | null }).ref_id && (
          <div className="max-w-3xl mx-auto mb-6 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 flex items-center gap-3">
            <Building2 className="w-5 h-5 text-accent shrink-0" />
            <div className="flex-1 min-w-0 text-sm">
              <span className="text-muted-foreground">
                {isRTL ? 'سيتم تطبيق الترقية على المنشأة:' : 'Upgrade will apply to:'}
              </span>{' '}
              <span className="font-semibold text-foreground">
                {myBusiness.name_ar || myBusiness.name_en || (isRTL ? 'منشأتك' : 'Your business')}
              </span>{' '}
              <span className="tech-content text-xs font-mono px-2 py-0.5 rounded bg-accent/10 text-accent ms-1">
                {(myBusiness as { ref_id?: string | null }).ref_id}
              </span>
            </div>
          </div>
        )}

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

        {user && mySubscription && (
          <RenewalStatusBanner
            isRTL={isRTL}
            status={(mySubscription as { status?: string }).status ?? ''}
            graceUntil={(mySubscription as { grace_period_until?: string | null }).grace_period_until ?? null}
            expiresAt={(mySubscription as { expires_at?: string | null }).expires_at ?? null}
            onRenew={() => {
              const planId = (mySubscription as { plan_id?: string }).plan_id;
              const tier = (mySubscription as { plan?: { tier?: string } }).plan?.tier;
              if (planId && tier) {
                setSubscribingPlanId(planId);
                requestUpgradeMutation.mutate({ id: planId, tier });
              }
            }}
            isRenewing={requestUpgradeMutation.isPending}
          />
        )}

        {user && <PromoCodeRedeem isRTL={isRTL} businessId={myBusiness?.id ?? null} />}

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

        {user && myBusiness?.id && (
          <MembershipKeysManager isRTL={isRTL} businessId={myBusiness.id} />
        )}

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
