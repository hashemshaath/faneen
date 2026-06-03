import React from 'react';
import { CompactInput } from './CompactInput';
import { CheckCircle2, Phone } from 'lucide-react';
import type { ProviderLeadBranchInput, ErrorMap } from '../types';

export interface BranchAccordionCardProps {
  index: number;
  branch: ProviderLeadBranchInput;
  errors: ErrorMap;
  isRTL: boolean;
  onChange: (k: keyof ProviderLeadBranchInput, v: string) => void;
  clearError: (k: string) => void;
}

export const BranchAccordionCard: React.FC<BranchAccordionCardProps> = ({
  index, branch, errors, isRTL, onChange, clearError,
}) => {
  const t = (ar: string, en: string) => (isRTL ? ar : en);
  const errKey = `branch_${index}_name`;
  return (
    <details
      data-error-key={errKey}
      open={index === 0 || !branch.branch_name}
      className={`group rounded-xl border bg-card overflow-hidden ${errors[errKey] ? 'border-destructive/60' : ''}`}
    >
      <summary className="cursor-pointer list-none flex items-center justify-between gap-3 p-3 hover:bg-muted/30">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[12px] font-bold tech-content shrink-0">
            {index + 2}
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold truncate">
              {branch.branch_name || t(`فرع ${index + 2}`, `Branch ${index + 2}`)}
            </div>
            {(branch.city || branch.address) && (
              <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                {[branch.city, branch.address].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0">
          {branch.branch_name ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : t('غير مكتمل', 'Incomplete')}
        </span>
      </summary>
      <div className="border-t p-3 bg-muted/10 space-y-3">
        <CompactInput
          id={`branch_${index}_branch_name`}
          label={t('اسم الفرع', 'Branch name')}
          required
          placeholder={t('مثال: فرع الرياض', 'e.g. Riyadh Branch')}
          value={branch.branch_name}
          onChange={(e) => { onChange('branch_name', e.target.value); clearError(errKey); }}
          error={errors[errKey]}
        />
        <CompactInput
          id={`branch_${index}_city`}
          label={t('المدينة', 'City')}
          value={branch.city ?? ''}
          onChange={(e) => onChange('city', e.target.value)}
        />
        <CompactInput
          id={`branch_${index}_address`}
          label={t('العنوان', 'Address')}
          value={branch.address ?? ''}
          onChange={(e) => onChange('address', e.target.value)}
        />
        <CompactInput
          id={`branch_${index}_phone`}
          label={t('رقم التواصل', 'Phone')}
          dir="ltr"
          placeholder="05xxxxxxxx"
          startIcon={<Phone />}
          className="tech-content"
          value={branch.phone ?? ''}
          onChange={(e) => onChange('phone', e.target.value)}
        />
        <CompactInput
          id={`branch_${index}_map_link`}
          label={t('رابط الموقع', 'Map link')}
          dir="ltr"
          placeholder="https://maps.google.com/..."
          value={branch.map_link ?? ''}
          onChange={(e) => onChange('map_link', e.target.value)}
        />
      </div>
    </details>
  );
};