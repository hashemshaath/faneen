import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Briefcase, Filter, Search, Download, PieChart as PieIcon } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import { AdminKpiCard } from '@/components/admin/AdminKpiCard';
import {
  isProviderLike,
  providerSegment,
  providerSegmentLabel,
  pilotReadinessReasons,
  buildBusinessesCsv,
  type BusinessMetricsRow,
  type ProviderSegment,
} from '@/modules/admin/businesses/businessAdminMetrics';
import { BusinessMiniCard } from './BusinessMiniCard';
import { ControlChip, type ChipTone } from './ControlChip';

interface ProvidersTabProps {
  businesses: ReadonlyArray<BusinessMetricsRow & {
    name_ar?: string | null; name_en?: string | null;
    ref_id?: string | null; logo_url?: string | null;
  }>;
  isRTL: boolean;
  onJumpToBusiness?: (b: BusinessMetricsRow) => void;
}

const SEGMENTS: ProviderSegment[] = [
  'qualified', 'noContact', 'noPublicLink', 'unpublished', 'pendingOrRejected',
];

const SEG_COLOR: Record<ProviderSegment, string> = {
  qualified: 'hsl(var(--success))',
  noContact: 'hsl(var(--destructive))',
  noPublicLink: 'hsl(var(--info, var(--primary)))',
  unpublished: 'hsl(var(--muted-foreground))',
  pendingOrRejected: 'hsl(var(--warning))',
};

export const ProvidersTab: React.FC<ProvidersTabProps> = ({
  businesses, isRTL, onJumpToBusiness,
}) => {
  const providers = useMemo(() => businesses.filter(isProviderLike), [businesses]);

  const segmented = useMemo(() => {
    const map = new Map<ProviderSegment, typeof providers>();
    for (const seg of SEGMENTS) map.set(seg, []);
    for (const p of providers) {
      const s = providerSegment(p);
      map.get(s)!.push(p);
    }
    return map;
  }, [providers]);

  const [active, setActive] = useState<ProviderSegment>('qualified');
  const [query, setQuery] = useState('');
  const baseRows = segmented.get(active) ?? [];
  const q = query.trim().toLowerCase();
  const activeRows = q
    ? baseRows.filter((r) =>
        (r.name_ar || '').toLowerCase().includes(q) ||
        (r.name_en || '').toLowerCase().includes(q) ||
        (r.ref_id || '').toLowerCase().includes(q) ||
        (r.username || '').toLowerCase().includes(q),
      )
    : baseRows;

  const donutData = useMemo(
    () => SEGMENTS
      .map((s) => ({ key: s, label: providerSegmentLabel(s, isRTL), count: segmented.get(s)?.length ?? 0 }))
      .filter((d) => d.count > 0),
    [segmented, isRTL],
  );

  const handleExport = () => {
    const csv = buildBusinessesCsv(activeRows);
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `providers-${active}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (providers.length === 0) {
    return (
      <Card className="rounded-3xl border-dashed border-border/60 bg-card/40">
        <CardContent className="p-10 text-center">
          <Briefcase className="h-6 w-6 text-muted-foreground mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">
            {pickBi(isRTL, 'لا يوجد مزودون مطابقون في البيانات الحالية.', 'No matching providers in the current data.')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="business-control-center-providers">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {SEGMENTS.map((seg) => (
          <AdminKpiCard
            key={seg}
            label={providerSegmentLabel(seg, isRTL)}
            value={segmented.get(seg)?.length ?? 0}
            icon={Briefcase}
            tone={
              seg === 'qualified' ? 'success'
              : seg === 'pendingOrRejected' ? 'destructive'
              : seg === 'unpublished' ? 'muted'
              : 'warning'
            }
            active={active === seg}
            onClick={() => setActive(seg)}
          />
        ))}
      </div>

      <Card className="surface-1 hover-lift">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-heading flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-primary" />
            {pickBi(isRTL, 'توزيع شرائح المزودين', 'Provider segment mix')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {donutData.length === 0 ? (
            <p className="text-xs text-muted-foreground py-10 text-center">
              {pickBi(isRTL, 'لا توجد بيانات.', 'No data.')}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={donutData} dataKey="count" nameKey="label"
                  innerRadius={60} outerRadius={95} paddingAngle={2}
                  stroke="hsl(var(--background))" strokeWidth={2}
                >
                  {donutData.map((d, i) => (
                    <Cell key={i} fill={SEG_COLOR[d.key]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{
                  background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))',
                  border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12,
                }} formatter={(v: number, n: string) => [
                  `${v} · ${providers.length ? Math.round((v / providers.length) * 100) : 0}%`, n,
                ]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/60 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-heading flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {pickBi(isRTL, 'تصفية حسب الشريحة', 'Filter by segment')}
            </span>
            <Button
              size="sm" variant="outline" onClick={handleExport}
              disabled={activeRows.length === 0}
              className="h-8 gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              {pickBi(isRTL, 'تصدير CSV', 'Export CSV')}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {SEGMENTS.map((seg) => {
              const isActive = active === seg;
              const count = segmented.get(seg)?.length ?? 0;
              const tone: ChipTone =
                seg === 'qualified' ? 'success'
                : seg === 'pendingOrRejected' ? 'destructive'
                : seg === 'unpublished' ? 'muted'
                : seg === 'noPublicLink' ? 'info'
                : 'warning';
              return (
                <ControlChip
                  key={seg}
                  label={providerSegmentLabel(seg, isRTL)}
                  count={count}
                  tone={tone}
                  active={isActive}
                  onClick={() => setActive(seg)}
                  testId={`providers-seg-${seg}`}
                />
              );
            })}
          </div>

          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} h-4 w-4 text-muted-foreground pointer-events-none`} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={pickBi(isRTL, 'ابحث بالاسم أو المعرّف…', 'Search by name or ref…')}
              className={`h-9 ${isRTL ? 'pr-9' : 'pl-9'} text-sm`}
              dir="auto"
            />
          </div>

          {activeRows.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              {q
                ? pickBi(isRTL, 'لا نتائج تطابق البحث.', 'No matches for your search.')
                : pickBi(isRTL, 'لا توجد عناصر ضمن هذه الشريحة.', 'No items in this segment.')}
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
              {activeRows.slice(0, 30).map((p) => {
                const reasons = active === 'qualified' ? [] : pilotReadinessReasons(p, isRTL);
                return (
                  <BusinessMiniCard
                    key={p.id}
                    business={p}
                    isRTL={isRTL}
                    reasons={reasons}
                    reasonTone={active === 'pendingOrRejected' ? 'destructive' : 'warning'}
                    onJumpToBusiness={onJumpToBusiness}
                  />
                );
              })}
              {activeRows.length > 30 ? (
                <p className="col-span-full text-[11px] text-muted-foreground text-center pt-1">
                  {pickBi(
                    isRTL,
                    `يتم عرض أول 30 من إجمالي ${activeRows.length}.`,
                    `Showing first 30 of ${activeRows.length}.`,
                  )}
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProvidersTab;