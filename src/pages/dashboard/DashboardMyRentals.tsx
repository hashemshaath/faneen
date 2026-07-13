/**
 * T1 — Customer's rental orders list.
 *
 * Mirrors the DashboardMyRequests layout aesthetic (journey-chip statuses,
 * compact cards). Reads `rental_orders` scoped to the current user via RLS.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bi } from '@/components/common/Bilingual';
import { Package, Plus, Calendar, Truck } from 'lucide-react';
import { useNoIndex } from '@/hooks/useNoIndex';
import { RentalCustomerRequests, ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from '@/modules/rentals';

const TONE_CLASS: Record<string, string> = {
  emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  amber:   'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20',
  red:     'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/20',
  primary: 'bg-primary/10 text-primary border-primary/20',
  muted:   'bg-muted text-muted-foreground border-border',
};

const DashboardMyRentals: React.FC = () => {
  useNoIndex();
  const { user } = useAuth();
  const { isRTL } = useLanguage();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['my-rental-orders', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const r = await RentalCustomerRequests.listMyRentalOrders(user!.id);
      return r.data ?? [];
    },
  });

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-4 px-3 py-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5" />
              <Bi ar="طلباتي التأجيرية" en="My rentals" />
            </h1>
            <p className="text-sm text-muted-foreground">
              <Bi ar="متابعة طلبات التأجير التي أرسلتها للمزوّدين." en="Track the rental requests you sent to providers." />
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/rentals">
              <Plus className="h-4 w-4 me-1" />
              <Bi ar="تصفح المعدات المتاحة" en="Browse rental catalog" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : (orders ?? []).length === 0 ? (
          <Card><CardContent className="p-8 text-center space-y-2">
            <Package className="h-10 w-10 mx-auto text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              <Bi ar="لا توجد طلبات تأجير بعد." en="No rental requests yet." />
            </p>
            <Button asChild size="sm">
              <Link to="/rentals">
                <Bi ar="ابدأ من كتالوج التأجير" en="Start from the rental catalog" />
              </Link>
            </Button>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {(orders ?? []).map((o) => {
              const label = ORDER_STATUS_LABELS[o.status] ?? { ar: o.status, en: o.status };
              const tone = ORDER_STATUS_TONES[o.status] ?? 'muted';
              return (
                <Card key={o.id} className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-4">
                    <Link to={`/dashboard/my-rentals/${encodeURIComponent(o.ref_id)}`} className="block">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium tech-content">{o.ref_id}</span>
                            <Badge className={TONE_CLASS[tone]}>{isRTL ? label.ar : label.en}</Badge>
                            {o.delivery_required && (
                              <Badge variant="outline" className="gap-1 text-[10px]">
                                <Truck className="h-3 w-3" />
                                <Bi ar="توصيل" en="Delivery" />
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            <span className="tech-content" dir="ltr">
                              {o.start_date} → {o.end_date} · {o.total_days}d
                            </span>
                          </div>
                        </div>
                        <div className="text-sm font-semibold tech-content" dir="ltr">
                          {Number(o.total_amount).toFixed(2)} {o.currency}
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardMyRentals;