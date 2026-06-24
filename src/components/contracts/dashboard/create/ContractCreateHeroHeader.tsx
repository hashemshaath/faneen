/**
 * ContractCreateHeroHeader — Executive Dark Hero header for the
 * contract creation workspace. Pure presentation.
 */
import React from 'react';
import { FileSignature, Edit3 } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';

interface Props {
  isRTL: boolean;
  editingId: string | null;
  draftRef?: string | null;
}

export const ContractCreateHeroHeader: React.FC<Props> = ({ isRTL, editingId, draftRef }) => {
  const Icon = editingId ? Edit3 : FileSignature;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white p-5 sm:p-7 shadow-elev-3">
      <div className="absolute -top-20 -end-20 w-72 h-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute -bottom-24 -start-16 w-72 h-72 rounded-full bg-accent/10 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur-sm">
            <Icon className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold leading-tight">
              {editingId
                ? pickBi(isRTL, 'تعديل العقد', 'Edit Contract')
                : pickBi(isRTL, 'إنشاء عقد خدمات صناعية', 'Create Industrial Services Contract')}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
              {pickBi(isRTL, 'أكمل الخطوات التالية بدقّة لإصدار مسودة العقد', 'Complete the steps below to issue the contract draft')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {draftRef && (
            <div className="text-[10px] sm:text-[11px] font-medium text-slate-300 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
              {pickBi(isRTL, 'مسودة', 'Draft')} #{draftRef}
            </div>
          )}
          <div className="text-end">
            <p className="text-[9px] uppercase tracking-wider text-slate-500">{pickBi(isRTL, 'الحالة', 'Status')}</p>
            <p className="text-accent text-xs font-semibold">
              {editingId ? pickBi(isRTL, 'قيد التعديل', 'Editing') : pickBi(isRTL, 'مسودة قيد التحضير', 'Draft in progress')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractCreateHeroHeader;