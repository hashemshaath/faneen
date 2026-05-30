import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Bi } from '@/components/common/Bilingual';
import { ArrowLeft, Check, Trophy, Clock, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { getRfq, listQuotesForRfq, acceptQuote } from '@/modules/rfq/services';

type SortKey = 'amount_asc' | 'amount_desc' | 'delivery_asc' | 'newest';

const DashboardRfqDetail: React.FC = () => {
  useNoIndex();
  const { id } = useParams<{ id: string }>();
  const { isRTL } = useLanguage();
  const qc = useQueryClient();
  const [sort, setSort] = useState<SortKey>('amount_asc');

  const { data: rfq } = useQuery({ queryKey: ['rfq', id], queryFn: () => getRfq(id!), enabled: !!id });
  const { data: quotes, isLoading } = useQuery({
    queryKey: ['rfq-quotes', id],
    queryFn: () => listQuotesForRfq(id!),
    enabled: !!id,
  });

  const acceptMut = useMutation({
    mutationFn: (quoteId: string) => acceptQuote(quoteId, id!),
    onSuccess: () => {
      toast.success(isRTL ? 'تم اعتماد العرض' : 'Quote accepted');
      qc.invalidateQueries({ queryKey: ['rfq', id] });
      qc.invalidateQueries({ queryKey: ['rfq-quotes', id] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const sorted = useMemo(() => {
    const list = [...(quotes ?? [])];
    switch (sort) {
      case 'amount_asc': return list.sort((a, b) => a.amount - b.amount);
      case 'amount_desc': return list.sort((a, b) => b.amount - a.amount);
      case 'delivery_asc': return list.sort((a, b) => (a.delivery_days ?? 999) - (b.delivery_days ?? 999));
      default: return list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    }
  }, [quotes, sort]);

  const stats = useMemo(() => {
    if (!quotes || quotes.length === 0) return null;
    const amounts = quotes.map((q) => q.amount);
    return {
      count: quotes.length,
      min: Math.min(...amounts),
      max: Math.max(...amounts),
      avg: amounts.reduce((s, n) => s + n, 0) / amounts.length,
    };
  }, [quotes]);

  const awarded = rfq?.status === 'awarded';

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <Link to="/dashboard/rfq" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          <Bi ar="عودة لطلباتي" en="Back to my RFQs" />
        </Link>

        {!rfq ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs text-muted-foreground tech-content">{rfq.ref_id}</span>
                <Badge variant="secondary">{rfq.industry}</Badge>
                <Badge>{rfq.status}</Badge>
              </div>
              <h1 className="text-2xl font-bold">{rfq.title}</h1>
              {rfq.description && <p className="text-muted-foreground mt-2">{rfq.description}</p>}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
                <div><div className="text-xs text-muted-foreground"><Bi ar="الميزانية" en="Budget" /></div>
                  <div className="tech-content font-medium">{rfq.budget_min ?? '-'} – {rfq.budget_max ?? '-'} {rfq.currency}</div></div>
                <div><div className="text-xs text-muted-foreground"><Bi ar="الموعد" en="Deadline" /></div>
                  <div className="tech-content font-medium">{rfq.deadline ?? '—'}</div></div>
              </div>
            </CardContent>
          </Card>
        )}

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4"><div className="text-xs text-muted-foreground"><Bi ar="عدد العروض" en="Quotes" /></div><div className="text-xl font-bold tech-content">{stats.count}</div></Card>
            <Card className="p-4"><div className="text-xs text-muted-foreground"><Bi ar="الأقل" en="Lowest" /></div><div className="text-xl font-bold tech-content">{stats.min.toLocaleString()}</div></Card>
            <Card className="p-4"><div className="text-xs text-muted-foreground"><Bi ar="المتوسط" en="Average" /></div><div className="text-xl font-bold tech-content">{Math.round(stats.avg).toLocaleString()}</div></Card>
            <Card className="p-4"><div className="text-xs text-muted-foreground"><Bi ar="الأعلى" en="Highest" /></div><div className="text-xl font-bold tech-content">{stats.max.toLocaleString()}</div></Card>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold me-2"><Bi ar="ترتيب:" en="Sort:" /></span>
          {([
            ['amount_asc', { ar: 'السعر تصاعدي', en: 'Price ↑' }],
            ['amount_desc', { ar: 'السعر تنازلي', en: 'Price ↓' }],
            ['delivery_asc', { ar: 'الأسرع تسليم', en: 'Fastest' }],
            ['newest', { ar: 'الأحدث', en: 'Newest' }],
          ] as Array<[SortKey, { ar: string; en: string }]>).map(([k, lbl]) => (
            <Button key={k} size="sm" variant={sort === k ? 'default' : 'outline'} onClick={() => setSort(k)} className="rounded-lg">
              <Bi ar={lbl.ar} en={lbl.en} />
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : !sorted.length ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">
            <Bi ar="لم يصل أي عرض بعد" en="No quotes received yet" />
          </CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {sorted.map((q, idx) => {
              const best = idx === 0 && sort === 'amount_asc';
              const accepted = q.status === 'accepted';
              return (
                <Card key={q.id} className={`hover-lift ${accepted ? 'ring-2 ring-emerald-500/50' : best ? 'ring-2 ring-primary/40' : ''}`}>
                  <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {best && !awarded && <Badge className="bg-primary/15 text-primary"><Trophy className="w-3 h-3 me-1" /><Bi ar="الأفضل سعراً" en="Best price" /></Badge>}
                        {accepted && <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"><Check className="w-3 h-3 me-1" /><Bi ar="معتمد" en="Accepted" /></Badge>}
                        <Badge variant="outline">{q.status}</Badge>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <div className="text-2xl font-bold tech-content">{q.amount.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{q.currency}</span></div>
                        {q.delivery_days != null && (
                          <div className="text-sm text-muted-foreground inline-flex items-center gap-1"><Clock className="w-3 h-3" /><span className="tech-content">{q.delivery_days}</span> <Bi ar="يوم" en="days" /></div>
                        )}
                      </div>
                      {q.message && (
                        <div className="text-sm text-muted-foreground mt-2 line-clamp-2 inline-flex items-start gap-1">
                          <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{q.message}</span>
                        </div>
                      )}
                    </div>
                    {!awarded && !accepted && (
                      <Button onClick={() => acceptMut.mutate(q.id)} disabled={acceptMut.isPending} className="h-11 rounded-xl">
                        <Check className="w-4 h-4 me-2" />
                        <Bi ar="اعتماد العرض" en="Accept Quote" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardRfqDetail;