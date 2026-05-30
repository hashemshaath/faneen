import React, { useEffect, useMemo, useState } from 'react';
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

type SortKey =
  | 'newest'
  | 'oldest'
  | 'budget_max_desc'
  | 'budget_max_asc'
  | 'budget_min_asc';

const SORTS: ReadonlyArray<{ key: SortKey; ar: string; en: string }> = [
  { key: 'newest', ar: 'الأحدث', en: 'Newest' },
  { key: 'oldest', ar: 'الأقدم', en: 'Oldest' },
  { key: 'budget_max_desc', ar: 'الميزانية: الأعلى', en: 'Budget: highest' },
  { key: 'budget_max_asc', ar: 'الميزانية: الأقل', en: 'Budget: lowest' },
  { key: 'budget_min_asc', ar: 'السعر الأدنى للميزانية', en: 'Min budget ↑' },
];

const FILTERS_STORAGE_KEY = 'qitaat_rfq_inbox_filters_v1';

interface PersistedFilters {
  industry: string;
  search: string;
  minBudget: string;
  maxBudget: string;
  sort: SortKey;
  perPage: number;
}

const DEFAULT_FILTERS: PersistedFilters = {
  industry: 'all',
  search: '',
  minBudget: '',
  maxBudget: '',
  sort: 'newest',
  perPage: 10,
};

function loadFilters(): PersistedFilters {
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw) as Partial<PersistedFilters>;
    return { ...DEFAULT_FILTERS, ...parsed };
  } catch {
    return DEFAULT_FILTERS;
  }
}

const DashboardRfqInbox: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const initial = useMemo(loadFilters, []);
  const [openId, setOpenId] = useState<string | null>(null);
  const [quote, setQuote] = useState({ amount: '', delivery_days: '', message: '' });
  const [industry, setIndustry] = useState<string>(initial.industry);
  const [search, setSearch] = useState(initial.search);
  const [minBudget, setMinBudget] = useState(initial.minBudget);
  const [maxBudget, setMaxBudget] = useState(initial.maxBudget);
  const [sort, setSort] = useState<SortKey>(initial.sort);
  const [page, setPage] = useState(1);
  const perPage = initial.perPage;

  // Persist filters to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        FILTERS_STORAGE_KEY,
        JSON.stringify({ industry, search, minBudget, maxBudget, sort, perPage }),
      );
    } catch {
      // ignore quota errors
    }
  }, [industry, search, minBudget, maxBudget, sort, perPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [industry, search, minBudget, maxBudget, sort]);

  const { data, isLoading } = useQuery({
    queryKey: ['rfq-open'],
    queryFn: listOpenRfqs,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const minB = minBudget ? Number(minBudget) : null;
    const maxB = maxBudget ? Number(maxBudget) : null;
    const matched = (data ?? []).filter((rfq) => {
      if (industry !== 'all' && rfq.industry !== industry) return false;
      if (q && !rfq.title.toLowerCase().includes(q) && !(rfq.description ?? '').toLowerCase().includes(q)) return false;
      if (minB !== null && (rfq.budget_max ?? rfq.budget_min ?? 0) < minB) return false;
      if (maxB !== null && (rfq.budget_min ?? rfq.budget_max ?? Infinity) > maxB) return false;
      return true;
    });
    const sorted = [...matched].sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return a.created_at.localeCompare(b.created_at);
        case 'budget_max_desc':
          return (b.budget_max ?? -Infinity) - (a.budget_max ?? -Infinity);
        case 'budget_max_asc':
          return (a.budget_max ?? Infinity) - (b.budget_max ?? Infinity);
        case 'budget_min_asc':
          return (a.budget_min ?? Infinity) - (b.budget_min ?? Infinity);
        case 'newest':
        default:
          return b.created_at.localeCompare(a.created_at);
      }
    });
    return sorted;
  }, [data, industry, search, minBudget, maxBudget, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * perPage, currentPage * perPage),
    [filtered, currentPage, perPage],
  );

  const resetFilters = () => {
    setIndustry(DEFAULT_FILTERS.industry);
    setSearch(DEFAULT_FILTERS.search);
    setMinBudget(DEFAULT_FILTERS.minBudget);
    setMaxBudget(DEFAULT_FILTERS.maxBudget);
    setSort(DEFAULT_FILTERS.sort);
  };

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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">
              {isRTL ? 'ترتيب:' : 'Sort:'}
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>{isRTL ? s.ar : s.en}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="tech-content">
              {isRTL
                ? `${filtered.length} نتيجة`
                : `${filtered.length} result${filtered.length === 1 ? '' : 's'}`}
            </span>
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 rounded-lg">
              {isRTL ? 'إعادة التعيين' : 'Reset'}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : !filtered.length ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">
            {isRTL ? 'لا توجد طلبات مطابقة للفلتر' : 'No requests match your filters'}
          </CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {paged.map(rfq => (
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

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-9 rounded-lg"
                >
                  {isRTL ? 'السابق' : 'Previous'}
                </Button>
                <span className="text-sm tech-content text-muted-foreground">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-9 rounded-lg"
                >
                  {isRTL ? 'التالي' : 'Next'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardRfqInbox;