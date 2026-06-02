import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Wrench, CheckCircle2, Clock, PauseCircle, AlertCircle, ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/i18n/LanguageContext';
import { listServicesByBusiness } from '@/modules/catalog';

type ServiceRow = {
  id: string;
  is_active: boolean | null;
  provider_status: string | null;
  admin_status: string | null;
  required_plan_tier: string | null;
};

interface Props {
  businessId: string | null | undefined;
}

/**
 * PROVIDER-DASHBOARD-REDESIGN-1 — Services status breakdown.
 * Real counts via `listServicesByBusiness` (catalog wrapper). No PII.
 */
export function ProviderServicesStatusCard({ businessId }: Props) {
  const { isRTL } = useLanguage();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  const { data, isLoading } = useQuery({
    queryKey: ['provider-services-status', businessId],
    enabled: !!businessId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await listServicesByBusiness<ServiceRow>({
        businessId: businessId!,
        select: 'id,is_active,provider_status,admin_status,required_plan_tier',
        activeOnly: false,
        order: null,
      });
      if (error) throw error;
      return (data ?? []) as ServiceRow[];
    },
  });

  const counts = useMemo(() => {
    const rows = data ?? [];
    let active = 0, pending = 0, paused = 0, upgrade = 0, blocked = 0;
    for (const r of rows) {
      const adm = r.admin_status ?? 'allowed';
      const prv = r.provider_status ?? 'active';
      if (adm === 'pending' || adm === 'in_review') pending++;
      else if (adm === 'rejected' || adm === 'suspended') blocked++;
      else if (r.required_plan_tier && r.required_plan_tier !== 'free') upgrade++;
      else if (prv === 'paused' || r.is_active === false) paused++;
      else if (prv === 'active' && adm === 'allowed') active++;
    }
    return { total: rows.length, active, pending, paused, upgrade, blocked };
  }, [data]);

  const items: { key: string; label: string; value: number; icon: typeof Wrench; tone: string }[] = [
    { key: 'active', label: isRTL ? 'نشطة' : 'Active', value: counts.active, icon: CheckCircle2, tone: 'text-success bg-success/10 border-success/20' },
    { key: 'pending', label: isRTL ? 'قيد المراجعة' : 'Under review', value: counts.pending, icon: Clock, tone: 'text-info bg-info/10 border-info/20' },
    { key: 'paused', label: isRTL ? 'موقوفة' : 'Paused', value: counts.paused, icon: PauseCircle, tone: 'text-muted-foreground bg-muted/40 border-border/60' },
    { key: 'upgrade', label: isRTL ? 'تحتاج ترقية' : 'Needs upgrade', value: counts.upgrade, icon: AlertCircle, tone: 'text-warning bg-warning/10 border-warning/20' },
    { key: 'blocked', label: isRTL ? 'مرفوضة/معلّقة' : 'Blocked', value: counts.blocked, icon: AlertCircle, tone: 'text-destructive bg-destructive/10 border-destructive/20' },
  ];

  return (
    <Card className="border-border/60" dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-heading flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary" aria-hidden="true" />
          {isRTL ? 'حالة الخدمات' : 'Services status'}
          {!isLoading && counts.total > 0 && (
            <Badge variant="outline" className="tech-content h-5 px-1.5 text-[10px]">{counts.total}</Badge>
          )}
        </CardTitle>
        <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-[11px] gap-1">
          <Link to="/dashboard/services">
            {isRTL ? 'إدارة الخدمات' : 'Manage services'}
            <Arrow className="w-3 h-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {counts.total === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
            <Wrench className="w-8 h-8 text-muted-foreground/30" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'لم تضف خدمات بعد.' : 'No services added yet.'}
            </p>
            <p className="text-[11px] text-muted-foreground/80 max-w-xs">
              {isRTL
                ? 'أضف خدماتك الأساسية لتظهر في البحث والمقارنة وتصل إلى عملاء أكثر.'
                : 'Add your core services so they appear in search and reach more customers.'}
            </p>
            <Button asChild size="sm" variant="default" className="mt-1 gap-1.5">
              <Link to="/dashboard/services">
                <Plus className="w-3.5 h-3.5" />
                {isRTL ? 'إضافة خدمة' : 'Add a service'}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {items.map((it) => (
              <div
                key={it.key}
                className={`rounded-xl border px-2.5 py-2.5 flex flex-col gap-1 ${it.tone}`}
                aria-label={`${it.label}: ${it.value}`}
              >
                <div className="flex items-center gap-1.5">
                  <it.icon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="text-[11px] leading-tight truncate">{it.label}</span>
                </div>
                <span className="tech-content text-base font-bold leading-none">{it.value}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ProviderServicesStatusCard;