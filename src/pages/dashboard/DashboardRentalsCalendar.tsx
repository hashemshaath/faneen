/**
 * Rentals Availability Calendar (Phase 1)
 * -----------------------------------------------------------------------------
 * Visual month / week / list views over the provider's rental_orders.
 * - Color-coded bars by status (active / expiring / expired / closed)
 * - Inline side panel for booking details (no popups — per UX constraint)
 * - Inline reschedule with conflict detection against other orders of same item
 * - Filters: item, status, search text
 * - RTL/LTR aware; tech-content class for technical numbers / dates
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageHeader } from '@/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Bi, useBi } from '@/components/common/Bilingual';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  CalendarDays, ChevronLeft, ChevronRight, Loader2, Search, AlertTriangle,
  X, Pencil, Check, Package, ArrowLeft, ArrowRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { RentalItems, RentalOrders } from '@/modules/rentals';
import type { RentalItem, RentalOrder, RentalOrderStatus } from '@/modules/rentals';
import { toast } from 'sonner';

/* --------------------------- Date helpers --------------------------- */
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const parseYmd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const addDays = (d: Date, n: number) => {
  const x = new Date(d); x.setDate(x.getDate() + n); return x;
};
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const diffDays = (a: Date, b: Date) =>
  Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/* --------------------------- Status mapping --------------------------- */
