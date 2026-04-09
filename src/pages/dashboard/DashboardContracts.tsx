import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  disputed: 'bg-orange-100 text-orange-800',
};

const DashboardContracts = () => {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['dashboard-contracts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('contracts')
        .select('*')
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading font-bold text-2xl">{t('contracts.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('contracts.subtitle')}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" /></div>
        ) : contracts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-lg font-medium">{t('contracts.no_contracts')}</p>
              <p className="text-sm">{t('contracts.no_contracts_desc')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {contracts.map((c) => (
              <Card key={c.id} className="border-border/50">
                <CardContent className="p-4 flex items-center gap-4">
                  <FileText className="w-8 h-8 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{isRTL ? c.title_ar : (c.title_en || c.title_ar)}</h3>
                      <Badge className={statusColors[c.status] || ''}>
                        {t(`status.${c.status}` as any)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('contracts.contract_number')}: {c.contract_number} • {c.total_amount.toLocaleString()} {c.currency_code}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/contracts/${c.id}`)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardContracts;
