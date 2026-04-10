import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Building2, Rocket, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const tierIcons: Record<string, React.ElementType> = {
  free: Zap,
  basic: Star,
  premium: Crown,
  enterprise: Building2,
};

const tierColors: Record<string, string> = {
  free: 'from-muted to-muted/80',
  basic: 'from-blue-500 to-cyan-400',
  premium: 'from-accent to-accent/80',
  enterprise: 'from-violet-600 to-purple-500',
};

const Membership = () => {
  const { language, isRTL } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'yearly'>('monthly');

  const { data: plans = [] } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: async () => {
      const { data } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      return data ?? [];
    },
  });

  const handleSubscribe = (planTier: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (planTier === 'free') {
      toast.info(isRTL ? 'أنت بالفعل على الخطة المجانية' : 'You are already on the free plan');
      return;
    }
    toast.info(isRTL ? 'سيتم تفعيل بوابة الدفع قريباً' : 'Payment gateway coming soon');
  };

  const currentTier = profile?.membership_tier || 'free';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container px-4 py-12 sm:py-20">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-16 max-w-2xl mx-auto">
          <Badge variant="secondary" className="mb-4 bg-accent/10 text-accent">
            <Rocket className="w-3.5 h-3.5 me-1" />
            {isRTL ? 'خطط العضوية' : 'Membership Plans'}
          </Badge>
          <h1 className="font-heading font-bold text-3xl sm:text-5xl text-foreground mb-4">
            {isRTL ? 'اختر الخطة المناسبة لنمو أعمالك' : 'Choose the Right Plan for Your Growth'}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {isRTL ? 'ابدأ مجاناً وقم بالترقية في أي وقت حسب احتياجاتك' : 'Start free and upgrade anytime based on your needs'}
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === 'monthly' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {isRTL ? 'شهري' : 'Monthly'}
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === 'yearly' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {isRTL ? 'سنوي' : 'Yearly'}
              <span className="ms-1.5 text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full">
                {isRTL ? 'وفر 17%' : 'Save 17%'}
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {plans.map((plan: any) => {
            const Icon = tierIcons[plan.tier] || Zap;
            const gradient = tierColors[plan.tier] || tierColors.free;
            const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
            const features = (plan.features as string[]) || [];
            const isCurrentPlan = currentTier === plan.tier;
            const isPremium = plan.tier === 'premium';

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-6 flex flex-col transition-all hover:shadow-lg ${
                  isPremium
                    ? 'border-accent bg-accent/5 dark:bg-accent/10 shadow-accent/10 shadow-md scale-[1.02]'
                    : 'border-border bg-card'
                }`}
              >
                {isPremium && (
                  <div className="absolute -top-3 inset-x-0 flex justify-center">
                    <Badge className="bg-accent text-accent-foreground">
                      {isRTL ? 'الأكثر طلباً' : 'Most Popular'}
                    </Badge>
                  </div>
                )}

                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>

                <h3 className="font-heading font-bold text-xl mb-1">
                  {language === 'ar' ? plan.name_ar : plan.name_en}
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {language === 'ar' ? plan.description_ar : plan.description_en}
                </p>

                <div className="mb-5">
                  <span className="font-heading font-bold text-3xl text-foreground">
                    {price === 0 ? (isRTL ? 'مجاناً' : 'Free') : price}
                  </span>
                  {price > 0 && (
                    <span className="text-sm text-muted-foreground ms-1">
                      {isRTL ? 'ر.س' : 'SAR'}/{billingCycle === 'monthly' ? (isRTL ? 'شهر' : 'mo') : (isRTL ? 'سنة' : 'yr')}
                    </span>
                  )}
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {features.map((feat: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                      <span className="text-foreground/80">{feat}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSubscribe(plan.tier)}
                  variant={isPremium ? 'hero' : isCurrentPlan ? 'outline' : 'default'}
                  className="w-full"
                  disabled={isCurrentPlan}
                >
                  {isCurrentPlan
                    ? (isRTL ? 'خطتك الحالية' : 'Current Plan')
                    : (isRTL ? 'اشترك الآن' : 'Subscribe Now')
                  }
                </Button>
              </div>
            );
          })}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Membership;