const STATUS_COLORS: Record<RentalOrderStatus, { bar: string; chip: string; dot: string; label: { ar: string; en: string } }> = {
  draft:          { bar: 'bg-slate-400/70',     chip: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',     dot: 'bg-slate-400',  label: { ar: 'مسودة', en: 'Draft' } },
  active:         { bar: 'bg-emerald-500/80',   chip: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', label: { ar: 'نشط', en: 'Active' } },
  expiring_soon:  { bar: 'bg-amber-500/85',     chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',     dot: 'bg-amber-500',  label: { ar: 'قرب الانتهاء', en: 'Expiring' } },
  expired:        { bar: 'bg-red-500/85',       chip: 'bg-red-500/15 text-red-700 dark:text-red-300',           dot: 'bg-red-500',    label: { ar: 'منتهي', en: 'Expired' } },
  extended:       { bar: 'bg-sky-500/80',       chip: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',           dot: 'bg-sky-500',    label: { ar: 'ممدد', en: 'Extended' } },
  renewed:        { bar: 'bg-indigo-500/80',    chip: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',  dot: 'bg-indigo-500', label: { ar: 'مجدد', en: 'Renewed' } },
  closed:         { bar: 'bg-zinc-400/70',      chip: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300',        dot: 'bg-zinc-400',   label: { ar: 'مغلق', en: 'Closed' } },
  cancelled:      { bar: 'bg-rose-400/70',      chip: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',        dot: 'bg-rose-400',   label: { ar: 'ملغى', en: 'Cancelled' } },
};

/* --------------------------- Conflict helper --------------------------- */
/** Returns orders that overlap [start, end] for the same rental_item_id, excluding `excludeId`. */
function findConflicts(orders: RentalOrder[], itemId: string, start: string, end: string, excludeId?: string): RentalOrder[] {
  const s = parseYmd(start).getTime();
  const e = parseYmd(end).getTime();
  return orders.filter(o => {
    if (o.id === excludeId) return false;
    if (o.rental_item_id !== itemId) return false;
    if (o.status === 'cancelled' || o.status === 'closed') return false;
    const os = parseYmd(o.start_date).getTime();
    const oe = parseYmd(o.end_date).getTime();
    return s <= oe && e >= os;
  });
}

/* --------------------------- Page --------------------------- */
const DashboardRentalsCalendar: React.FC = () => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const bi = useBi();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<RentalItem[]>([]);
  const [orders, setOrders] = useState<RentalOrder[]>([]);

  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()));
  const [itemFilter, setItemFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | RentalOrderStatus>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: biz } = await supabase
        .from('businesses').select('id').eq('user_id', user.id).limit(1).maybeSingle();
      const bizId = biz?.id ?? null;
      setBusinessId(bizId);
      const [it, ord] = await Promise.all([
        bizId ? RentalItems.listProviderItems(bizId) : Promise.resolve({ data: [], error: null }),
        bizId ? RentalOrders.listOrdersForProvider(bizId) : Promise.resolve({ data: [], error: null }),
      ]);
      setItems(it.data ?? []);
      setOrders(ord.data ?? []);
      setLoading(false);
    })();
  }, [user?.id]);

  const refreshOrders = useCallback(async () => {
    if (!businessId) return;
    const r = await RentalOrders.listOrdersForProvider(businessId);
    setOrders(r.data ?? []);
  }, [businessId]);

  /* ----- Filtered orders ----- */
  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter(o => {
      if (itemFilter !== 'all' && o.rental_item_id !== itemFilter) return false;
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (term && !o.ref_id.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [orders, itemFilter, statusFilter, search]);

  const itemById = useMemo(() => {
    const m = new Map<string, RentalItem>();
    items.forEach(i => m.set(i.id, i));
    return m;
  }, [items]);

  /* ----- KPI tiles ----- */
  const stats = useMemo(() => {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const inMonth = filteredOrders.filter(o => {
      const s = parseYmd(o.start_date);
      const e = parseYmd(o.end_date);
      return e >= monthStart && s <= monthEnd;
    });
    const totalDays = inMonth.reduce((sum, o) => sum + Math.max(1, o.total_days), 0);
    const itemsCount = itemFilter !== 'all' ? 1 : items.length || 1;
    const monthDays = endOfMonth(cursor).getDate();
    const occupancyPct = Math.min(100, Math.round((totalDays / (itemsCount * monthDays)) * 100));
    return {
      bookings: inMonth.length,
      active: inMonth.filter(o => o.status === 'active').length,
      conflicts: countConflicts(inMonth),
      occupancyPct,
    };
  }, [filteredOrders, cursor, itemFilter, items.length]);

  const selected = selectedId ? orders.find(o => o.id === selectedId) ?? null : null;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20"><Loader2 className="size-6 animate-spin" /></div>
      </DashboardLayout>
    );
  }

  if (!businessId) {
    return (
      <DashboardLayout>
        <PageHeader icon={CalendarDays} title={bi('تقويم التأجير','Rentals Calendar')} />
        <Card className="p-8 text-center text-muted-foreground">
          <Bi ar="لا توجد منشأة مرتبطة بحسابك." en="No linked business." />
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-5 pb-16 md:pb-20">
        <PageHeader
          icon={CalendarDays}
          title={bi('تقويم توفّر الأصول','Availability Calendar')}
          subtitle={bi('عرض زمني للحجوزات مع كشف التعارضات وإعادة الجدولة السريعة.','Timeline of bookings with conflict detection and quick rescheduling.')}
          actions={
            <Button asChild variant="outline" className="gap-2">
              <Link to="/dashboard/rentals"><Package className="size-4" /><Bi ar="مركز التأجير" en="Rentals Hub" /></Link>
            </Button>
          }
        />

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile label={bi('حجوزات الشهر','Month bookings')} value={stats.bookings} tone="primary" />
          <StatTile label={bi('نشطة','Active')} value={stats.active} tone="emerald" />
          <StatTile label={bi('تعارضات','Conflicts')} value={stats.conflicts} tone="red" />
          <StatTile label={bi('معدّل الإشغال','Occupancy')} value={`${stats.occupancyPct}%`} tone="sky" />
        </div>

        {/* Filters */}
        <Card className="p-3 md:p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_180px_auto] items-end">
            <div>
              <Label className="text-xs text-muted-foreground"><Bi ar="بحث برقم الطلب" en="Search by order ref" /></Label>
              <div className="relative mt-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 ps-9 rounded-xl" placeholder="RORD-1000…" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground"><Bi ar="الصنف" en="Item" /></Label>
              <Select value={itemFilter} onValueChange={setItemFilter}>
                <SelectTrigger className="h-11 rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{bi('كل الأصناف','All items')}</SelectItem>
                  {items.map(i => (
                    <SelectItem key={i.id} value={i.id}>{bi(i.name_ar, i.name_en ?? i.name_ar)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground"><Bi ar="الحالة" en="Status" /></Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | RentalOrderStatus)}>
                <SelectTrigger className="h-11 rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{bi('كل الحالات','All statuses')}</SelectItem>
                  {(Object.keys(STATUS_COLORS) as RentalOrderStatus[]).map(s => (
                    <SelectItem key={s} value={s}>{bi(STATUS_COLORS[s].label.ar, STATUS_COLORS[s].label.en)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => { setSearch(''); setItemFilter('all'); setStatusFilter('all'); }}
            >
              <X className="size-4 me-1" />
              <Bi ar="مسح" en="Clear" />
            </Button>
          </div>
        </Card>

        {/* Views */}
        <Tabs defaultValue="month" className="w-full">
          <TabsList className="bg-muted/40">
            <TabsTrigger value="month"><Bi ar="شهري" en="Month" /></TabsTrigger>
            <TabsTrigger value="week"><Bi ar="أسبوعي" en="Week" /></TabsTrigger>
            <TabsTrigger value="list"><Bi ar="قائمة" en="List" /></TabsTrigger>
          </TabsList>

          <TabsContent value="month" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
              <MonthView
                cursor={cursor}
                setCursor={setCursor}
                orders={filteredOrders}
                allOrders={orders}
                itemById={itemById}
                onSelect={setSelectedId}
                selectedId={selectedId}
              />
              <SidePanel
                order={selected}
                item={selected ? itemById.get(selected.rental_item_id) ?? null : null}
                allOrders={orders}
                onClose={() => setSelectedId(null)}
                onChanged={refreshOrders}
              />
            </div>
          </TabsContent>

          <TabsContent value="week" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
              <WeekView
                cursor={cursor}
                setCursor={setCursor}
                orders={filteredOrders}
                itemById={itemById}
                onSelect={setSelectedId}
                selectedId={selectedId}
              />
              <SidePanel
                order={selected}
                item={selected ? itemById.get(selected.rental_item_id) ?? null : null}
                allOrders={orders}
                onClose={() => setSelectedId(null)}
                onChanged={refreshOrders}
              />
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            <ListView
              orders={filteredOrders}
              itemById={itemById}
              onSelect={setSelectedId}
              selectedId={selectedId}
              isRTL={isRTL}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default DashboardRentalsCalendar;

/* ============================================================
 *                      Sub-components
 * ============================================================ */

const StatTile: React.FC<{ label: string; value: number | string; tone: 'primary' | 'emerald' | 'red' | 'sky' }> = ({ label, value, tone }) => {
  const toneCls = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    red:     'bg-red-500/10 text-red-700 dark:text-red-300',
    sky:     'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  }[tone];
  return (
    <Card className={`p-4 rounded-xl border-0 ${toneCls}`}>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1 tech-content">{value}</div>
    </Card>
  );
};

/* -------------------------- Month View -------------------------- */

interface MonthViewProps {
  cursor: Date;
  setCursor: (d: Date) => void;
  orders: RentalOrder[];
  allOrders: RentalOrder[];
  itemById: Map<string, RentalItem>;
  onSelect: (id: string) => void;
  selectedId: string | null;
}

const MonthView: React.FC<MonthViewProps> = ({ cursor, setCursor, orders, allOrders, itemById, onSelect, selectedId }) => {
  const bi = useBi();
  const { isRTL } = useLanguage();

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  // Pad to full weeks (Saturday-first for Arabic locale)
  const firstDow = monthStart.getDay(); // 0=Sun..6=Sat
  const padBefore = (firstDow + 1) % 7; // start week on Saturday
  const gridStart = addDays(monthStart, -padBefore);
  const totalCells = Math.ceil((padBefore + monthEnd.getDate()) / 7) * 7;
  const days = Array.from({ length: totalCells }, (_, i) => addDays(gridStart, i));

  const weekdays = isRTL
    ? ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج']
    : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  // Build day->orders map
  const dayMap = useMemo(() => {
    const m = new Map<string, RentalOrder[]>();
    days.forEach(d => m.set(ymd(d), []));
    orders.forEach(o => {
      const s = parseYmd(o.start_date);
      const e = parseYmd(o.end_date);
      days.forEach(d => {
        if (d >= s && d <= e) {
          const k = ymd(d);
          const arr = m.get(k);
          if (arr) arr.push(o);
        }
      });
    });
    return m;
  }, [days, orders]);

  const conflictDayKeys = useMemo(() => {
    const conflictKeys = new Set<string>();
    days.forEach(d => {
      const k = ymd(d);
      const arr = dayMap.get(k) ?? [];
      // group by item id; > 1 = potential overlap
      const byItem = new Map<string, number>();
      arr.forEach(o => byItem.set(o.rental_item_id, (byItem.get(o.rental_item_id) ?? 0) + 1));
      for (const c of byItem.values()) if (c > 1) { conflictKeys.add(k); break; }
    });
    return conflictKeys;
  }, [dayMap, days]);

  const today = new Date();

  return (
    <Card className="p-3 md:p-4 rounded-xl">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <Button size="icon" variant="outline" className="size-9 rounded-lg" onClick={() => setCursor(addMonths(cursor, isRTL ? 1 : -1))}>
            {isRTL ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-9 rounded-lg" onClick={() => setCursor(startOfMonth(new Date()))}>
            <Bi ar="اليوم" en="Today" />
          </Button>
          <Button size="icon" variant="outline" className="size-9 rounded-lg" onClick={() => setCursor(addMonths(cursor, isRTL ? -1 : 1))}>
            {isRTL ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
          </Button>
        </div>
        <div className="text-sm font-semibold tech-content">
          {cursor.toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 text-[11px] font-medium text-muted-foreground mb-1">
        {weekdays.map(w => <div key={w} className="px-2 py-1.5 text-center">{w}</div>)}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(d => {
          const k = ymd(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = sameDay(d, today);
          const dayOrders = dayMap.get(k) ?? [];
          const hasConflict = conflictDayKeys.has(k);
          return (
            <div
              key={k}
              className={`min-h-[88px] rounded-lg border p-1.5 text-[11px] transition ${
                inMonth ? 'bg-card' : 'bg-muted/30 text-muted-foreground'
              } ${hasConflict ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-border/60'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`tech-content font-semibold ${isToday ? 'bg-primary text-primary-foreground rounded-md px-1.5' : ''}`}>
                  {d.getDate()}
                </span>
                {hasConflict && <AlertTriangle className="size-3 text-red-500" />}
              </div>
              <div className="space-y-0.5">
                {dayOrders.slice(0, 3).map(o => {
                  const item = itemById.get(o.rental_item_id);
                  const sc = STATUS_COLORS[o.status];
                  return (
                    <button
                      key={o.id}
                      onClick={() => onSelect(o.id)}
                      title={item ? (item.name_ar || item.name_en || '') : ''}
                      className={`w-full text-start truncate rounded px-1.5 py-0.5 text-[10px] text-white hover-lift ${sc.bar} ${
                        selectedId === o.id ? 'ring-2 ring-offset-1 ring-foreground/40' : ''
                      }`}
                    >
                      {item ? (bi(item.name_ar, item.name_en ?? item.name_ar)) : o.ref_id}
                    </button>
                  );
                })}
                {dayOrders.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1">+{dayOrders.length - 3}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t text-[11px] text-muted-foreground">
        {(['active', 'expiring_soon', 'expired', 'extended', 'closed'] as RentalOrderStatus[]).map(s => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${STATUS_COLORS[s].dot}`} />
            <Bi ar={STATUS_COLORS[s].label.ar} en={STATUS_COLORS[s].label.en} />
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 ms-auto">
          <AlertTriangle className="size-3 text-red-500" />
          <Bi ar="يوم به تعارض" en="Day has conflict" />
        </span>
      </div>
      {allOrders.length === 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <Bi ar="لا توجد طلبات تأجير حتى الآن." en="No rental orders yet." />
        </div>
      )}
    </Card>
  );
};

/* -------------------------- Week View -------------------------- */

interface WeekViewProps {
  cursor: Date;
  setCursor: (d: Date) => void;
  orders: RentalOrder[];
  itemById: Map<string, RentalItem>;
  onSelect: (id: string) => void;
  selectedId: string | null;
}

const WeekView: React.FC<WeekViewProps> = ({ cursor, setCursor, orders, itemById, onSelect, selectedId }) => {
  const bi = useBi();
  const { isRTL } = useLanguage();
  // align week start to Saturday from cursor
  const dow = cursor.getDay();
  const offset = (dow + 1) % 7;
  const weekStart = addDays(cursor, -offset);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = days[6];

  const visibleItems = useMemo(() => {
    const ids = new Set(orders.map(o => o.rental_item_id));
    return Array.from(itemById.values()).filter(i => ids.has(i.id));
  }, [orders, itemById]);

  return (
    <Card className="p-3 md:p-4 rounded-xl">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <Button size="icon" variant="outline" className="size-9 rounded-lg" onClick={() => setCursor(addDays(cursor, isRTL ? 7 : -7))}>
            {isRTL ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-9 rounded-lg" onClick={() => setCursor(new Date())}>
            <Bi ar="هذا الأسبوع" en="This week" />
          </Button>
          <Button size="icon" variant="outline" className="size-9 rounded-lg" onClick={() => setCursor(addDays(cursor, isRTL ? -7 : 7))}>
            {isRTL ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
          </Button>
        </div>
        <div className="text-sm font-semibold tech-content">
          {weekStart.toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US', { day: 'numeric', month: 'short' })}
          {' — '}
          {weekEnd.toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US', { day: 'numeric', month: 'short' })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Day header */}
          <div className="grid grid-cols-[160px_repeat(7,1fr)] gap-1 mb-1">
            <div className="text-[11px] text-muted-foreground px-2"><Bi ar="الصنف" en="Item" /></div>
            {days.map(d => (
              <div key={ymd(d)} className="text-[11px] text-center text-muted-foreground tech-content">
                {d.toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US', { weekday: 'short', day: 'numeric' })}
              </div>
            ))}
          </div>

          {visibleItems.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Bi ar="لا توجد حجوزات في هذا الأسبوع." en="No bookings this week." />
            </div>
          )}

          {visibleItems.map(item => {
            const itemOrders = orders.filter(o => o.rental_item_id === item.id);
            return (
              <div key={item.id} className="grid grid-cols-[160px_repeat(7,1fr)] gap-1 py-1 border-b border-border/40 last:border-0">
                <div className="text-xs font-medium truncate self-center px-2" title={bi(item.name_ar, item.name_en ?? item.name_ar)}>
                  {bi(item.name_ar, item.name_en ?? item.name_ar)}
                </div>
                <div className="col-span-7 relative h-9">
                  {itemOrders.map(o => {
                    const s = parseYmd(o.start_date);
                    const e = parseYmd(o.end_date);
                    const startIdx = Math.max(0, diffDays(s, weekStart));
                    const endIdx = Math.min(6, diffDays(e, weekStart));
                    if (endIdx < 0 || startIdx > 6) return null;
                    const startPct = (startIdx / 7) * 100;
                    const widthPct = ((endIdx - startIdx + 1) / 7) * 100;
                    const sc = STATUS_COLORS[o.status];
                    return (
                      <button
                        key={o.id}
                        onClick={() => onSelect(o.id)}
                        className={`absolute top-1 bottom-1 ${sc.bar} text-white text-[10px] px-2 rounded-md truncate hover-lift text-start ${
                          selectedId === o.id ? 'ring-2 ring-offset-1 ring-foreground/40' : ''
                        }`}
                        style={isRTL
                          ? { right: `${startPct}%`, width: `${widthPct}%` }
                          : { left: `${startPct}%`, width: `${widthPct}%` }}
                      >
                        <span className="tech-content">{o.ref_id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

/* -------------------------- List View -------------------------- */

const ListView: React.FC<{
  orders: RentalOrder[];
  itemById: Map<string, RentalItem>;
  onSelect: (id: string) => void;
  selectedId: string | null;
  isRTL: boolean;
}> = ({ orders, itemById, onSelect, selectedId, isRTL }) => {
  const bi = useBi();
  const sorted = [...orders].sort((a, b) => a.start_date.localeCompare(b.start_date));
  if (sorted.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <Bi ar="لا توجد طلبات تطابق المرشحات." en="No orders match your filters." />
      </Card>
    );
  }
  return (
    <Card className="rounded-xl divide-y">
      {sorted.map(o => {
        const item = itemById.get(o.rental_item_id);
        const sc = STATUS_COLORS[o.status];
        return (
          <button
            key={o.id}
            onClick={() => onSelect(o.id)}
            className={`w-full text-start p-3 md:p-4 flex items-center gap-3 hover:bg-muted/40 transition ${
              selectedId === o.id ? 'bg-primary/5' : ''
            }`}
          >
            <span className={`size-3 rounded-full ${sc.dot} shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">{item ? bi(item.name_ar, item.name_en ?? item.name_ar) : '—'}</span>
                <span className="text-xs tech-content text-muted-foreground">{o.ref_id}</span>
              </div>
              <div className="text-xs text-muted-foreground tech-content mt-0.5">
                {o.start_date} → {o.end_date} · {o.total_days} {bi('يوم','d')} · {o.total_amount} {o.currency}
              </div>
            </div>
            <Badge variant="secondary" className={sc.chip}>
              <Bi ar={sc.label.ar} en={sc.label.en} />
            </Badge>
            {isRTL ? <ArrowLeft className="size-4 text-muted-foreground" /> : <ArrowRight className="size-4 text-muted-foreground" />}
          </button>
        );
      })}
    </Card>
  );
};

/* -------------------------- Side Panel (inline) -------------------------- */

const SidePanel: React.FC<{
  order: RentalOrder | null;
  item: RentalItem | null;
  allOrders: RentalOrder[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}> = ({ order, item, allOrders, onClose, onChanged }) => {
  const bi = useBi();
  const [editing, setEditing] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (order) { setStartDate(order.start_date); setEndDate(order.end_date); setEditing(false); }
  }, [order?.id]);

  if (!order) {
    return (
      <Card className="p-6 rounded-xl border-dashed text-center text-sm text-muted-foreground self-start sticky top-4">
        <CalendarDays className="size-8 mx-auto mb-2 opacity-40" />
        <Bi ar="اختر حجزاً من التقويم لعرض تفاصيله هنا." en="Pick a booking from the calendar to see its details here." />
      </Card>
    );
  }

  const sc = STATUS_COLORS[order.status];
  const conflicts = editing
    ? findConflicts(allOrders, order.rental_item_id, startDate, endDate, order.id)
    : [];

  const totalDaysPreview = (() => {
    try {
      const d = diffDays(parseYmd(endDate), parseYmd(startDate)) + 1;
      return d > 0 ? d : 0;
    } catch { return 0; }
  })();

  const save = async () => {
    if (!startDate || !endDate) { toast.error(bi('يرجى إدخال تاريخين','Both dates are required')); return; }
    if (endDate < startDate) { toast.error(bi('تاريخ النهاية قبل البداية','End date is before start')); return; }
    if (conflicts.length > 0) { toast.error(bi('تعارض مع طلب آخر','Conflicts with another order')); return; }
    setSaving(true);
    const { error } = await supabase.from('rental_orders').update({
      start_date: startDate, end_date: endDate, total_days: totalDaysPreview,
    }).eq('id', order.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(bi('تم تحديث التواريخ','Dates updated'));
    setEditing(false);
    await onChanged();
  };

  return (
    <Card className="p-4 rounded-xl self-start sticky top-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground tech-content">{order.ref_id}</div>
          <div className="font-semibold truncate">{item ? bi(item.name_ar, item.name_en ?? item.name_ar) : '—'}</div>
        </div>
        <Button size="icon" variant="ghost" className="size-8 -mt-1" onClick={onClose}><X className="size-4" /></Button>
      </div>

      <Badge variant="secondary" className={sc.chip}>
        <Bi ar={sc.label.ar} en={sc.label.en} />
      </Badge>

      {!editing ? (
        <>
          <div className="text-sm space-y-1.5">
            <Row label={bi('البداية','Start')} value={order.start_date} mono />
            <Row label={bi('النهاية','End')} value={order.end_date} mono />
            <Row label={bi('المدة','Duration')} value={`${order.total_days} ${bi('يوم','d')}`} mono />
            <Row label={bi('الكمية','Quantity')} value={String(order.quantity)} mono />
            <Row label={bi('سعر الوحدة','Unit price')} value={`${order.unit_price} ${order.currency}`} mono />
            <Row label={bi('الإجمالي','Total')} value={`${order.total_amount} ${order.currency}`} mono bold />
            <Row label={bi('التأمين','Deposit')} value={`${order.deposit_amount} ${order.currency}`} mono />
          </div>
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" className="rounded-lg flex-1" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5 me-1" />
              <Bi ar="إعادة الجدولة" en="Reschedule" />
            </Button>
            <Button size="sm" asChild className="rounded-lg flex-1">
              <Link to={`/dashboard/rentals?order=${encodeURIComponent(order.ref_id)}`}>
                <Bi ar="فتح في المركز" en="Open in Hub" />
              </Link>
            </Button>
          </div>
        </>
      ) : (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground"><Bi ar="البداية" en="Start" /></Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-10 rounded-lg tech-content mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground"><Bi ar="النهاية" en="End" /></Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-10 rounded-lg tech-content mt-1" />
            </div>
          </div>
          <div className="text-xs text-muted-foreground tech-content">
            <Bi ar="المدة المحسوبة:" en="Calculated:" /> {totalDaysPreview} {bi('يوم','d')}
          </div>
          {conflicts.length > 0 && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-2.5 text-xs space-y-1.5" role="alert">
              <div className="flex items-center gap-1.5 text-red-700 dark:text-red-300 font-medium">
                <AlertTriangle className="size-3.5" />
                <Bi ar="تعارض مع طلب آخر:" en="Conflicts with:" />
              </div>
              {conflicts.map(c => (
                <div key={c.id} className="tech-content text-red-700/90 dark:text-red-300/90">
                  {c.ref_id} · {c.start_date} → {c.end_date}
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="rounded-lg flex-1" onClick={() => setEditing(false)} disabled={saving}>
              <Bi ar="إلغاء" en="Cancel" />
            </Button>
            <Button size="sm" className="rounded-lg flex-1" onClick={save} disabled={saving || conflicts.length > 0}>
              {saving ? <Loader2 className="size-3.5 animate-spin me-1" /> : <Check className="size-3.5 me-1" />}
              <Bi ar="حفظ" en="Save" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

const Row: React.FC<{ label: string; value: string; mono?: boolean; bold?: boolean }> = ({ label, value, mono, bold }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={`text-sm ${mono ? 'tech-content' : ''} ${bold ? 'font-semibold' : ''}`}>{value}</span>
  </div>
);

/* -------------------------- Conflict counter -------------------------- */

function countConflicts(orders: RentalOrder[]): number {
  let count = 0;
  // pairwise overlap per item
  const byItem = new Map<string, RentalOrder[]>();
  orders.forEach(o => {
    if (o.status === 'cancelled' || o.status === 'closed') return;
    const arr = byItem.get(o.rental_item_id) ?? [];
    arr.push(o);
    byItem.set(o.rental_item_id, arr);
  });
  byItem.forEach(arr => {
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b = arr[j];
        if (a.start_date <= b.end_date && b.start_date <= a.end_date) count++;
      }
    }
  });
  return count;
}