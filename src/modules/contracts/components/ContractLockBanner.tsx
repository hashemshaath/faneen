import React from 'react';
import { Shield } from 'lucide-react';

export interface ContractLockBannerProps {
  isRTL: boolean;
}

export const ContractLockBanner: React.FC<ContractLockBannerProps> = ({ isRTL }) => (
  <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-warning dark:bg-warning/20 border border-warning dark:border-warning/30 text-warning dark:text-warning">
    <Shield className="w-5 h-5 shrink-0" />
    <div>
      <p className="font-heading font-bold text-xs">
        {isRTL ? 'العقد معتمد ومقفل' : 'Contract Approved & Locked'}
      </p>
      <p className="text-[10px] font-body">
        {isRTL ? 'أي تعديل يتطلب ملحق عقد وموافقة الطرفين' : 'Any changes require an amendment approved by both parties'}
      </p>
    </div>
  </div>
);