/**
 * DashboardClients — Pro v2
 *
 * Adds on top of v1: sort, CSV export, density toggle, inline expandable
 * detail (lazy-loaded recent contracts/leads), top-by-value strip,
 * keyboard `/` to focus search, polished gradient header.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Users, Search, RefreshCw, UserCheck, UserPlus, FileText, Inbox, Wallet,
  ChevronLeft, ChevronRight, ChevronDown, Download, ArrowUpDown, Rows3, Rows2,
  Crown, Loader2,
} from 'lucide-react';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface ClientRow {
  client_key: string;
  user_id: string | null;
  is_guest: boolean;
  full_name: string | null;
  email_masked: string | null;
  phone_masked: string | null;
  ref_id: string | null;
  total_contracts: number;
  active_contracts: number;
  total_leads: number;
  total_value: number;
  currency: string;
  last_interaction: string | null;
  has_account: boolean;
}

type FilterKey = 'all' | 'registered' | 'guest' | 'has_active' | 'leads_only';
type SortKey   = 'recent' | 'value' | 'contracts' | 'leads' | 'name';
type Density   = 'comfortable' | 'compact';

const FILTERS: Array<{ key: FilterKey; ar: string; en: string }> = [
  { key: 'all',         ar: 'الكل',                en: 'All' },
  { key: 'registered',  ar: 'مسجَّلون',           en: 'Registered' },
  { key: 'guest',       ar: 'ضيوف',                en: 'Guests' },
  { key: 'has_active',  ar: 'عقود فعّالة',        en: 'Active contracts' },
  { key: 'leads_only',  ar: 'طلبات فقط (محتملون)', en: 'Leads only' },
];

const SORTS: Array<{ key: SortKey; ar: string; en: string }> = [
  { key: 'recent',    ar: 'الأحدث تواصلاً',  en: 'Most recent' },
  { key: 'value',     ar: 'الأعلى قيمةً',     en: 'Highest value' },
  { key: 'contracts', ar: 'الأكثر عقوداً',    en: 'Most contracts' },
  { key: 'leads',     ar: 'الأكثر طلبات',     en: 'Most leads' },
  { key: 'name',      ar: 'حسب الاسم',         en: 'By name' },
];

const PAGE_SIZE = 25;

const DashboardClients: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<SortKey>('recent');
  const [density, setDensity] = useState<Density>(() =>
    (typeof window !== 'undefined' && (localStorage.getItem('qitaat_clients_density') as Density)) || 'comfortable'
  );
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem('qitaat_clients_density', density); }, [density]);

  // `/` keyboard shortcut to focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['provider-clients', user?.id, filter, search, page],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        'provider_clients_list' as never,
        {
          _q: search.trim() || null,
          _filter: filter,
          _limit: PAGE_SIZE,
          _offset: page * PAGE_SIZE,
        } as never,
      );
      if (error) throw error;
      return (data as ClientRow[] | null) ?? [];
    },
  });

  const rawRows = data ?? [];

  const rows = useMemo(() => {
    const arr = [...rawRows];
    arr.sort((a, b) => {
      switch (sort) {
        case 'value':     return Number(b.total_value || 0) - Number(a.total_value || 0);
        case 'contracts': return (b.total_contracts || 0) - (a.total_contracts || 0);
        case 'leads':     return (b.total_leads || 0) - (a.total_leads || 0);
        case 'name':      return (a.full_name || '').localeCompare(b.full_name || '', isRTL ? 'ar' : 'en');
        case 'recent':
        default:
          return new Date(b.last_interaction || 0).getTime() - new Date(a.last_interaction || 0).getTime();
      }
    });
    return arr;
  }, [rawRows, sort, isRTL]);

  const stats = useMemo(() => ({
    total: rows.length,
    registered: rows.filter(r => r.has_account).length,
    guests: rows.filter(r => !r.has_account).length,
    active: rows.reduce((s, r) => s + (r.active_contracts || 0), 0),
    value: rows.reduce((s, r) => s + Number(r.total_value || 0), 0),
  }), [rows]);

  const topByValue = useMemo(
    () => [...rows].filter(r => Number(r.total_value || 0) > 0)
                   .sort((a, b) => Number(b.total_value) - Number(a.total_value))
                   .slice(0, 3),
    [rows],
  );

  const fmtMoney = (v: number, cur: string) =>
    new Intl.NumberFormat(isRTL ? 'ar-SA-u-nu-latn' : 'en-US', { maximumFractionDigits: 0 }).format(v) + ' ' + (cur || 'SAR');

  const fmtDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US', { dateStyle: 'medium' });
  };

  const exportCsv = () => {
    if (rows.length === 0) { toast.info(isRTL ? 'لا توجد بيانات للتصدير' : 'Nothing to export'); return; }
    const headers = ['Name', 'Type', 'Email', 'Phone', 'USR-ID', 'Contracts', 'Active', 'Leads', 'Total Value', 'Currency', 'Last Interaction'];
    const esc = (s: unknown) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const lines = [headers.join(',')].concat(
      rows.map(r => [
        r.full_name ?? '',
        r.has_account ? 'Registered' : 'Guest',
        r.email_masked ?? '',
        r.phone_masked ?? '',
        r.ref_id ?? '',
        r.total_contracts,
        r.active_contracts,
        r.total_leads,
        Number(r.total_value || 0),
        r.currency || 'SAR',
        r.last_interaction ?? '',
      ].map(esc).join(','))
    );
    // UTF-8 BOM for Excel Arabic
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isRTL ? 'تم تصدير CSV' : 'CSV exported');
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/10 via-background to-accent/5 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shadow-sm">
                <Users className="w-5.5 h-5.5" />
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight">{isRTL ? 'العملاء' : 'Clients'}</h1>
                <p className="text-xs text-muted-foreground">
                  {isRTL
                    ? 'كل من تعاملت معهم: عقود، طلبات خدمة، عملاء ضيوف.'
                    : 'Everyone you have engaged with: contracts, service requests, and guest clients.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5 h-9">
                <Download className="w-3.5 h-3.5" />{isRTL ? 'تصدير' : 'Export'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5 h-9">
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                {isRTL ? 'تحديث' : 'Refresh'}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          <StatCard icon={Users}      label={isRTL ? 'في الصفحة' : 'On page'}        value={stats.total} tone="primary" />
          <StatCard icon={UserCheck}  label={isRTL ? 'مسجَّلون' : 'Registered'}     value={stats.registered} tone="success" />
          <StatCard icon={UserPlus}   label={isRTL ? 'ضيوف' : 'Guests'}              value={stats.guests} tone="accent" />
          <StatCard icon={FileText}   label={isRTL ? 'عقود فعّالة' : 'Active'}      value={stats.active} tone="info" />
          <StatCard icon={Wallet}     label={isRTL ? 'إجمالي قيمة' : 'Total value'} value={fmtMoney(stats.value, 'SAR')} tone="warning" />
        </div>

        {/* Top by value */}
        {topByValue.length > 0 && (
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="p-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-warning shrink-0">
                <Crown className="w-3.5 h-3.5" />
                {isRTL ? 'الأعلى قيمةً:' : 'Top by value:'}
              </div>
              {topByValue.map((r, i) => (
                <button
                  key={r.client_key}
                  type="button"
                  onClick={() => setOpenKey(r.client_key)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background/60 border border-border/40 text-[11px] hover:bg-background shrink-0"
                >
                  <span className="font-bold text-warning">#{i + 1}</span>
                  <span className="font-semibold truncate max-w-[120px]">{r.full_name || (isRTL ? 'بدون اسم' : 'Unnamed')}</span>
                  <span className="text-muted-foreground tech-content">{fmtMoney(Number(r.total_value), r.currency)}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Filters + Search + Sort + Density */}
        <Card className="border-border/40">
          <CardContent className="p-3 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} w-4 h-4 text-muted-foreground`} />
                <Input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  placeholder={isRTL ? 'ابحث بالاسم، البريد، الجوال، أو USR-…  ( / للتركيز)' : 'Search by name, email, phone, or USR-…  (press /)'}
                  className={`h-10 ${isRTL ? 'pr-9' : 'pl-9'}`}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  <SelectTrigger className="h-10 w-[170px] gap-1 text-xs">
                    <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORTS.map(s => <SelectItem key={s.key} value={s.key} className="text-xs">{isRTL ? s.ar : s.en}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="hidden sm:flex items-center gap-0.5 border border-border/50 rounded-lg p-0.5">
                  <Button type="button" size="sm" variant={density === 'comfortable' ? 'secondary' : 'ghost'} className="h-8 w-8 p-0"
                    onClick={() => setDensity('comfortable')} title={isRTL ? 'مريح' : 'Comfortable'}>
                    <Rows3 className="w-3.5 h-3.5" />
                  </Button>
                  <Button type="button" size="sm" variant={density === 'compact' ? 'secondary' : 'ghost'} className="h-8 w-8 p-0"
                    onClick={() => setDensity('compact')} title={isRTL ? 'مكثّف' : 'Compact'}>
                    <Rows2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <Button key={f.key} type="button" size="sm"
                  variant={filter === f.key ? 'secondary' : 'ghost'}
                  className="h-8 text-[11px]"
                  onClick={() => { setFilter(f.key); setPage(0); }}>
                  {isRTL ? f.ar : f.en}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : rows.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">{isRTL ? 'لا يوجد عملاء بعد' : 'No clients yet'}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isRTL
                  ? 'ستظهر هنا قائمة بكل من قام بإنشاء عقد أو طلب خدمة معك.'
                  : 'Anyone who creates a contract or sends you a service request will appear here.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className={density === 'compact' ? 'space-y-1.5' : 'space-y-2'}>
            {rows.map((r) => (
              <ClientCard
                key={r.client_key}
                r={r}
                isRTL={isRTL}
                density={density}
                isOpen={openKey === r.client_key}
                onToggle={() => setOpenKey(openKey === r.client_key ? null : r.client_key)}
                fmtMoney={fmtMoney}
                fmtDate={fmtDate}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {(rows.length === PAGE_SIZE || page > 0) && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-muted-foreground">
              {isRTL ? `الصفحة ${page + 1}` : `Page ${page + 1}`}
            </span>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
                {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </Button>
              <Button variant="outline" size="sm" disabled={rows.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>
                {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

/* ─────────── StatCard ─────────── */
function StatCard({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: React.ReactNode; tone: 'primary' | 'success' | 'accent' | 'info' | 'warning' }) {
  const toneMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    accent:  'bg-accent/10 text-accent',
    info:    'bg-info/10 text-info',
    warning: 'bg-warning/10 text-warning',
  };
  return (
    <Card className="border-border/40 hover-lift">
      <CardContent className="p-3 flex items-center gap-2.5">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${toneMap[tone]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] text-muted-foreground truncate">{label}</div>
          <div className="text-sm font-bold truncate tech-content">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────── ClientCard with expandable detail ─────────── */
function ClientCard({
  r, isRTL, density, isOpen, onToggle, fmtMoney, fmtDate,
}: {
  r: ClientRow; isRTL: boolean; density: Density;
  isOpen: boolean; onToggle: () => void;
  fmtMoney: (v: number, c: string) => string;
  fmtDate: (s: string | null) => string;
}) {
  const initial = (r.full_name || '?').trim().charAt(0).toUpperCase();
  const contractsHref = r.user_id ? `/dashboard/contracts?client=${r.user_id}` : '/dashboard/contracts';
  const compact = density === 'compact';

  return (
    <Card className="border-border/40 hover-lift overflow-hidden">
      <CardContent className={compact ? 'p-2.5' : 'p-3.5'}>
        <div className="flex items-start gap-3">
          <div className={`${compact ? 'w-9 h-9 text-sm' : 'w-11 h-11 text-base'} rounded-xl flex items-center justify-center font-bold shrink-0 ${
            r.has_account ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'
          }`}>
            {initial}
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-semibold truncate">
                {r.full_name || (isRTL ? 'بدون اسم' : 'Unnamed')}
              </span>
              {r.has_account ? (
                <Badge variant="secondary" className="text-[9px] h-5 gap-1 bg-success/10 text-success border-success/20">
                  <UserCheck className="w-2.5 h-2.5" />{isRTL ? 'مسجَّل' : 'Registered'}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[9px] h-5 gap-1 bg-accent/10 text-accent border-accent/20">
                  <UserPlus className="w-2.5 h-2.5" />{isRTL ? 'ضيف' : 'Guest'}
                </Badge>
              )}
              {r.ref_id && <Badge variant="outline" className="text-[9px] h-5 tech-content">{r.ref_id}</Badge>}
            </div>

            {!compact && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground tech-content">
                {r.email_masked && <span dir="ltr">{r.email_masked}</span>}
                {r.phone_masked && <span dir="ltr">{r.phone_masked}</span>}
                <span>{isRTL ? 'آخر تواصل' : 'Last'}: {fmtDate(r.last_interaction)}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <Stat label={isRTL ? 'عقود' : 'Contracts'} value={r.total_contracts} icon={FileText} />
              {r.active_contracts > 0 && (
                <Stat label={isRTL ? 'فعّالة' : 'Active'} value={r.active_contracts} tone="success" icon={FileText} />
              )}
              <Stat label={isRTL ? 'طلبات' : 'Leads'} value={r.total_leads} icon={Inbox} />
              {r.total_value > 0 && (
                <Stat label={isRTL ? 'إجمالي' : 'Total'} value={fmtMoney(Number(r.total_value), r.currency)} tone="warning" icon={Wallet} />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            <Button type="button" size="sm" variant="outline" className="h-8 text-[11px] gap-1" onClick={onToggle}>
              <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              {isRTL ? 'تفاصيل' : 'Details'}
            </Button>
            <Button asChild size="sm" variant="ghost" className="h-8 text-[11px]">
              <Link to={contractsHref}>{isRTL ? 'العقود' : 'Contracts'}</Link>
            </Button>
          </div>
        </div>

        {/* Expandable detail */}
        {isOpen && <ClientDetail r={r} isRTL={isRTL} fmtMoney={fmtMoney} fmtDate={fmtDate} />}
      </CardContent>
    </Card>
  );
}

/* ─────────── Inline detail (lazy) ─────────── */
interface ContractDetailRow {
  id: string;
  contract_number: string | null;
  status: string | null;
  total_amount: number | null;
  created_at: string;
}

function ClientDetail({
  r, isRTL, fmtMoney, fmtDate,
}: {
  r: ClientRow; isRTL: boolean;
  fmtMoney: (v: number, c: string) => string;
  fmtDate: (s: string | null) => string;
}) {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['client-detail', user?.id, r.client_key],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await listContractsForOwner<ContractDetailRow>({
        providerId: user!.id,
        select: 'id, contract_number, status, total_amount, created_at',
        orderBy: { column: 'created_at', ascending: false },
        limit: 5,
        customize: (q) => {
          if (r.user_id) {
            return (q as { eq: (c: string, v: string) => unknown }).eq('client_id', r.user_id) as typeof q;
          }
          // guest: filter by either email or phone digits
          const parts = r.client_key.startsWith('g:') ? r.client_key.slice(2).split('|') : ['', ''];
          const e = parts[0] || '';
          const p = parts[1] || '';
          const b = q as {
            or: (s: string) => unknown;
            ilike: (c: string, v: string) => unknown;
          };
          if (e && p)      return b.or(`guest_client_email.ilike.${e},guest_client_phone.ilike.%${p}%`) as typeof q;
          else if (e)      return b.ilike('guest_client_email', e) as typeof q;
          else if (p)      return b.ilike('guest_client_phone', `%${p}%`) as typeof q;
          return q;
        },
      });
      if (error) throw error;
      return (data ?? []) as ContractDetailRow[];
    },
  });

  return (
    <div className="mt-3 pt-3 border-t border-border/40">
      <div className="text-[10px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
        <FileText className="w-3 h-3" />
        {isRTL ? 'آخر العقود' : 'Recent contracts'}
      </div>
      {isLoading ? (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground py-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          {isRTL ? 'جارٍ التحميل…' : 'Loading…'}
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-[10px] text-muted-foreground py-2">{isRTL ? 'لا توجد عقود مرتبطة بعد.' : 'No linked contracts yet.'}</p>
      ) : (
        <div className="space-y-1">
          {data.map(c => (
            <Link key={c.id} to={`/contracts/${c.id}`} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="outline" className="text-[9px] tech-content shrink-0">{c.contract_number || c.id.slice(0, 8)}</Badge>
                <span className="text-[10px] text-muted-foreground truncate">{fmtDate(c.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.status && (
                  <Badge variant="secondary" className="text-[9px] capitalize">{c.status.replace(/_/g, ' ')}</Badge>
                )}
                {c.total_amount != null && (
                  <span className="text-[10px] font-semibold tech-content">{fmtMoney(Number(c.total_amount), r.currency)}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone = 'muted' }: {
  label: string; value: React.ReactNode; icon: React.ElementType;
  tone?: 'muted' | 'success' | 'warning';
}) {
  const toneMap: Record<string, string> = {
    muted:   'bg-muted/40 text-foreground/80',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] ${toneMap[tone]}`}>
      <Icon className="w-2.5 h-2.5" />
      <span className="font-semibold tech-content">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

export default DashboardClients;