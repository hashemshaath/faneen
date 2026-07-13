/**
 * T1 — Customer rental order detail page.
 *
 * Mirrors the layout of DashboardRfqDetail (item summary + status chip +
 * dates + delivery card + timeline from rental_order_events + extension
 * panel reuse when the order is active).
 */
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bi } from '@/components/common/Bilingual';
import {
  ArrowLeft, ArrowRight, Calendar, Truck, Package, Clock, MapPin, StickyNote, Loader2, AlertTriangle,
  FileText,
} from 'lucide-react';
import { useNoIndex } from '@/hooks/useNoIndex';
import { supabase } from '@/integrations/supabase/client';
import {
  RentalCustomerRequests,
  RentalItems,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  RentalExtensionPanel,
  RentalReturns,
  RentalReturnCustomerCard,
  type RentalItem,
} from '@/modules/rentals';

const TONE_CLASS: Record<string, string> = {
  emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  amber:   'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20',
  red:     'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/20',
  primary: 'bg-primary/10 text-primary border-primary/20',
  muted:   'bg-muted text-muted-foreground border-border',
};

const EVENT_LABEL: Record<string, { ar: string; en: string }> = {
  'request.created':  { ar: 'إنشاء الطلب',      en: 'Request created' },
  'request.accepted': { ar: 'قبول الطلب',       en: 'Request accepted' },
  'request.declined': { ar: 'رفض الطلب',        en: 'Request declined' },
  'order.closed':     { ar: 'إغلاق الطلب',       en: 'Order closed' },
  'contract.created': { ar: 'إنشاء العقد',      en: 'Contract created' },
  'return.recorded':     { ar: 'تسجيل الإرجاع',    en: 'Return recorded' },
  'return.acknowledged': { ar: 'تأكيد الاستلام',  en: 'Return acknowledged' },
  'return.disputed':     { ar: 'اعتراض على الإرجاع', en: 'Return disputed' },
};

