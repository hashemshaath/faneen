import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { countLeadsForBusiness } from '@/modules/leads';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useProviderReadiness } from '@/hooks/useProviderReadiness';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, ArrowLeft, ArrowRight } from 'lucide-react';

interface Tip {
  key: string;
  titleAr: string; titleEn: string;
  descAr: string; descEn: string;
  ctaAr: string; ctaEn: string;
  href: string;
}

interface Props {
  businessId: string | undefined;
}

/**
 * Actionable provider tips (P5.4) — derived from existing data only.
 * No new tracking, no new tables, no PII.
 */
export const ProviderTipsCard: React.FC<Props> = ({ businessId }) => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const { completion, missing } = useProviderReadiness(user?.id);

  const { data: counts } = useQuery({
    queryKey: ['provider-tip-counts', businessId, user?.id],
    enabled: !!businessId && !!user?.id,
    staleTime: 60000,
    queryFn: async () => {
      const [services, portfolio, projects, leads, convs] = await Promise.all([
        supabase.from('business_services').select('id', { count: 'exact', head: true }).eq('business_id', businessId!).eq('is_active', true),
        supabase.from('portfolio_items').select('id', { count: 'exact', head: true }).eq('business_id', businessId!),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('business_id', businessId!),
        countLeadsForBusiness(businessId!),
        supabase.from('conversations').select('id').or(`participant_1.eq.${user!.id},participant_2.eq.${user!.id}`),
      ]);
      const convIds = (convs.data ?? []).map((c) => c.id);
      let unreadCount = 0;
      if (convIds.length > 0) {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('conversation_id', convIds)
          .eq('is_read', false)
          .neq('sender_id', user!.id);
        unreadCount = count ?? 0;
      }
      return {
        services: services.count ?? 0,
        portfolio: (portfolio.count ?? 0) + (projects.count ?? 0),
        leads: leads.count ?? 0,
        unread: unreadCount,
      };
    },
  });

  const tips = useMemo<Tip[]>(() => {
    const out: Tip[] = [];
    if (completion < 70 || missing.length > 0) {
      out.push({
        key: 'profile',
        titleAr: 'أكمل ملف منشأتك', titleEn: 'Complete your profile',
        descAr: 'أكمل ملف منشأتك لزيادة فرص الظهور واستقبال الطلبات.',
        descEn: 'Complete your profile to improve visibility and receive more leads.',
        ctaAr: 'استكمال الملف', ctaEn: 'Complete profile',
        href: '/dashboard/settings',
      });
    }
    if (counts && counts.services === 0) {
      out.push({
        key: 'services',
        titleAr: 'أضف خدماتك', titleEn: 'Add your services',
        descAr: 'أضف خدماتك الأساسية ليسهل على العملاء العثور عليك.',
        descEn: 'Add core services so customers can find you easily.',
        ctaAr: 'إضافة خدمة', ctaEn: 'Add a service',
        href: '/dashboard/services',
      });
    }
    if (counts && counts.portfolio === 0) {
      out.push({
        key: 'portfolio',
        titleAr: 'اعرض أعمالك السابقة', titleEn: 'Showcase past work',
        descAr: 'أضف أعمالاً سابقة لتعزيز ثقة العملاء.',
        descEn: 'Add portfolio items to build customer trust.',
        ctaAr: 'إضافة عمل', ctaEn: 'Add portfolio',
        href: '/dashboard/portfolio',
      });
    }
    if (counts && counts.leads === 0) {
      out.push({
        key: 'no-leads',
        titleAr: 'حسّن وصف المنشأة', titleEn: 'Improve your description',
        descAr: 'حسّن وصف المنشأة وأضف خدمات واضحة لزيادة فرص استقبال الطلبات.',
        descEn: 'Sharpen your description and add clear services to attract more leads.',
        ctaAr: 'تحديث الملف', ctaEn: 'Update profile',
        href: '/dashboard/settings',
      });
    }
    if (counts && counts.unread > 0) {
      out.push({
        key: 'unread',
        titleAr: 'لديك رسائل غير مقروءة', titleEn: 'You have unread messages',
        descAr: 'لديك رسائل غير مقروءة، الرد السريع يزيد فرص التحويل.',
        descEn: 'You have unread messages — quick replies improve conversion.',
        ctaAr: 'فتح الرسائل', ctaEn: 'Open messages',
        href: '/dashboard/messages',
      });
    }
    // Generic upgrade hint — surfaced when other tips are minimal.
    if (out.length < 2) {
      out.push({
        key: 'membership',
        titleAr: 'وسّع باقتك', titleEn: 'Upgrade your plan',
        descAr: 'اقتربت من حد باقتك؟ يمكنك الترقية للحصول على مساحة أكبر.',
        descEn: 'Approaching your plan limit? Upgrade for more capacity.',
        ctaAr: 'عرض الباقات', ctaEn: 'View plans',
        href: '/membership',
      });
    }
    return out.slice(0, 4);
  }, [completion, missing, counts]);

  if (tips.length === 0) return null;
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-heading flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-warning" />
          {isRTL ? 'نصائح لتحسين أدائك' : 'Tips to improve performance'}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tips.map((t) => (
            <div key={t.key} className="rounded-xl border border-border/40 p-3 hover-lift bg-card">
              <p className="text-sm font-semibold text-foreground">{isRTL ? t.titleAr : t.titleEn}</p>
              <p className="text-xs text-muted-foreground mt-1">{isRTL ? t.descAr : t.descEn}</p>
              <Button asChild size="sm" variant="ghost" className="mt-2 h-8 px-2 text-xs">
                <Link to={t.href}>
                  {isRTL ? t.ctaAr : t.ctaEn}
                  <Arrow className="w-3.5 h-3.5 ms-1" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProviderTipsCard;