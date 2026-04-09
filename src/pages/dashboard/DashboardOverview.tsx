import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Image, Star, FileText, Shield, AlertTriangle } from 'lucide-react';

const DashboardOverview = () => {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const [services, portfolio, reviews, contracts, warranties] = await Promise.all([
        supabase.from('business_services').select('id', { count: 'exact', head: true })
          .eq('business_id', user.id),
        supabase.from('portfolio_items').select('id', { count: 'exact', head: true })
          .eq('business_id', user.id),
        supabase.from('reviews').select('id', { count: 'exact', head: true })
          .eq('business_id', user.id),
        supabase.from('contracts').select('id', { count: 'exact', head: true })
          .eq('provider_id', user.id),
        supabase.from('warranties').select('id, contract_id', { count: 'exact', head: true }),
      ]);

      return {
        services: services.count ?? 0,
        portfolio: portfolio.count ?? 0,
        reviews: reviews.count ?? 0,
        contracts: contracts.count ?? 0,
        warranties: 0,
      };
    },
    enabled: !!user,
  });

  const cards = [
    { icon: Wrench, label: isRTL ? 'الخدمات' : 'Services', value: stats?.services ?? 0, color: 'text-blue-500' },
    { icon: Image, label: isRTL ? 'معرض الأعمال' : 'Portfolio', value: stats?.portfolio ?? 0, color: 'text-green-500' },
    { icon: Star, label: isRTL ? 'التقييمات' : 'Reviews', value: stats?.reviews ?? 0, color: 'text-yellow-500' },
    { icon: FileText, label: isRTL ? 'العقود' : 'Contracts', value: stats?.contracts ?? 0, color: 'text-purple-500' },
    { icon: Shield, label: isRTL ? 'الضمانات' : 'Warranties', value: stats?.warranties ?? 0, color: 'text-teal-500' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">
            {t('dashboard.overview')}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isRTL ? 'نظرة عامة على حسابك وأنشطتك' : 'Overview of your account and activities'}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {cards.map((card) => (
            <Card key={card.label} className="border-border/50">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <card.icon className={`w-8 h-8 ${card.color}`} />
                <span className="text-3xl font-bold text-foreground">{card.value}</span>
                <span className="text-sm text-muted-foreground">{card.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">{isRTL ? 'آخر النشاطات' : 'Recent Activity'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <AlertTriangle className="w-10 h-10 mb-3 opacity-40" />
              <p>{isRTL ? 'لا توجد نشاطات حديثة' : 'No recent activity'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardOverview;