const DashboardMyRentalOrderDetail: React.FC = () => {
  useNoIndex();
  const { id } = useParams<{ id: string }>();
  const { isRTL } = useLanguage();
  const Back = isRTL ? ArrowRight : ArrowLeft;

  const { data: order, isLoading } = useQuery({
    queryKey: ['my-rental-order', id],
    enabled: !!id,
    queryFn: async () => {
      const r = await RentalCustomerRequests.getMyRentalOrderByIdOrRef(id!);
      return r.data;
    },
  });

  const { data: item } = useQuery<RentalItem | null>({
    queryKey: ['rental-item', order?.rental_item_id],
    enabled: !!order?.rental_item_id,
    queryFn: async () => {
      const r = await RentalItems.getItemById(order!.rental_item_id);
      return r.data;
    },
  });

  const { data: events } = useQuery({
    queryKey: ['rental-order-events', order?.id],
    enabled: !!order?.id,
    queryFn: async () => {
      const r = await RentalCustomerRequests.listOrderEvents(order!.id);
      return r.data ?? [];
    },
  });

  const { data: providerBiz } = useQuery({
    queryKey: ['rental-order-provider', order?.provider_business_id],
    enabled: !!order?.provider_business_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('businesses')
        .select('id, name_ar, name_en')
        .eq('id', order!.provider_business_id)
        .maybeSingle();
      return data as { name_ar?: string | null; name_en?: string | null; user_id?: string | null } | null;
    },
  });

  const { data: rentalReturn, refetch: refetchReturn } = useQuery({
    queryKey: ['rental-return', order?.id],
    enabled: !!order?.id,
    queryFn: async () => {
      const r = await RentalReturns.getReturnForOrder(order!.id);
      return r.data;
    },
  });

  const { data: providerOwner } = useQuery({
    queryKey: ['rental-order-provider-owner', order?.provider_business_id],
    enabled: !!order?.provider_business_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('businesses')
        .select('user_id')
        .eq('id', order!.provider_business_id)
        .maybeSingle();
      return (data as { user_id?: string | null } | null)?.user_id ?? null;
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto p-4 space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-40" />
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto p-4">
          <Card><CardContent className="p-8 text-center space-y-2">
            <AlertTriangle className="h-8 w-8 mx-auto text-warning" />
            <p><Bi ar="لم يتم العثور على هذا الطلب." en="Order not found." /></p>
            <Button asChild size="sm" variant="outline">
              <Link to="/dashboard/my-rentals"><Bi ar="عودة لطلباتي" en="Back to my rentals" /></Link>
            </Button>
          </CardContent></Card>
        </div>
      </DashboardLayout>
    );
  }

  const label = ORDER_STATUS_LABELS[order.status] ?? { ar: order.status, en: order.status };
  const tone = ORDER_STATUS_TONES[order.status] ?? 'muted';
  const providerName = providerBiz ? (isRTL ? providerBiz.name_ar : providerBiz.name_en) || providerBiz.name_ar || '' : '';
  const itemName = item ? (isRTL ? item.name_ar : (item.name_en || item.name_ar)) : '';

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-4 px-3 py-4">
        <div className="flex items-center justify-between gap-3">
          <Button asChild size="sm" variant="ghost">
            <Link to="/dashboard/my-rentals"><Back className="h-4 w-4 me-1" /><Bi ar="طلباتي" en="My rentals" /></Link>
          </Button>
          <Badge className={TONE_CLASS[tone]}>{isRTL ? label.ar : label.en}</Badge>
        </div>

        {/* Summary */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold min-w-0 truncate">{itemName || order.ref_id}</h1>
            </div>
            <div className="text-xs text-muted-foreground tech-content">{order.ref_id}</div>
            {providerName && (
              <div className="text-sm">
                <span className="text-muted-foreground me-1"><Bi ar="المزوّد:" en="Provider:" /></span>
                {providerName}
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm pt-2">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase"><Bi ar="من" en="From" /></div>
                <div className="tech-content" dir="ltr">{order.start_date}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase"><Bi ar="إلى" en="To" /></div>
                <div className="tech-content" dir="ltr">{order.end_date}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase"><Bi ar="الأيام" en="Days" /></div>
                <div className="tech-content" dir="ltr">{order.total_days}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase"><Bi ar="الإجمالي" en="Total" /></div>
                <div className="tech-content font-semibold" dir="ltr">{Number(order.total_amount).toFixed(2)} {order.currency}</div>
              </div>
            </div>
            {order.deposit_amount > 0 && (
              <div className="text-xs text-muted-foreground">
                <Bi ar="التأمين المسترد:" en="Refundable deposit:" />{' '}
                <span className="tech-content" dir="ltr">{Number(order.deposit_amount).toFixed(2)} {order.currency}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Declined reason */}
        {order.contract_id && (
          <Card>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-primary" />
                <Bi ar="تم إنشاء عقد تأجير مرتبط بهذا الطلب." en="A rental contract is linked to this order." />
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to={`/contracts/${order.contract_id}`}>
                  <Bi ar="عرض العقد" en="View contract" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {order.status === 'declined' && order.decline_reason && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-4">
              <div className="text-sm font-semibold text-destructive mb-1">
                <Bi ar="سبب الرفض من المزوّد" en="Provider decline reason" />
              </div>
              <p className="text-sm text-foreground/90">{order.decline_reason}</p>
            </CardContent>
          </Card>
        )}

        {/* Delivery */}
        {order.delivery_required && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="h-4 w-4" /><Bi ar="التوصيل" en="Delivery" />
              </div>
              {order.delivery_address_text && (
                <div className="text-sm flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{order.delivery_address_text}</span>
                </div>
              )}
              {order.delivery_fee != null && (
                <div className="text-xs text-muted-foreground">
                  <Bi ar="رسوم التوصيل:" en="Delivery fee:" />{' '}
                  <span className="tech-content" dir="ltr">{Number(order.delivery_fee).toFixed(2)} {order.currency}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Request notes */}
        {order.request_notes && (
          <Card>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <StickyNote className="h-4 w-4" /><Bi ar="ملاحظاتك" en="Your notes" />
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.request_notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Extension panel — only meaningful on active orders */}
        {(order.status === 'active' || order.status === 'expiring_soon' || order.status === 'extended') && (
          <RentalExtensionPanel order={order} onChanged={() => { /* React Query auto-refetches on window focus */ }} />
        )}

        {/* T5 — return card (visible whenever a return exists) */}
        {rentalReturn && (
          <RentalReturnCustomerCard
            order={order}
            ret={rentalReturn}
            providerOwnerUserId={providerOwner ?? null}
            onChanged={async () => { await refetchReturn(); }}
          />
        )}

        {/* Timeline */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4" /><Bi ar="سجل الأحداث" en="Timeline" />
            </div>
            {(events ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground"><Bi ar="لا توجد أحداث بعد." en="No events yet." /></p>
            ) : (
              <ul className="space-y-2">
                {(events ?? []).map((ev) => {
                  const l = EVENT_LABEL[ev.event_type] ?? { ar: ev.event_type, en: ev.event_type };
                  return (
                    <li key={ev.id} className="flex items-center justify-between text-xs border-b border-border last:border-0 pb-1">
                      <span>{isRTL ? l.ar : l.en}</span>
                      <span className="text-muted-foreground tech-content" dir="ltr">
                        {new Date(ev.created_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardMyRentalOrderDetail;