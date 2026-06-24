/**
 * ContractLiveSummarySidebar — Sticky live summary that mirrors the
 * Executive Dashboard direction selected for the contract creation
 * workspace. Pure presentation; no Supabase or business logic.
 */
import React from 'react';
import { ClipboardList, CheckCircle2, Info } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';

interface Row {
  label: string;
  value: string | null;
  pending?: boolean;
}

interface Props {
  isRTL: boolean;
  rows: Row[];
  completenessScore?: number;
  tip?: string | null;
}

export const ContractLiveSummarySidebar: React.FC<Props> = ({ isRTL, rows, completenessScore, tip }) => {
  const score = Math.max(0, Math.min(100, Math.round(completenessScore ?? 0)));
  return (
    <div className="space-y-4 lg:sticky lg:top-4">
      <div className="rounded-2xl bg-slate-900 text-white p-5 shadow-elev-3 border border-white/5">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-accent rounded-full" aria-hidden="true" />
          <ClipboardList className="w-4 h-4 text-accent" aria-hidden="true" />
          {pickBi(isRTL, 'ملخص العقد الجاري', 'Live contract summary')}
        </h3>
        <ul className="space-y-3">
          {rows.map((r, i) => (
            <li key={i} className="flex items-start justify-between gap-3 pb-3 border-b border-white/5 last:border-0 last:pb-0">
              <span className="text-[11px] text-slate-400 shrink-0">{r.label}</span>
              {r.value ? (
                <span className="text-[11px] font-medium text-end truncate max-w-[60%]" title={r.value}>{r.value}</span>
              ) : (
                <span className="text-[10px] font-bold text-accent italic">{pickBi(isRTL, 'قيد الإدخال…', 'Pending…')}</span>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between mb-1.5 text-[10px]">
            <span className="text-slate-400">{pickBi(isRTL, 'اكتمال الملف', 'Completeness')}</span>
            <span className="font-bold flex items-center gap-1">
              {score >= 100 && <CheckCircle2 className="w-3 h-3 text-success" aria-hidden="true" />}
              {score}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${score >= 80 ? 'bg-success' : score >= 40 ? 'bg-accent' : 'bg-primary'}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </div>
      {tip && (
        <div className="rounded-2xl bg-warning/10 border border-warning/30 p-4 flex gap-3">
          <Info className="w-5 h-5 text-warning shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-xs font-bold text-warning-foreground mb-1">{pickBi(isRTL, 'تلميح ذكي', 'Smart tip')}</p>
            <p className="text-[11px] text-foreground/80 leading-relaxed">{tip}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractLiveSummarySidebar;