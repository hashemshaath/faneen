import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Check, Crown, Zap, Building2, Rocket, Star, Sparkles,
  CalendarDays, Clock, AlertTriangle, RefreshCw, Ban, ArrowUp,
  Shield, ChevronRight, Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar as arLocale, enUS } from 'date-fns/locale';

const tierIcons: Record<string, React.ElementType> = {
  free: Zap, basic: Star, premium: Crown, enterprise: Building2,
};
const tierGradients: Record<string, string> = {
  free: 'from-slate-400 to-slate-500',
  basic: 'from-blue-500 to-cyan-400',
  premium: 'from-accent to-accent/80',
  enterprise: 'from-violet-600 to-purple-500',
};
const tierOrder = ['free', 'basic', 'premium', 'enterprise'];

const Membership = () => {
  const { language, isRTL } = useLanguage();
  const { user, profile } = useAuth();
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
      const { error } = await supabase.rpc('subscribe_to_plan', {
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
    onError: (e: any) => { setSubscribingPlanId(null); toast.error(e.message); },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!mySubscription) throw new Error('No active subscription');
      const { error } = await supabase.rpc('cancel_subscription', { _subscription_id: mySubscription.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['my-business-membership'] });
      toast.success(isRTL ? 'تم إلغاء الاشتراك' : 'Subscription cancelled');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const currentTier = myBusiness?.membership_tier || 'free';
  const currentTierIndex = tierOrder.indexOf(currentTier);

  const handleSubscribe = (plan: any) => {
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
        {/* Header */}
        <div className="text-center mb-8 sm:mb-14 max-w-2xl mx-auto">
          <Badge variant="secondary" className="mb-3 bg-accent/10 text-accent gap-1">
            <Sparkles className="w-3 h-3" />{isRTL ? 'خطط العضوية' : 'Membership Plans'}
          </Badge>
          <h1 className="font-heading font-bold text-2xl sm:text-4xl md:text-5xl text-foreground mb-3">
            {isRTL ? 'اختر الخطة المناسبة لنمو أعمالك' : 'Choose the Right Plan for Growth'}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {isRTL ? 'ابدأ مجاناً وقم بالترقية في أي وقت حسب احتياجاتك' : 'Start free and upgrade anytime based on your needs'}
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-1 mt-6 bg-muted/30 rounded-full p-0.5 w-fit mx-auto">
            <button onClick={() => setBillingCycle('monthly')}
              className={cn('px-4 py-1.5 rounded-full text-xs font-medium transition-all',
                billingCycle === 'monthly' ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {isRTL ? 'شهري' : 'Monthly'}
            </button>
            <button onClick={() => setBillingCycle('yearly')}
              className={cn('px-4 py-1.5 rounded-full text-xs font-medium transition-all',
                billingCycle === 'yearly' ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {isRTL ? 'سنوي' : 'Yearly'}
              <span className="ms-1 text-[10px] bg-emerald-500/15 text-emerald-600 px-1.5 py-0.5 rounded-full">
                {isRTL ? 'وفّر 17%' : 'Save 17%'}
              </span>
            </button>
          </div>
        </div>

        {/* Current Subscription Card */}
        {user && mySubscription && (
          <Card className="max-w-2xl mx-auto mb-8 border-accent/20 bg-accent/5">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0', tierGradients[currentTier])}>
                  {React.createElement(tierIcons[currentTier] || Zap, { className: 'w-5 h-5 text-white' })}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-heading font-bold text-sm">{isRTL ? 'اشتراكك الحالي' : 'Current Subscription'}</h3>
                    <Badge className="bg-emerald-500/10 text-emerald-600 text-[8px] px-1.5 py-0 h-3.5">{isRTL ? 'نشط' : 'Active'}</Badge>
                    <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-3.5">
                      {isRTL ? (mySubscription.plan as any)?.name_ar : (mySubscription.plan as any)?.name_en}
                    </Badge>
                  </div>

                  {daysRemaining !== null && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {isRTL ? `متبقي ${daysRemaining} يوم` : `${daysRemaining} days remaining`}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(mySubscription.expires_at!).toLocaleDateString()}
                        </span>
                      </div>
                      <Progress value={daysRemaining <= 0 ? 100 : Math.max(5, 100 - (daysRemaining / (mySubscription.billing_cycle === 'yearly' ? 365 : 30)) * 100)} className="h-1.5" />
                      {daysRemaining <= 7 && (
                        <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3" />
                          {isRTL ? 'اشتراكك ينتهي قريباً! جدد الآن' : 'Subscription expiring soon! Renew now'}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1 text-destructive border-destructive/20 hover:bg-destructive/10"
                      onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
                      {cancelMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                      {isRTL ? 'إلغاء الاشتراك' : 'Cancel'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {plans.map((plan: any) => {
            const Icon = tierIcons[plan.tier] || Zap;
            const gradient = tierGradients[plan.tier] || tierGradients.free;
            const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
            const features = Array.isArray(plan.features) ? plan.features : [];
            const isCurrentPlan = currentTier === plan.tier && mySubscription;
            const isPremium = plan.tier === 'premium';
            const planTierIndex = tierOrder.indexOf(plan.tier);
            const isUpgrade = planTierIndex > currentTierIndex;
            const isDowngrade = planTierIndex < currentTierIndex && planTierIndex > 0;
            const isSubscribing = subscribingPlanId === plan.id;

            return (
              <div key={plan.id}
                className={cn(
                  'relative rounded-2xl border p-5 flex flex-col transition-all duration-300 hover:shadow-lg group',
                  isPremium ? 'border-accent bg-accent/5 dark:bg-accent/10 shadow-md md:scale-[1.03]' : 'border-border bg-card',
                  isCurrentPlan && 'ring-2 ring-accent/30'
                )}>
                {isPremium && (
                  <div className="absolute -top-3 inset-x-0 flex justify-center">
                    <Badge className="bg-accent text-accent-foreground shadow-lg gap-1">
                      <Sparkles className="w-3 h-3" />{isRTL ? 'الأكثر طلباً' : 'Most Popular'}
                    </Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 end-4">
                    <Badge className="bg-emerald-500 text-white shadow-lg gap-1">
                      <Check className="w-3 h-3" />{isRTL ? 'خطتك' : 'Your Plan'}
                    </Badge>
                  </div>
                )}

                <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4', gradient)}>
                  <Icon className="w-5 h-5 text-white" />
                </div>

                <h3 className="font-heading font-bold text-lg mb-1">
                  {language === 'ar' ? plan.name_ar : plan.name_en}
                </h3>
                <p className="text-[10px] text-muted-foreground mb-4 line-clamp-2">
                  {language === 'ar' ? plan.description_ar : plan.description_en}
                </p>

                <div className="mb-5">
                  <span className="font-heading font-bold text-2xl sm:text-3xl text-foreground">
                    {price === 0 ? (isRTL ? 'مجاناً' : 'Free') : price}
                  </span>
                  {price > 0 && (
                    <span className="text-xs text-muted-foreground ms-1">
                      {isRTL ? 'ر.س' : 'SAR'}/{billingCycle === 'monthly' ? (isRTL ? 'شهر' : 'mo') : (isRTL ? 'سنة' : 'yr')}
                    </span>
                  )}
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {features.map((feat: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <div className="w-4 h-4 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5 text-accent" />
                      </div>
                      <span className="text-foreground/80">{feat}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSubscribe(plan)}
                  variant={isPremium ? 'hero' : isCurrentPlan ? 'outline' : 'default'}
                  className={cn('w-full gap-1.5 transition-all', isUpgrade && !isCurrentPlan && 'bg-accent text-accent-foreground hover:bg-accent/90')}
                  disabled={!!isCurrentPlan || isSubscribing}
                >
                  {isSubscribing ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" />{isRTL ? 'جارٍ التفعيل...' : 'Activating...'}</>
                  ) : isCurrentPlan ? (
                    <><Check className="w-3.5 h-3.5" />{isRTL ? 'خطتك الحالية' : 'Current Plan'}</>
                  ) : isUpgrade ? (
                    <><ArrowUp className="w-3.5 h-3.5" />{isRTL ? 'ترقية الآن' : 'Upgrade Now'}</>
                  ) : isDowngrade ? (
                    <>{isRTL ? 'تخفيض' : 'Downgrade'}</>
                  ) : (
                    <>{isRTL ? 'اشترك الآن' : 'Subscribe Now'}</>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Features comparison hint */}
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
