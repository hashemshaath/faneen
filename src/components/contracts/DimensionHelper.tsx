/**
 * Provider Contract UX 2 — Part B
 * Inline helper that renders unit conversions and a localized formula preview
 * for the active pricing method. Pure presentational; no calculations are
 * persisted — the server trigger remains the source of truth.
 */
import React from 'react';
import { Calculator, Info } from 'lucide-react';
import type { PricingMethod } from '@/lib/contract-pricing';

interface Props {
  isRTL: boolean;
  method: PricingMethod;
  lengthMm?: string | number | null;
  widthMm?: string | number | null;
  heightMm?: string | number | null;
  weightKg?: string | number | null;
  weightTon?: string | number | null;
  amount?: string | number | null;
}

const num = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const fmt = (n: number, digits = 2) => n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const DimensionHelper: React.FC<Props> = ({
  isRTL, method, lengthMm, widthMm, heightMm, weightKg, weightTon, amount,
}) => {
  const L = num(lengthMm);
  const W = num(widthMm);
  const H = num(heightMm);
  const Kg = num(weightKg);
  const T = num(weightTon);
  const Amt = num(amount);

  let conversion: string | null = null;
  let formula: string | null = null;

  switch (method) {
    case 'linear_meter':
      if (L != null) conversion = `${fmt(L, 0)}mm = ${fmt(L / 1000)}m`;
      formula = isRTL ? 'الطول بالمتر × الكمية × سعر المتر' : 'Length (m) × Qty × Price/m';
      break;
    case 'square_meter':
      if (L != null && W != null) conversion = `${fmt(L, 0)} × ${fmt(W, 0)}mm = ${fmt((L * W) / 1_000_000)}m²`;
      formula = isRTL ? 'الطول × العرض × الكمية × سعر المتر المربع' : 'Length × Width × Qty × Price/m²';
      break;
    case 'cubic_meter':
      if (L != null && W != null && H != null) conversion = `${fmt(L, 0)} × ${fmt(W, 0)} × ${fmt(H, 0)}mm = ${fmt((L * W * H) / 1_000_000_000)}m³`;
      formula = isRTL ? 'الطول × العرض × الارتفاع × الكمية × سعر المتر المكعب' : 'L × W × H × Qty × Price/m³';
      break;
    case 'kilogram':
      if (Kg != null) conversion = `${fmt(Kg)} kg`;
      formula = isRTL ? 'الوزن × سعر الكيلو' : 'Weight (kg) × Price/kg';
      break;
    case 'ton':
      if (T != null) conversion = `${fmt(T)} t = ${fmt(T * 1000, 0)} kg`;
      formula = isRTL ? 'الوزن بالطن × سعر الطن' : 'Weight (t) × Price/t';
      break;
    case 'lump_sum':
      if (Amt != null) conversion = isRTL ? `المبلغ: ${fmt(Amt)}` : `Amount: ${fmt(Amt)}`;
      formula = isRTL ? 'مبلغ ثابت لهذا البند' : 'Fixed lump sum for this item';
      break;
    case 'unit':
    default:
      formula = isRTL ? 'الكمية × سعر الوحدة' : 'Qty × Unit Price';
  }

  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 px-2.5 py-2 text-[10px] leading-relaxed space-y-0.5">
      {conversion && (
        <div className="flex items-center gap-1.5 text-muted-foreground" dir="ltr">
          <Calculator className="w-3 h-3 shrink-0" />
          <span className="font-mono">{conversion}</span>
        </div>
      )}
      {formula && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Info className="w-3 h-3 shrink-0" />
          <span>{isRTL ? 'الصيغة: ' : 'Formula: '}{formula}</span>
        </div>
      )}
      <div className="text-[9px] text-muted-foreground/80">
        {isRTL
          ? 'سيتم التحقق من التكلفة وحسابها من النظام عند الحفظ.'
          : 'The final cost is validated and recomputed by the server on save.'}
      </div>
    </div>
  );
};

export default DimensionHelper;