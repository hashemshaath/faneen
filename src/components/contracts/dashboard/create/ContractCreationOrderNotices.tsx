/**
 * Phase C — Creation order UX notices.
 *
 * Pure presentational notices rendered for client-only accounts to make
 * the contract creation order explicit:
 *   1. Sector / specialty (placeholder for now)
 *   2. First party — executing provider
 *   3. Execution site
 *   4. Second party — account holder (SelfClientCard)
 *   5. Template + line items
 *
 * No data fetching, no side effects.
 */
import React from 'react';
import { Tags, Building2 } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';

export interface SectorPlaceholderNoticeProps {
  isRTL: boolean;
}

export const SectorPlaceholderNotice: React.FC<SectorPlaceholderNoticeProps> = ({ isRTL }) => (
  <div
    data-testid="contract-create-sector-placeholder"
    className="p-3 rounded-xl border border-border/50 bg-muted/20 flex items-start gap-2"
  >
    <Tags className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
    <div className="space-y-0.5">
      <div className="text-[11px] font-semibold">
        {pickBi(isRTL, 'المجال / التخصص', 'Sector / specialty')}
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        {pickBi(
          isRTL,
          'سيتم اعتماد المجال من المشروع أو الجهة المنفذة عند توفره. سيتم عرض القوالب والبنود حسب المجال في المرحلة التالية.',
          'The sector will be inherited from the project or the executing provider when available. Templates and line items will be filtered by sector in a later phase.',
        )}
      </p>
    </div>
  </div>
);

export interface FirstPartyNoticeProps {
  isRTL: boolean;
  providerName: string | null;
}

export const FirstPartyNotice: React.FC<FirstPartyNoticeProps> = ({ isRTL, providerName }) => {
  const hasProvider = !!providerName && providerName.trim().length > 0;
  return (
    <div
      data-testid="contract-create-first-party-notice"
      className={`p-3 rounded-xl border ${hasProvider ? 'border-primary/40 bg-primary/5' : 'border-warning/40 bg-warning/5'} space-y-1`}
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold">
        <Building2 className="w-3.5 h-3.5 text-primary" />
        {pickBi(isRTL, 'الطرف الأول — الجهة المنفذة', 'First party — Executing provider')}
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        {hasProvider
          ? providerName
          : pickBi(
              isRTL,
              'اختر الجهة المنفذة لتحديد الطرف الأول',
              'Choose the executing provider to set the first party',
            )}
      </p>
    </div>
  );
};

export default FirstPartyNotice;