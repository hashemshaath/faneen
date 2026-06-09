import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Inbox, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InquiryRow {
  id: string;
  branch_id: string;
  business_id: string;
  service_id: string | null;
  message: string;
  phone: string;
  status: 'pending' | 'in_review' | 'responded' | 'closed';
  budget: number | null;
  currency_code: string;
  created_at: string;
}

const STATUS_STYLE: Record<InquiryRow['status'], string> = {
  pending:   'bg-amber-500/10 text-amber-700 border-amber-500/30',
  in_review: 'bg-blue-500/10  text-blue-700  border-blue-500/30',
  responded: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  closed:    'bg-muted text-muted-foreground border-border',
};

const DashboardInquiries: React.FC = () => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-branch-inquiries', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branch_inquiries')
        .select('id, branch_id, business_id, service_id, message, phone, status, budget, currency_code, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as InquiryRow[];
    },
  });

  const statusLabel = (s: InquiryRow['status']): string => {
    if (isRTL) return ({ pending: 'بانتظار الرد', in_review: 'قيد المراجعة', responded: 'تم الرد', closed: 'مغلق' } as const)[s];
    return ({ pending: 'Pending', in_review: 'In review', responded: 'Responded', closed: 'Closed' } as const)[s];
  };

  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Inbox className="w-5 h-5 text-primary" />
          {isRTL ? 'استفساراتي' : 'My inquiries'}
        </h1>
        <Button size="sm" variant="outline" className="gap-2"
          onClick={() => qc.invalidateQueries({ queryKey: ['my-branch-inquiries'] })}>
          <RefreshCw className="w-3.5 h-3.5" />
          {isRTL ? 'تحديث' : 'Refresh'}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (data?.length ?? 0) === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
          {isRTL ? 'لا توجد استفسارات بعد.' : 'No inquiries yet.'}
        </CardContent></Card>
      ) : (
        <ul className="space-y-3">
          {data!.map((it) => (
            <li key={it.id}>
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Badge variant="outline" className={STATUS_STYLE[it.status]}>
                      {statusLabel(it.status)}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground tech-content">
                      {new Date(it.created_at).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}
                    </span>
                  </div>
                  <p className="text-sm" dir="auto">{it.message}</p>
                  <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                    <span className="tech-content">{it.phone}</span>
                    {it.budget != null && (
                      <span className="tech-content">{it.budget} {it.currency_code}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DashboardInquiries;