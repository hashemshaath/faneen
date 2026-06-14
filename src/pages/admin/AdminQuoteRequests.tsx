import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  listAdminQuoteRequests,
  countQuoteRequestFiles,
} from '@/modules/leads/services/list';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ReceiptText, Eye, Phone, MapPin, Tag, Calendar, Paperclip, Filter,
} from 'lucide-react';
import { useNoIndex } from '@/hooks/useNoIndex';
import {
  QUOTE_STATUS_LABEL_AR, QUOTE_STATUSES,
  CUSTOMER_TYPE_LABEL_AR, SECTOR_LABEL_AR, type QuoteStatus,
} from '@/lib/quoteRequests';
import { ReferenceBadge } from '@/components/reference/ReferenceBadge';
import { ReferenceLinkCopy } from '@/components/reference/ReferenceLinkCopy';
import {
  ProcurementAdminPageShell,
  ProcurementFiltersBar,
  ProcurementStatsStrip,
  QuoteStatusBadge,
  type ProcurementStatsItem,
} from '@/components/admin/procurement/shared';
import {
  QuoteRequestDetailsDrawer,
  buildQuoteRequestDrawerProps,
} from '@/components/admin/procurement/quote-requests';

const AdminQuoteRequests: React.FC = () => {
  useNoIndex();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [viewingQuoteRequestId, setViewingQuoteRequestId] = useState<string | null>(null);

  const { data: rows, isLoading } = useQuery({
    queryKey: ['admin-quote-requests'],
    queryFn: () => listAdminQuoteRequests(),
  });

  const ids = useMemo(() => (rows ?? []).map((r) => r.id), [rows]);
  const { data: fileCounts } = useQuery({
    queryKey: ['admin-quote-file-counts', ids.length],
    enabled: ids.length > 0,
    queryFn: () => countQuoteRequestFiles(ids),
  });

  const stats = useMemo(() => {
    const s = { total: 0, new: 0, under_review: 0, matched: 0, completed: 0 };
    (rows ?? []).forEach((r) => {
      s.total++;
      if (r.status === 'new') s.new++;
      if (r.status === 'under_review') s.under_review++;
      if (r.status === 'matched') s.matched++;
      if (r.status === 'completed') s.completed++;
    });
    return s;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (sectorFilter !== 'all' && r.sector !== sectorFilter) return false;
      if (typeFilter !== 'all' && r.customer_type !== typeFilter) return false;
      if (cityFilter && !r.city.toLowerCase().includes(cityFilter.toLowerCase())) return false;
      if (q && !r.customer_name.toLowerCase().includes(q) && !r.customer_phone.includes(q)) return false;
      return true;
    });
  }, [rows, statusFilter, sectorFilter, typeFilter, cityFilter, search]);

  const statsItems: ProcurementStatsItem[] = useMemo(() => [
    { key: 'total', label: 'الإجمالي', value: stats.total, tone: 'muted' },
    { key: 'new', label: 'جديد', value: stats.new, tone: 'primary' },
    { key: 'under_review', label: 'قيد المراجعة', value: stats.under_review, tone: 'warning' },
    { key: 'matched', label: 'تم توجيهه', value: stats.matched, tone: 'info' },
    { key: 'completed', label: 'مكتمل', value: stats.completed, tone: 'success' },
  ], [stats]);

  const canReset =
    statusFilter !== 'all' ||
    sectorFilter !== 'all' ||
    typeFilter !== 'all' ||
    cityFilter !== '' ||
    search !== '';
  const resetFilters = () => {
    setStatusFilter('all');
    setSectorFilter('all');
    setTypeFilter('all');
    setCityFilter('');
    setSearch('');
  };

  const viewingRow = useMemo(
    () => (rows ?? []).find((r) => r.id === viewingQuoteRequestId) ?? null,
    [rows, viewingQuoteRequestId],
  );
  const drawerProps = viewingRow
    ? buildQuoteRequestDrawerProps({
        row: viewingRow,
        fileCount: fileCounts?.get(viewingRow.id),
        isRTL: true,
        onClose: () => setViewingQuoteRequestId(null),
      })
    : null;

  return (
    <ProcurementAdminPageShell
      icon={ReceiptText}
      title="طلبات عروض الأسعار"
      description="راجع الطلبات الواردة، غيّر حالتها، وأضف ملاحظات داخلية للفريق."
      statsSlot={<ProcurementStatsStrip items={statsItems} columnsClassName="grid-cols-2 sm:grid-cols-5" />}
      filtersSlot={
        <ProcurementFiltersBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="بحث بالاسم أو رقم الجوال"
          status={{
            value: statusFilter,
            onChange: setStatusFilter,
            placeholder: 'الحالة',
            allLabel: 'كل الحالات',
            options: QUOTE_STATUSES.map((s) => ({ value: s, label: QUOTE_STATUS_LABEL_AR[s] })),
          }}
          sector={{
            value: sectorFilter,
            onChange: setSectorFilter,
            placeholder: 'القطاع',
            allLabel: 'كل القطاعات',
            options: Object.entries(SECTOR_LABEL_AR).map(([k, v]) => ({ value: k, label: v })),
          }}
          type={{
            value: typeFilter,
            onChange: setTypeFilter,
            placeholder: 'نوع العميل',
            allLabel: 'كل الأنواع',
            options: Object.entries(CUSTOMER_TYPE_LABEL_AR).map(([k, v]) => ({ value: k, label: v })),
          }}
          cityValue={cityFilter}
          onCityChange={setCityFilter}
          cityPlaceholder="فلترة حسب المدينة"
          onReset={resetFilters}
          canReset={canReset}
          resetLabel="إعادة الضبط"
        />
      }
    >
      <div
        className={
          drawerProps
            ? 'grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start'
            : 'space-y-3'
        }
      >
        <div className="space-y-3 min-w-0">
        {/* List */}
        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Filter className="mx-auto h-8 w-8 mb-2" />
            لا توجد طلبات مطابقة للفلاتر.
          </CardContent></Card>
        )}

        <div className="space-y-2">
          {filtered.map((r) => {
            const fc = fileCounts?.get(r.id) ?? 0;
            const isActive = r.id === viewingQuoteRequestId;
            return (
              <Card key={r.id} className={isActive ? 'border-primary/50 ring-1 ring-primary/20' : undefined}>
                <CardContent className="p-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {r.ref_id
                        ? (
                            <span className="inline-flex items-center gap-1">
                              <ReferenceBadge refId={r.ref_id} />
                              <ReferenceLinkCopy refId={r.ref_id} isRTL={true} />
                            </span>
                          )
                        : <span className="font-mono text-xs text-muted-foreground tech-content">#{r.id.slice(-6)}</span>}
                      <QuoteStatusBadge status={r.status as QuoteStatus} />
                      <span className="text-xs text-muted-foreground tech-content inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(r.created_at).toLocaleDateString('ar-SA-u-nu-latn')}
                      </span>
                    </div>
                    <div className="font-medium truncate">{r.customer_name}</div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                      <span className="inline-flex items-center gap-1 tech-content"><Phone className="h-3 w-3" />{r.customer_phone}</span>
                      <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" />{SECTOR_LABEL_AR[r.sector] ?? r.sector}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{r.city}</span>
                      <span>{CUSTOMER_TYPE_LABEL_AR[r.customer_type] ?? r.customer_type}</span>
                      {fc > 0 && <span className="inline-flex items-center gap-1"><Paperclip className="h-3 w-3" />{fc}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="min-h-[36px]"
                      onClick={() => setViewingQuoteRequestId(r.id)}
                      aria-pressed={isActive}
                    >
                      <Eye className="h-3.5 w-3.5" /> معاينة
                    </Button>
                    <Button asChild size="sm" variant="outline" className="min-h-[36px]">
                      <Link to={`/admin/quote-requests/${r.id}`}>فتح التفاصيل</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        </div>
        {drawerProps ? (
          <div className="lg:sticky lg:top-4">
            <QuoteRequestDetailsDrawer {...drawerProps} />
          </div>
        ) : null}
      </div>
    </ProcurementAdminPageShell>
  );
};

export default AdminQuoteRequests;