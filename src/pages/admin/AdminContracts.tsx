import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Plus, Filter, ExternalLink, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getContractStatusMeta } from '@/lib/contract-statuses';

interface AdminContractRow {
  id: string;
  contract_number: string;
  title_ar: string | null;
  title_en: string | null;
  status: string;
  total_amount: number | null;
  currency_code: string | null;
  provider_id: string;
  client_id: string | null;
  created_at: string;
  start_date: string | null;
  end_date: string | null;
}

const STATUS_FILTERS = ['all', 'draft', 'pending_approval', 'active', 'completed', 'cancelled', 'disputed'] as const;

export default function AdminContracts() {
  const { isRTL } = useLanguage();
  useNoIndex();
  const [status, setStatus] = useState<typeof STATUS_FILTERS[number]>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-contracts', status],
    queryFn: async () => {
      let q = supabase
        .from('contracts')
        .select('id, contract_number, title_ar, title_en, status, total_amount, currency_code, provider_id, client_id, created_at, start_date, end_date')
        .order('created_at', { ascending: false })
        .limit(200);
      if (status !== 'all') q = q.eq('status', status as AdminContractRow['status']);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AdminContractRow[];
    },
    staleTime: 15_000,
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (!search.trim()) return list;
    const s = search.trim().toLowerCase();
    return list.filter((c) =>
      [c.contract_number, c.title_ar, c.title_en].filter(Boolean).some((v) => v!.toLowerCase().includes(s)),
    );
  }, [data, search]);

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-accent/10 p-2"><FileText className="w-5 h-5 text-accent" /></div>
          <div>
            <h1 className="font-heading font-bold text-xl sm:text-2xl">
              {isRTL ? 'إدارة العقود' : 'Contracts Administration'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isRTL ? 'عرض كل العقود وإنشاء عقود بالنيابة بين طرفين' : 'View all contracts and create on-behalf contracts between parties'}
            </p>
          </div>
        </div>
        <Button asChild variant="default" size="sm" className="gap-1.5">
          <Link to="/admin/contracts/create">
            <Plus className="w-4 h-4" />{isRTL ? 'إنشاء عقد بالنيابة' : 'Create on Behalf'}
          </Link>
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent className="p-3 sm:p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
            <Input
              dir="auto"
              className="ps-9 h-10 rounded-xl"
              placeholder={isRTL ? 'بحث برقم العقد أو العنوان' : 'Search by number or title'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={status} onValueChange={(v) => setStatus(v as typeof STATUS_FILTERS[number])}>
              <SelectTrigger className="w-[180px] h-10 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === 'all' ? (isRTL ? 'كل الحالات' : 'All') : (getContractStatusMeta(s)[isRTL ? 'ar' : 'en'] ?? s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : isError ? (
        <Card className="border-destructive/30"><CardContent className="p-4 text-sm text-destructive">{isRTL ? 'فشل تحميل العقود' : 'Failed to load contracts'}</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">{isRTL ? 'لا توجد عقود' : 'No contracts found'}</CardContent></Card>
      ) : (
        <ul className="space-y-2">
          {filtered.map((c) => {
            const meta = getContractStatusMeta(c.status);
            const title = (isRTL ? c.title_ar : (c.title_en || c.title_ar)) || c.contract_number;
            return (
              <li key={c.id}>
                <Card className="hover-lift">
                  <CardContent className="p-3 sm:p-4 flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link to={`/contracts/${c.id}`} className="font-medium text-sm hover:underline truncate">{title}</Link>
                        <Badge variant="secondary" className="tech-content text-[10px]" dir="ltr">{c.contract_number}</Badge>
                        <Badge variant="outline" className="text-[10px]">{meta[isRTL ? 'ar' : 'en']}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 tech-content" dir="ltr">
                        {(c.total_amount ?? 0).toLocaleString()} {c.currency_code} •{' '}
                        {new Date(c.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                      </p>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="gap-1">
                      <Link to={`/contracts/${c.id}`}>
                        {isRTL ? 'عرض' : 'Open'}<ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}