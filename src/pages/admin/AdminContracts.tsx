import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Plus, Filter, ExternalLink, Search, CheckCircle2, Clock, Ban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getContractStatusMeta, type ContractStatus } from '@/lib/contract-statuses';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminKpiCard } from '@/components/admin/AdminKpiCard';

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
      if (status !== 'all') q = q.eq('status', status as ContractStatus);
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

  const stats = useMemo(() => {
    const list = data ?? [];
    return {
      total: list.length,
      active: list.filter((c) => c.status === 'active').length,
      pending: list.filter((c) => c.status === 'pending_approval' || c.status === 'draft').length,
      cancelled: list.filter((c) => c.status === 'cancelled' || c.status === 'disputed').length,
    };
  }, [data]);

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-[1600px] space-y-5">
        <AdminPageHeader
          tone="accent"
          icon={FileText}
          eyebrow={isRTL ? 'لوحة الإدارة' : 'Admin Console'}
          breadcrumbs={[
            { label: isRTL ? 'الإدارة' : 'Admin', href: '/admin' },
            { label: isRTL ? 'إدارة العقود' : 'Contracts' },
          ]}
          title={isRTL ? 'إدارة العقود' : 'Contracts Administration'}
          subtitle={isRTL
            ? 'عرض كل العقود وإنشاء عقود بالنيابة بين طرفين، مع متابعة الحالة والقيمة الإجمالية.'
            : 'Browse every contract and create on-behalf contracts between parties, with status and totals.'}
          actions={
            <Button asChild size="sm" className="h-10 gap-1.5 rounded-xl">
              <Link to="/admin/contracts/create">
                <Plus className="w-4 h-4" />{isRTL ? 'إنشاء عقد بالنيابة' : 'Create on Behalf'}
              </Link>
            </Button>
          }
          kpiSlot={
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <AdminKpiCard label={isRTL ? 'إجمالي العقود' : 'Total'} value={stats.total} icon={FileText} tone="primary" />
              <AdminKpiCard label={isRTL ? 'نشطة' : 'Active'} value={stats.active} icon={CheckCircle2} tone="success" />
              <AdminKpiCard label={isRTL ? 'بانتظار/مسودة' : 'Pending / Draft'} value={stats.pending} icon={Clock} tone="warning" />
              <AdminKpiCard label={isRTL ? 'ملغاة/متنازع' : 'Cancelled / Disputed'} value={stats.cancelled} icon={Ban} tone="destructive" />
            </div>
          }
        />

      <Card>
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
                        {new Date(c.created_at).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}
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
    </DashboardLayout>
  );
}