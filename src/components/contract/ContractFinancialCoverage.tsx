/**
 * ContractFinancialCoverage (C3C) — read-only validation summary.
 *
 * Renders compact financial KPIs (contract total, scheduled, paid, remaining)
 * + VAT breakdown + a list of warning chips about coverage and milestone↔payment
 * linking gaps. Pure presentation: never mutates state, never auto-rebalances,
 * works the same whether the contract is locked or not.
 */
import React from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Wallet,
  Receipt,
  Banknote,
  Percent,
  ListChecks,
} from 'lucide-react';
import {
  calculateContractCoverage,
  formatMoney,
  type PaymentLike,
  type MilestoneLike,
} from '@/lib/contract-financials';

interface Props {
  contract: {
    total_amount?: number | string | null;
    vat_rate?: number | string | null;
    vat_inclusive?: boolean | null;
    currency_code?: string | null;
  } | null | undefined;
  payments: PaymentLike[] | null | undefined;
  milestones: (MilestoneLike & { id?: string })[] | null | undefined;
}

const KpiCard: React.FC<{ icon: React.ElementType; label: string; value: string; sub?: string; tone?: 'default' | 'success' | 'warning' | 'accent' }> = ({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'default',
}) => {
  const toneCls =
    tone === 'success'
      ? 'text-success'
      : tone === 'warning'
        ? 'text-warning'
        : tone === 'accent'
          ? 'text-accent'
          : 'text-foreground';
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-accent" />
        </div>
        <span className="text-[10px] text-muted-foreground font-body">{label}</span>
      </div>
      <p className={`font-heading font-bold text-sm tech-content ${toneCls}`} dir="ltr">
        {value}
      </p>
      {sub && <p className="text-[10px] text-muted-foreground font-body mt-0.5">{sub}</p>}
    </div>
  );
};

