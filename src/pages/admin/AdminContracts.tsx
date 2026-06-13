import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Plus, ExternalLink, CheckCircle2, Clock, Ban, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { type ContractStatus } from '@/lib/contract-statuses';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Bi, useBi } from '@/components/common/Bilingual';
import {
  ContractAdminPageShell,
  ContractFiltersBar,
  ContractStatsStrip,
  ContractStatusBadge,
  ContractDetailsDrawer,
  buildContractDetailsDrawerProps,
  type ContractStatsItem,
} from '@/components/admin/contracts/shared';

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
type StatusFilter = typeof STATUS_FILTERS[number];

export default function AdminContracts() {
  const { isRTL } = useLanguage();
  const bi = useBi();
  useNoIndex();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [viewingContractId, setViewingContractId] = useState<string | null>(null);

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

  const statsItems: ContractStatsItem[] = [
    { key: 'total', label: bi('إجمالي العقود', 'Total'), value: stats.total, icon: FileText, tone: 'info' },
    { key: 'active', label: bi('نشطة', 'Active'), value: stats.active, icon: CheckCircle2, tone: 'success' },
    { key: 'pending', label: bi('بانتظار/مسودة', 'Pending / Draft'), value: stats.pending, icon: Clock, tone: 'warning' },
    { key: 'cancelled', label: bi('ملغاة/متنازع', 'Cancelled / Disputed'), value: stats.cancelled, icon: Ban, tone: 'destructive' },
  ];

  const viewingContract = useMemo(
    () => (data ?? []).find((c) => c.id === viewingContractId) ?? null,
    [data, viewingContractId],
  );

  return (
    <DashboardLayout>
      <ContractAdminPageShell
        tone="accent"
        icon={FileText}
        eyebrow={bi('لوحة الإدارة', 'Admin Console')}
        title={bi('إدارة العقود', 'Contracts Administration')}
        description={bi(
          'عرض كل العقود وإنشاء عقود بالنيابة بين طرفين، مع متابعة الحالة والقيمة الإجمالية.',
          'Browse every contract and create on-behalf contracts between parties, with status and totals.',
        )}
        actionsSlot={
          <Button asChild size="sm" className="h-10 gap-1.5 rounded-xl">
            <Link to="/admin/contracts/create">
              <Plus className="w-4 h-4" />
              <Bi ar="إنشاء عقد بالنيابة" en="Create on Behalf" />
            </Link>
          </Button>
        }
        statsSlot={<ContractStatsStrip items={statsItems} />}
        filtersSlot={
          <ContractFiltersBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={bi('بحث برقم العقد أو العنوان', 'Search by number or title')}
            status={status}
            statusOptions={STATUS_FILTERS}
            onStatusChange={(v) => setStatus(v as StatusFilter)}
            allLabel={bi('كل الحالات', 'All')}
            isRTL={isRTL}
            onReset={() => { setSearch(''); setStatus('all'); }}
            resetLabel={bi('مسح', 'Clear')}
          />
        }
      >
        <div
          className={cn(
            'grid gap-4',
            viewingContract ? 'lg:grid-cols-[minmax(0,1fr)_360px]' : 'grid-cols-1',
          )}
        >
          <div className="min-w-0">
            {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : isError ? (
          <Card className="border-destructive/30"><CardContent className="p-4 text-sm text-destructive"><Bi ar="فشل تحميل العقود" en="Failed to load contracts" /></CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground"><Bi ar="لا توجد عقود" en="No contracts found" /></CardContent></Card>
        ) : (
          <ul className="space-y-2">
            {filtered.map((c) => {
              const title = (isRTL ? c.title_ar : (c.title_en || c.title_ar)) || c.contract_number;
              const isSelected = c.id === viewingContractId;
              return (
                <li key={c.id}>
                  <Card className={cn('hover-lift', isSelected && 'ring-1 ring-primary/40')}>
                    <CardContent className="p-3 sm:p-4 flex items-center gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link to={`/contracts/${c.id}`} className="font-medium text-sm hover:underline truncate">{title}</Link>
                          <Badge variant="secondary" className="tech-content text-[10px]" dir="ltr">{c.contract_number}</Badge>
                          <ContractStatusBadge status={c.status} isRTL={isRTL} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 tech-content" dir="ltr">
                          {(c.total_amount ?? 0).toLocaleString()} {c.currency_code} •{' '}
                          {new Date(c.created_at).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant={isSelected ? 'secondary' : 'ghost'}
                        size="sm"
                        className="gap-1"
                        onClick={() => setViewingContractId(isSelected ? null : c.id)}
                        aria-pressed={isSelected}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <Bi ar="التفاصيل" en="Details" />
                      </Button>
                      <Button asChild variant="ghost" size="sm" className="gap-1">
                        <Link to={`/contracts/${c.id}`}>
                          <Bi ar="عرض" en="Open" /><ExternalLink className="w-3.5 h-3.5" />
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
          {viewingContract ? (
            <div className="lg:sticky lg:top-4 self-start">
              <ContractDetailsDrawer
                {...buildContractDetailsDrawerProps({
                  contract: viewingContract,
                  isRTL,
                  onClose: () => setViewingContractId(null),
                })}
              />
            </div>
          ) : null}
        </div>
      </ContractAdminPageShell>
    </DashboardLayout>
  );
}