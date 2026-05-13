import { Percent } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface FinancialSummaryProps {
  isRTL: boolean;
  currency: string;
  measurementsCount: number;
  measurementTotal: number;
  lineItemsCount: number;
  lineItemTotal: number;
  subtotal: number;
  vatRate: number;
  vatInclusive: boolean;
  vatAmount: number;
  grandTotal: number;
}

/**
 * Display-only financial summary card (subtotal + VAT + grand total).
 * Parent owns all calculations; this component formats display values only.
 */
export function ContractFinancialSummary({
  isRTL,
  currency,
  measurementsCount,
  measurementTotal,
  lineItemsCount,
  lineItemTotal,
  subtotal,
  vatRate,
  vatInclusive,
  vatAmount,
  grandTotal,
}: FinancialSummaryProps) {
  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 space-y-2">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{isRTL ? 'المقاسات' : 'Measurements'} ({measurementsCount})</span>
        <span className="font-semibold">{measurementTotal.toLocaleString()} {currency}</span>
      </div>
      {lineItemsCount > 0 && (
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">{isRTL ? 'بنود إضافية' : 'Line Items'} ({lineItemsCount})</span>
          <span className="font-semibold">{lineItemTotal.toLocaleString()} {currency}</span>
        </div>
      )}
      <Separator className="my-1" />
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{isRTL ? 'المجموع الفرعي' : 'Subtotal'}</span>
        <span className="font-bold">{subtotal.toLocaleString()} {currency}</span>
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground flex items-center gap-1"><Percent className="w-3 h-3" />{isRTL ? `ضريبة القيمة المضافة (${vatRate}%)` : `VAT (${vatRate}%)`} {vatInclusive ? (isRTL ? '(شاملة)' : '(incl.)') : ''}</span>
        <span className="font-semibold">{vatAmount.toFixed(2)} {currency}</span>
      </div>
      <Separator className="my-1" />
      <div className="flex items-center justify-between text-sm font-bold text-accent">
        <span>{isRTL ? 'الإجمالي النهائي' : 'Grand Total'}</span>
        <span>{grandTotal.toLocaleString()} {currency}</span>
      </div>
    </div>
  );
}

interface LineVatBreakdownProps {
  isRTL: boolean;
  currency: string;
  hasAnyLineVat: boolean;
  lineVatTotals: { net: number; vat: number; gross: number };
}

/**
 * Display-only per-line VAT breakdown summary (CT5G.2).
 * Parent owns all derivation; this component renders totals only.
 */
export function ContractLineVatBreakdown({
  isRTL,
  currency,
  hasAnyLineVat,
  lineVatTotals,
}: LineVatBreakdownProps) {
  return (
    <div className="p-3 rounded-xl bg-muted/30 border border-border/30 space-y-1.5">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="font-semibold">{isRTL ? 'تفصيل ضريبة البنود (تقديري للعرض فقط)' : 'Line VAT Breakdown (display only)'}</span>
      </div>
      {hasAnyLineVat ? (
        <>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{isRTL ? 'إجمالي الصافي' : 'Total Net'}</span>
            <span className="font-mono">{lineVatTotals.net.toLocaleString()} {currency}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{isRTL ? 'إجمالي الضريبة' : 'Total VAT'}</span>
            <span className="font-mono">{lineVatTotals.vat.toLocaleString()} {currency}</span>
          </div>
          <Separator className="my-1" />
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span>{isRTL ? 'الإجمالي شامل الضريبة' : 'Total Gross'}</span>
            <span className="font-mono">{lineVatTotals.gross.toLocaleString()} {currency}</span>
          </div>
        </>
      ) : (
        <p className="text-[10px] text-muted-foreground">{isRTL ? 'لا توجد ضريبة على البنود' : 'No VAT applied to line items'}</p>
      )}
    </div>
  );
}