export const ContractFinancialCoverage: React.FC<Props> = ({ contract, payments, milestones }) => {
  const { isRTL } = useLanguage();
  const c = calculateContractCoverage({ contract, payments, milestones });

  const paidPct = c.contractTotal > 0 ? Math.min(100, Math.round((c.paidAmount / c.contractTotal) * 100)) : 0;

  // Build warning chips (state-driven, no popups)
  const chips: Array<{ tone: 'success' | 'warning' | 'info'; label: string; icon: React.ElementType }> = [];

  // Payments coverage
  if (c.paymentsState === 'no_schedule') {
    chips.push({
      tone: 'info',
      icon: Info,
      label: isRTL ? 'لا يوجد جدول دفعات بعد' : 'No payment schedule yet',
    });
  } else if (c.paymentsState === 'matched') {
    chips.push({
      tone: 'success',
      icon: CheckCircle2,
      label: isRTL
        ? 'جدول الدفعات يغطي كامل قيمة العقد'
        : 'Payment schedule covers the full contract total',
    });
  } else if (c.paymentsState === 'under') {
    chips.push({
      tone: 'warning',
      icon: AlertTriangle,
      label: isRTL ? 'مجموع الدفعات أقل من قيمة العقد' : 'Payments are less than contract total',
    });
  } else {
    chips.push({
      tone: 'warning',
      icon: AlertTriangle,
      label: isRTL ? 'مجموع الدفعات يتجاوز قيمة العقد' : 'Payments exceed contract total',
    });
  }

  // Milestone coverage
  if (c.milestonesCount === 0) {
    // intentionally silent
  } else if (!c.milestonesHaveAmounts) {
    chips.push({
      tone: 'info',
      icon: Info,
      label: isRTL ? 'المراحل غير مرتبطة بقيم مالية حالياً.' : 'Milestones are not financially valued yet.',
    });
  } else if (c.milestonesCoverState === 'under') {
    chips.push({
      tone: 'warning',
      icon: AlertTriangle,
      label: isRTL ? 'مجموع قيم المراحل أقل من قيمة العقد' : 'Milestone amounts are less than contract total',
    });
  } else if (c.milestonesCoverState === 'over') {
    chips.push({
      tone: 'warning',
      icon: AlertTriangle,
      label: isRTL ? 'مجموع قيم المراحل يتجاوز قيمة العقد' : 'Milestone amounts exceed contract total',
    });
  }

  // Linking gaps
  if (c.unlinkedPaymentsCount > 0) {
    chips.push({
      tone: 'info',
      icon: Info,
      label: isRTL
        ? `توجد دفعات غير مرتبطة بمراحل (${c.unlinkedPaymentsCount})`
        : `Some payments are unlinked to milestones (${c.unlinkedPaymentsCount})`,
    });
  }
  if (c.milestonesWithoutPaymentsCount > 0 && c.paymentsCount > 0) {
    chips.push({
      tone: 'info',
      icon: Info,
      label: isRTL
        ? `توجد مراحل بدون دفعات مرتبطة (${c.milestonesWithoutPaymentsCount})`
        : `Some milestones have no linked payment (${c.milestonesWithoutPaymentsCount})`,
    });
  }

  // VAT consistency
  if (!c.vatBreakdownConsistent) {
    chips.push({
      tone: 'warning',
      icon: AlertTriangle,
      label: isRTL ? 'تفاصيل الضريبة غير متسقة' : 'VAT breakdown is inconsistent',
    });
  } else if (c.contractTotal === 0) {
    chips.push({
      tone: 'info',
      icon: Info,
      label: isRTL ? 'لم تُحدَّد قيمة العقد بعد' : 'Contract total not set yet',
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 mb-5 sm:mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="w-4 h-4 text-accent" />
        <h3 className="font-heading font-bold text-sm">
          {isRTL ? 'الملخص المالي للعقد' : 'Contract Financial Summary'}
        </h3>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <KpiCard
          icon={Receipt}
          label={isRTL ? 'إجمالي العقد' : 'Contract total'}
          value={formatMoney(c.contractTotal, c.currency)}
          sub={
            c.vatRate > 0
              ? isRTL
                ? `شامل ضريبة ${c.vatRate}%`
                : `incl. ${c.vatRate}% VAT`
              : undefined
          }
          tone="accent"
        />
        <KpiCard
          icon={ListChecks}
          label={isRTL ? 'إجمالي جدول الدفعات' : 'Scheduled payments'}
          value={formatMoney(c.paymentsTotal, c.currency)}
          sub={`${c.paymentsCount} ${isRTL ? 'دفعات' : 'payments'}`}
          tone={
            c.paymentsState === 'matched'
              ? 'success'
              : c.paymentsState === 'no_schedule'
                ? 'default'
                : 'warning'
          }
        />
        <KpiCard
          icon={CheckCircle2}
          label={isRTL ? 'المسدد' : 'Paid'}
          value={formatMoney(c.paidAmount, c.currency)}
          sub={`${c.paidCount}/${c.paymentsCount} ${isRTL ? 'دفعات' : 'payments'}`}
          tone="success"
        />
        <KpiCard
          icon={Banknote}
          label={isRTL ? 'المتبقي' : 'Remaining'}
          value={formatMoney(c.remainingBalance, c.currency)}
          sub={c.contractTotal > 0 ? `${paidPct}% ${isRTL ? 'مسدد' : 'paid'}` : undefined}
        />
      </div>

      {/* Payment progress bar */}
      {c.contractTotal > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-body">
              {isRTL ? 'نسبة السداد' : 'Payment progress'}
            </span>
            <span className="text-[10px] font-heading font-semibold text-accent tech-content" dir="ltr">
              {paidPct}%
            </span>
          </div>
          <Progress value={paidPct} className="h-1.5" />
        </div>
      )}

      {/* VAT row */}
      {c.contractTotal > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-body mb-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
            <span className="text-muted-foreground">{isRTL ? 'قبل الضريبة' : 'Subtotal'}</span>
            <span className="font-heading font-semibold tech-content" dir="ltr">{formatMoney(c.subtotal, c.currency)}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
            <span className="text-muted-foreground flex items-center gap-1">
              <Percent className="w-3 h-3" />
              {isRTL ? `الضريبة (${c.vatRate}%)` : `VAT (${c.vatRate}%)`}
            </span>
            <span className="font-heading font-semibold text-warning tech-content" dir="ltr">{formatMoney(c.vatAmount, c.currency)}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
            <span className="text-muted-foreground">{isRTL ? 'الإجمالي' : 'Grand total'}</span>
            <span className="font-heading font-semibold text-accent tech-content" dir="ltr">{formatMoney(c.contractTotal, c.currency)}</span>
          </div>
        </div>
      )}

      {/* Warning chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip, i) => {
            const Icon = chip.icon;
            const cls =
              chip.tone === 'success'
                ? 'border-success/40 bg-success/10 text-success'
                : chip.tone === 'warning'
                  ? 'border-warning/40 bg-warning/10 text-warning'
                  : 'border-border bg-muted/30 text-muted-foreground';
            return (
              <Badge
                key={i}
                variant="outline"
                className={`text-[10px] font-body gap-1 ${cls}`}
              >
                <Icon className="w-3 h-3" />
                {chip.label}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ContractFinancialCoverage;