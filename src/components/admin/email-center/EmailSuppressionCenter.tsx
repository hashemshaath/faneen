import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/i18n/LanguageContext';
import { format } from 'date-fns';
import { maskEmail } from '@/lib/masking';

interface SuppressedRow { id: string; email: string; reason: string | null; created_at: string; metadata: Record<string, unknown> | null }
interface UnsubRow { id: string; email: string; created_at: string; used_at: string | null }

export const EmailSuppressionCenter: React.FC = () => {
  const { isRTL } = useLanguage();

  const { data: suppressed } = useQuery({
    queryKey: ['email-center-suppressed'],
    queryFn: async (): Promise<SuppressedRow[]> => {
      const { data } = await supabase.from('suppressed_emails').select('*').order('created_at', { ascending: false }).limit(200);
      return (data ?? []) as SuppressedRow[];
    },
    staleTime: 60_000,
  });

  const { data: unsubs } = useQuery({
    queryKey: ['email-center-unsubs'],
    queryFn: async (): Promise<UnsubRow[]> => {
      const { data } = await supabase.from('email_unsubscribe_tokens').select('id, email, created_at, used_at').not('used_at', 'is', null).order('used_at', { ascending: false }).limit(200);
      return (data ?? []) as UnsubRow[];
    },
    staleTime: 60_000,
  });

  return (
    <div className="grid md:grid-cols-2 gap-3">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{isRTL ? 'العناوين المحظورة' : 'Suppressed addresses'} <Badge variant="outline" className="ms-2 tech-content">{suppressed?.length ?? 0}</Badge></CardTitle></CardHeader>
        <CardContent className="text-xs space-y-2 max-h-[480px] overflow-auto">
          {(suppressed ?? []).length === 0 ? <p className="text-muted-foreground">{isRTL ? 'لا يوجد' : 'None'}</p> : suppressed!.map((s) => (
            <div key={s.id} className="border rounded-lg p-2 flex justify-between items-center gap-2">
              <div className="min-w-0">
                <p className="tech-content truncate">{maskEmail(s.email)}</p>
                <p className="text-muted-foreground tech-content">{format(new Date(s.created_at), 'yyyy-MM-dd HH:mm')}</p>
              </div>
              <Badge variant="outline" className="text-xs">{s.reason ?? 'unknown'}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{isRTL ? 'إلغاءات الاشتراك' : 'Unsubscribes'} <Badge variant="outline" className="ms-2 tech-content">{unsubs?.length ?? 0}</Badge></CardTitle></CardHeader>
        <CardContent className="text-xs space-y-2 max-h-[480px] overflow-auto">
          {(unsubs ?? []).length === 0 ? <p className="text-muted-foreground">{isRTL ? 'لا يوجد' : 'None'}</p> : unsubs!.map((u) => (
            <div key={u.id} className="border rounded-lg p-2 flex justify-between items-center gap-2">
              <div className="min-w-0">
                <p className="tech-content truncate">{maskEmail(u.email)}</p>
                <p className="text-muted-foreground tech-content">{u.used_at ? format(new Date(u.used_at), 'yyyy-MM-dd HH:mm') : '—'}</p>
              </div>
              <Badge variant="secondary" className="text-xs">unsubscribed</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <p className="md:col-span-2 text-xs text-muted-foreground">
        {isRTL ? 'لا تتم إعادة الاشتراك من هذه الواجهة. لإلغاء الحظر، يجب إجراء العملية بشكل صريح ومُوثّق.' : 'No resubscribe action from this UI. Removing suppression must be explicit and audited.'}
      </p>
    </div>
  );
};