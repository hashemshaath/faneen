/**
 * T1 — Inline (no-modal) rental request form.
 *
 * Rendered directly beneath the item header on `RentalItemPublic.tsx`.
 * Honors the platform rule: NO dialogs / popups anywhere. When the viewer
 * is not authenticated we display a friendly login redirect using the same
 * pattern as `BookingWidget` / `BranchInquiryForm` (navigate to /auth).
 *
 * Emits notification_type: 'rental_request_new' to the provider owner via
 * the customerRequests service.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Bi } from '@/components/common/Bilingual';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { RegionCityDistrictSelect } from '@/components/location/RegionCityDistrictSelect';
import { CalendarDays, Truck, Loader2, Package, MapPin, Send, LogIn } from 'lucide-react';
import type { RentalItem } from '@/modules/rentals';
import { computeRentalPricePreview, RentalCustomerRequests } from '@/modules/rentals';

export interface RentalRequestInlineFormProps {
  item: RentalItem;
  onCreated?: (orderRef: string) => void;
}

function todayIso(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function addDaysIso(base: string, days: number): string {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function diffDays(a: string, b: string): number {
  const A = new Date(a + 'T00:00:00').getTime();
  const B = new Date(b + 'T00:00:00').getTime();
  if (!isFinite(A) || !isFinite(B) || B < A) return 0;
  return Math.round((B - A) / (1000 * 60 * 60 * 24)) + 1;
}

export const RentalRequestInlineForm: React.FC<RentalRequestInlineFormProps> = ({ item, onCreated }) => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [start, setStart] = React.useState<string>(todayIso());
  const [end, setEnd] = React.useState<string>(addDaysIso(todayIso(), 6));
  const [quantity, setQuantity] = React.useState<number>(1);
  const [deliveryRequired, setDeliveryRequired] = React.useState<boolean>(false);
  const [addressText, setAddressText] = React.useState<string>('');
  const [deliveryFeeInput, setDeliveryFeeInput] = React.useState<string>('');
  const [notes, setNotes] = React.useState<string>('');
  const [locIds, setLocIds] = React.useState<{ regionId: string | null; cityId: string | null; districtId: string | null }>({
    regionId: null,
    cityId: null,
    districtId: null,
  });
  const [submitting, setSubmitting] = React.useState(false);

  const days = React.useMemo(() => diffDays(start, end), [start, end]);
  const preview = React.useMemo(
    () =>
      computeRentalPricePreview({
        unit: item.unit,
        baseDailyRate: item.base_price,
        quantity,
        days,
        depositPerUnit: item.deposit_amount,
        deliveryRequired,
        deliveryFee: deliveryFeeInput ? Number(deliveryFeeInput) : null,
      }),
    [item.unit, item.base_price, item.deposit_amount, quantity, days, deliveryRequired, deliveryFeeInput],
  );

  // ─── Guest gate ───────────────────────────────────────────────────
  if (!user) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center gap-3 md:gap-5">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold">
              <Bi ar="سجّل دخولك لطلب هذا الصنف للتأجير" en="Sign in to request this rental" />
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              <Bi
                ar="نحتاج التعرّف عليك حتى نُرسل طلبك للمزوّد ونتيح لك متابعته من لوحتك."
                en="Sign in so we can send your request to the provider and let you track it from your dashboard."
              />
            </p>
          </div>
          <Button size="lg" onClick={() => navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`)}>
            <LogIn className="h-4 w-4 me-1" />
            <Bi ar="تسجيل الدخول" en="Sign in" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ─── Submit ───────────────────────────────────────────────────────
  const canSubmit =
    !submitting &&
    days >= 1 &&
    quantity >= 1 &&
    (!deliveryRequired || (locIds.cityId && addressText.trim().length >= 4));

  const submit = async () => {
    setSubmitting(true);
    const res = await RentalCustomerRequests.createRentalRequest({
      provider_business_id: item.provider_business_id,
      rental_item_id: item.id,
      customer_user_id: user.id,
      quantity,
      start_date: start,
      end_date: end,
      total_days: days,
      unit_price: item.base_price,
      total_amount: preview.rentalSubtotal + preview.deliveryTotal,
      deposit_amount: preview.depositTotal,
      currency: item.currency,
      delivery_required: deliveryRequired,
      delivery_fee: deliveryRequired ? Number(deliveryFeeInput || 0) : null,
      delivery_city_id: deliveryRequired ? locIds.cityId : null,
      delivery_district_id: deliveryRequired ? locIds.districtId : null,
      delivery_address_text: deliveryRequired ? addressText.trim() : null,
      request_notes: notes.trim() || null,
      terms_snapshot: {
        source: 'rental_item_public_form_v1',
        item_unit: item.unit,
        breakdown: preview.timeUnitsBreakdown,
      },
    });
    setSubmitting(false);
    if (res.error || !res.data) {
      toast.error(res.error?.message || (isRTL ? 'تعذّر إرسال الطلب' : 'Could not submit request'));
      return;
    }
    toast.success(isRTL ? 'تم إرسال طلبك للمزوّد' : 'Your request was sent to the provider');
    onCreated?.(res.data.ref_id);
    navigate(`/dashboard/my-rentals/${encodeURIComponent(res.data.ref_id)}`);
  };

  const ccy = item.currency;

  return (
    <Card className="border-primary/25">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">
            <Bi ar="طلب تأجير" en="Request rental" />
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs"><Bi ar="تاريخ البداية" en="Start date" /></Label>
            <Input type="date" value={start} min={todayIso()} onChange={(e) => setStart(e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs"><Bi ar="تاريخ النهاية" en="End date" /></Label>
            <Input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs"><Bi ar="الكمية" en="Quantity" /></Label>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="h-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>
            {isRTL ? `المدة: ${days} يوم` : `Duration: ${days} day(s)`}
          </span>
        </div>

        <label className="flex items-center gap-2 text-sm border rounded-lg p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={deliveryRequired}
            onChange={(e) => setDeliveryRequired(e.target.checked)}
            className="h-4 w-4"
          />
          <Truck className="h-4 w-4 text-muted-foreground" />
          <Bi ar="يتطلب توصيل" en="Delivery required" />
        </label>

        {deliveryRequired && (
          <div className="space-y-3 rounded-lg border border-border bg-background p-3">
            <RegionCityDistrictSelect
              value={locIds}
              onChange={(v) => setLocIds(v)}
              requiredRegion
              requiredCity
            />
            <div className="space-y-1">
              <Label className="text-xs">
                <MapPin className="inline h-3 w-3 me-1" />
                <Bi ar="عنوان التسليم" en="Delivery address" />
              </Label>
              <Input
                dir="auto"
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                placeholder={isRTL ? 'اسم الشارع، رقم المبنى…' : 'Street, building no…'}
                className="h-10"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs"><Bi ar="رسوم التوصيل المقترحة (اختياري)" en="Proposed delivery fee (optional)" /></Label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                value={deliveryFeeInput}
                onChange={(e) => setDeliveryFeeInput(e.target.value)}
                placeholder={ccy}
                className="h-10"
              />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs"><Bi ar="ملاحظات (اختياري)" en="Notes (optional)" /></Label>
          <Textarea
            rows={3}
            dir={isRTL ? 'rtl' : 'ltr'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isRTL ? 'أي تفاصيل تساعد المزوّد في تجهيز طلبك…' : 'Any details the provider should know…'}
          />
        </div>

        {/* Price preview */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground"><Bi ar="إجمالي التأجير" en="Rental subtotal" /></span>
            <span className="tech-content" dir="ltr">{preview.rentalSubtotal.toFixed(2)} {ccy}</span>
          </div>
          {preview.depositTotal > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground"><Bi ar="التأمين المسترد" en="Refundable deposit" /></span>
              <span className="tech-content" dir="ltr">{preview.depositTotal.toFixed(2)} {ccy}</span>
            </div>
          )}
          {preview.deliveryTotal > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground"><Bi ar="التوصيل" en="Delivery" /></span>
              <span className="tech-content" dir="ltr">{preview.deliveryTotal.toFixed(2)} {ccy}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1 border-t border-border font-semibold">
            <span><Bi ar="الإجمالي التقديري" en="Estimated total" /></span>
            <span className="tech-content" dir="ltr">{preview.grandTotal.toFixed(2)} {ccy}</span>
          </div>
          <p className="text-[10px] text-muted-foreground pt-1">
            <Bi
              ar="السعر تقديري وقابل للتأكيد من قِبل المزوّد قبل بدء التأجير."
              en="Estimate only — the provider confirms the final price before the rental starts."
            />
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button size="lg" onClick={submit} disabled={!canSubmit} className="gap-1.5">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <Bi ar="إرسال الطلب" en="Send request" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RentalRequestInlineForm;