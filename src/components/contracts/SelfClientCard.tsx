/**
 * SelfClientCard — read-only client party card rendered for pure
 * client-only accounts during contract creation. Extracted from
 * DashboardContracts.tsx purely to keep that page under its line cap;
 * functional behaviour is preserved 1:1.
 *
 * No Supabase calls, no side effects, no business logic.
 */
import React from 'react';
import { User } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';

export interface SelfClientCardProps {
  isRTL: boolean;
  clientName: string | null;
  email: string | null;
  phone: string | null;
  refId: string | null;
  hasMissingRequiredInfo: boolean;
}

export const SelfClientCard: React.FC<SelfClientCardProps> = ({
  isRTL,
  clientName,
  email,
  phone,
  refId,
  hasMissingRequiredInfo,
}) => {
  return (
    <div
      data-testid="contract-create-self-client-card"
      className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2"
    >
      <div className="flex items-center gap-2 text-xs font-semibold">
        <User className="w-3.5 h-3.5 text-primary" />
        {pickBi(isRTL, 'الطرف الثاني — صاحب الحساب', 'Second party — Account holder')}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-foreground/80">
        <div><span className="text-muted-foreground">{pickBi(isRTL, 'الاسم: ', 'Name: ')}</span>{clientName || '—'}</div>
        <div><span className="text-muted-foreground">{pickBi(isRTL, 'الجوال: ', 'Phone: ')}</span>{phone || '—'}</div>
        <div><span className="text-muted-foreground">{pickBi(isRTL, 'البريد: ', 'Email: ')}</span>{email || '—'}</div>
        <div><span className="text-muted-foreground">{pickBi(isRTL, 'المعرّف: ', 'Ref: ')}</span>{refId || '—'}</div>
      </div>
      {hasMissingRequiredInfo && (
        <div className="text-[11px] text-warning">
          {pickBi(isRTL, 'أكمل بيانات الحساب أو الموقع قبل إنشاء العقد', 'Complete your account or site details before creating the contract')}
        </div>
      )}
    </div>
  );
};

export default SelfClientCard;