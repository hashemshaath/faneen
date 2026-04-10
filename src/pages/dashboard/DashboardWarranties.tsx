import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  expired: 'bg-muted text-muted-foreground',
  claimed: 'bg-yellow-100 text-yellow-800',
  void: 'bg-red-100 text-red-800',
};

const DashboardWarranties = () => {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();

  const { data: warranties = [], isLoading } = useQuery({
    queryKey: ['dashboard-warranties', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Get contracts where user is provider, then get warranties
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id')
        .eq('provider_id', user.id);
      if (!contracts?.length) return [];
      const contractIds = contracts.map((c) => c.id);
      const { data } = await supabase
        .from('warranties')
        .select('*')
        .in('contract_id', contractIds)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading font-bold text-2xl">{t('contracts.warranty')}</h1>
          <p className="text-sm text-muted-foreground">{isRTL ? 'إدارة ضمانات العقود' : 'Manage contract warranties'}</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : warranties.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
              <Shield className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-lg font-medium">{t('warranty.no_warranty')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {warranties.map((w) => (
              <Card key={w.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{isRTL ? w.title_ar : (w.title_en || w.title_ar)}</h3>
                    <Badge className={statusColors[w.status] || ''}>
                      {t(`warranty.${w.status}` as any)}
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{t('warranty.period')}: {new Date(w.start_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')} - {new Date(w.end_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</span>
                    <Badge variant="outline">{t(`warranty.${w.warranty_type}` as any)}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardWarranties;
