import React, { useMemo, useState } from 'react';
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
import { Users, Search, RefreshCw, UserCheck, UserPlus, FileText, Inbox, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Link } from 'react-router-dom';

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

const FILTERS: Array<{ key: FilterKey; ar: string; en: string }> = [
  { key: 'all',         ar: 'الكل',                en: 'All' },
  { key: 'registered',  ar: 'مسجَّلون',           en: 'Registered' },
  { key: 'guest',       ar: 'ضيوف',                en: 'Guests' },
  { key: 'has_active',  ar: 'عقود فعّالة',        en: 'Active contracts' },
  { key: 'leads_only',  ar: 'طلبات فقط (محتملون)', en: 'Leads only' },
];

const PAGE_SIZE = 25;

const DashboardClients: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

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

  const rows = data ?? [];

  const stats = useMemo(() => {
    return {
      total: rows.length,
      registered: rows.filter(r => r.has_account).length,
      guests: rows.filter(r => !r.has_account).length,
      active: rows.reduce((s, r) => s + (r.active_contracts || 0), 0),
      value: rows.reduce((s, r) => s + Number(r.total_value || 0), 0),
    };
  }, [rows]);

  const fmtMoney = (v: number, cur: string) =>
    new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', { maximumFractionDigits: 0 }).format(v) + ' ' + (cur || 'SAR');

  const fmtDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { dateStyle: 'medium' });
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
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
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5 self-end sm:self-auto">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          <StatCard icon={Users}      label={isRTL ? 'في الصفحة' : 'On page'}        value={stats.total} tone="primary" />
          <StatCard icon={UserCheck}  label={isRTL ? 'مسجَّلون' : 'Registered'}     value={stats.registered} tone="success" />
          <StatCard icon={UserPlus}   label={isRTL ? 'ضيوف' : 'Guests'}              value={stats.guests} tone="accent" />
          <StatCard icon={FileText}   label={isRTL ? 'عقود فعّالة' : 'Active'}      value={stats.active} tone="info" />
          <StatCard icon={Wallet}     label={isRTL ? 'إجمالي قيمة' : 'Total value'} value={fmtMoney(stats.value, 'SAR')} tone="warning" />
        </div>

        {/* Filters + Search */}
        <Card className="border-border/40">
          <CardContent className="p-3 space-y-3">
            <div className="relative">
              <Search className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} w-4 h-4 text-muted-foreground`} />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder={isRTL ? 'ابحث بالاسم، البريد، الجوال، أو USR-…' : 'Search by name, email, phone, or USR-…'}
                className={`h-10 ${isRTL ? 'pr-9' : 'pl-9'}`}
              />
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
          <div className="space-y-2">
            {rows.map((r) => <ClientCard key={r.client_key} r={r} isRTL={isRTL} fmtMoney={fmtMoney} fmtDate={fmtDate} />)}
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

function StatCard({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: React.ReactNode; tone: 'primary' | 'success' | 'accent' | 'info' | 'warning' }) {
  const toneMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    accent:  'bg-accent/10 text-accent',
    info:    'bg-info/10 text-info',
    warning: 'bg-warning/10 text-warning',
  };
  return (
    <Card className="border-border/40">
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

function ClientCard({ r, isRTL, fmtMoney, fmtDate }: {
  r: ClientRow; isRTL: boolean;
  fmtMoney: (v: number, c: string) => string;
  fmtDate: (s: string | null) => string;
}) {
  const initial = (r.full_name || '?').trim().charAt(0).toUpperCase();
  const contractsHref = r.user_id ? `/dashboard/contracts?client=${r.user_id}` : '/dashboard/contracts';
  return (
    <Card className="border-border/40 hover-lift">
      <CardContent className="p-3.5">
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${
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

            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground tech-content">
              {r.email_masked && <span dir="ltr">{r.email_masked}</span>}
              {r.phone_masked && <span dir="ltr">{r.phone_masked}</span>}
              <span>{isRTL ? 'آخر تواصل' : 'Last'}: {fmtDate(r.last_interaction)}</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
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
            <Button asChild size="sm" variant="outline" className="h-8 text-[11px]">
              <Link to={contractsHref}>{isRTL ? 'العقود' : 'Contracts'}</Link>
            </Button>
            {r.user_id && (
              <Button asChild size="sm" variant="ghost" className="h-8 text-[11px]">
                <Link to={`/dashboard/messages?to=${r.user_id}`}>{isRTL ? 'رسالة' : 'Message'}</Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
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