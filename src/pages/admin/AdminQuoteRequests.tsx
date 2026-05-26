import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import {
  listAdminQuoteRequests,
  countQuoteRequestFiles,
} from '@/modules/leads/services/list';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ReceiptText, Search, Eye, Phone, MapPin, Tag, Calendar, Paperclip, Filter,
} from 'lucide-react';
import { useNoIndex } from '@/hooks/useNoIndex';
import {
  QUOTE_STATUS_LABEL_AR, QUOTE_STATUS_TONE, QUOTE_STATUSES,
  CUSTOMER_TYPE_LABEL_AR, SECTOR_LABEL_AR, type QuoteStatus,
} from '@/lib/quoteRequests';
import { ReferenceTag } from '@/components/reference/ReferenceTag';

const AdminQuoteRequests: React.FC = () => {
  useNoIndex();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

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

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <header>
          <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
            <ReceiptText className="h-5 w-5" /> طلبات عروض الأسعار
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            راجع الطلبات الواردة، غيّر حالتها، وأضف ملاحظات داخلية للفريق.
          </p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="الإجمالي" value={stats.total} tone="bg-muted text-foreground" />
          <StatCard label="جديد" value={stats.new} tone="bg-primary/10 text-primary" />
          <StatCard label="قيد المراجعة" value={stats.under_review} tone="bg-warning/10 text-warning" />
          <StatCard label="تم توجيهه" value={stats.matched} tone="bg-info/10 text-info" />
          <StatCard label="مكتمل" value={stats.completed} tone="bg-emerald-500/10 text-emerald-600" />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                dir="auto" placeholder="بحث بالاسم أو رقم الجوال"
                className="ps-9" value={search} onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                {QUOTE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{QUOTE_STATUS_LABEL_AR[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger><SelectValue placeholder="القطاع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل القطاعات</SelectItem>
                {Object.entries(SECTOR_LABEL_AR).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="نوع العميل" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                {Object.entries(CUSTOMER_TYPE_LABEL_AR).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              dir="auto" placeholder="فلترة حسب المدينة"
              className="md:col-span-1" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}
            />
          </CardContent>
        </Card>

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
            const tone = QUOTE_STATUS_TONE[r.status as QuoteStatus] ?? 'bg-muted text-foreground border-border';
            const fc = fileCounts?.get(r.id) ?? 0;
            return (
              <Card key={r.id}>
                <CardContent className="p-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {r.ref_id
                        ? <ReferenceTag refId={r.ref_id} isRTL />
                        : <span className="font-mono text-xs text-muted-foreground tech-content">#{r.id.slice(-6)}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${tone}`}>
                        {QUOTE_STATUS_LABEL_AR[r.status as QuoteStatus] ?? r.status}
                      </span>
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
                  <Button asChild size="sm" variant="outline" className="min-h-[36px]">
                    <Link to={`/admin/quote-requests/${r.id}`}><Eye className="h-3.5 w-3.5" /> عرض التفاصيل</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

const StatCard: React.FC<{ label: string; value: number; tone: string }> = ({ label, value, tone }) => (
  <Card><CardContent className={`p-3 rounded-xl ${tone}`}>
    <div className="text-xs opacity-80">{label}</div>
    <div className="text-2xl font-bold tech-content">{value}</div>
  </CardContent></Card>
);

export default AdminQuoteRequests;