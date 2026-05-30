import React, { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Inbox, Send } from 'lucide-react';
import { toast } from 'sonner';
import { listOpenRfqs, createQuote } from '@/modules/rfq/services';

const INDUSTRIES = [
  { key: 'all', ar: 'الكل', en: 'All' },
  { key: 'aluminum', ar: 'الألمنيوم', en: 'Aluminum' },
  { key: 'glass', ar: 'الزجاج', en: 'Glass' },
  { key: 'wood', ar: 'الأخشاب', en: 'Wood' },
  { key: 'steel', ar: 'الحديد', en: 'Steel' },
] as const;

const DashboardRfqInbox: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [quote, setQuote] = useState({ amount: '', delivery_days: '', message: '' });
  const [industry, setIndustry] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['rfq-open'],
    queryFn: listOpenRfqs,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const minB = minBudget ? Number(minBudget) : null;
    const maxB = maxBudget ? Number(maxBudget) : null;
    return (data ?? []).filter((rfq) => {
      if (industry !== 'all' && rfq.industry !== industry) return false;
      if (q && !rfq.title.toLowerCase().includes(q) && !(rfq.description ?? '').toLowerCase().includes(q)) return false;
      if (minB !== null && (rfq.budget_max ?? rfq.budget_min ?? 0) < minB) return false;
      if (maxB !== null && (rfq.budget_min ?? rfq.budget_max ?? Infinity) > maxB) return false;
      return true;
    });
  }, [data, industry, search, minBudget, maxBudget]);

  const submit = useMutation({
    mutationFn: (rfqId: string) => createQuote({
      rfq_id: rfqId,
      provider_user_id: user!.id,
      amount: Number(quote.amount),
      delivery_days: quote.delivery_days ? Number(quote.delivery_days) : undefined,
      message: quote.message || undefined,
    }),
    onSuccess: () => {
      toast.success(isRTL ? 'تم إرسال العرض' : 'Quote sent');
      setOpenId(null);
      setQuote({ amount: '', delivery_days: '', message: '' });
      qc.invalidateQueries({ queryKey: ['rfq-open'] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Inbox className="w-6 h-6 text-primary" />
            {isRTL ? 'صندوق طلبات الأسعار' : 'RFQ Inbox'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL ? 'تصفح الطلبات المفتوحة وأرسل عرضك' : 'Browse open requests and submit your quote'}
          </p>
        </div>

        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <Input
              placeholder={isRTL ? 'ابحث في الطلبات…' : 'Search requests…'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 rounded-xl md:col-span-2"
              dir="auto"
            />
            <select
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            >
              {INDUSTRIES.map((i) => (
                <option key={i.key} value={i.key}>{isRTL ? i.ar : i.en}</option>
              ))}
            </select>
            <Input
              type="number"
              placeholder={isRTL ? 'ميزانية من' : 'Budget from'}
              value={minBudget}
              onChange={(e) => setMinBudget(e.target.value)}
              className="h-11 rounded-xl tech-content"
            />
            <Input
              type="number"
              placeholder={isRTL ? 'ميزانية إلى' : 'Budget to'}
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
              className="h-11 rounded-xl tech-content"
            />
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : !filtered.length ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">
            {isRTL ? 'لا توجد طلبات مطابقة للفلتر' : 'No requests match your filters'}
          </CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map(rfq => (
              <Card key={rfq.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-muted-foreground tech-content">{rfq.ref_id}</span>
                        <Badge variant="secondary">{rfq.industry}</Badge>
                      </div>
                      <div className="font-semibold">{rfq.title}</div>
                      {rfq.description && (
                        <div className="text-sm text-muted-foreground mt-1">{rfq.description}</div>
                      )}
                    </div>
                    <Button
                      variant={openId === rfq.id ? 'secondary' : 'default'}
                      onClick={() => setOpenId(openId === rfq.id ? null : rfq.id)}
                      className="h-10 rounded-xl"
                    >
                      {openId === rfq.id ? (isRTL ? 'إغلاق' : 'Close') : (isRTL ? 'تقديم عرض' : 'Submit Quote')}
                    </Button>
                  </div>
                  {openId === rfq.id && (
                    <div className="border-t pt-3 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                          type="number"
                          placeholder={isRTL ? `السعر (${rfq.currency})` : `Amount (${rfq.currency})`}
                          value={quote.amount}
                          onChange={(e) => setQuote({ ...quote, amount: e.target.value })}
                          className="h-12 rounded-xl tech-content"
                        />
                        <Input
                          type="number"
                          placeholder={isRTL ? 'مدة التسليم (أيام)' : 'Delivery days'}
                          value={quote.delivery_days}
                          onChange={(e) => setQuote({ ...quote, delivery_days: e.target.value })}
                          className="h-12 rounded-xl tech-content"
                        />
                      </div>
                      <Textarea
                        placeholder={isRTL ? 'رسالة للمشتري' : 'Message to buyer'}
                        value={quote.message}
                        onChange={(e) => setQuote({ ...quote, message: e.target.value })}
                        rows={3}
                        dir="auto"
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={() => submit.mutate(rfq.id)}
                          disabled={!quote.amount || submit.isPending}
                          className="h-12 rounded-xl"
                        >
                          <Send className="w-4 h-4 me-2" />
                          {isRTL ? 'إرسال العرض' : 'Send Quote'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardRfqInbox;