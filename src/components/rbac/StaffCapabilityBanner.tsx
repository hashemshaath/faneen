/**
 * M6.3 — Friendly staff-permission notice.
 *
 * Renders a top-of-page banner when the current user is a staff member
 * whose role does not include the capability the page requires. Does not
 * replace server-side enforcement — it explains WHY buttons are disabled.
 */
import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  useBusinessCapabilities,
  capabilityAllowed,
  type CapabilityKey,
} from '@/hooks/useBusinessCapabilities';

const COPY: Record<CapabilityKey, { ar: string; en: string }> = {
  contracts: {
    ar: 'إنشاء العقود وتوقيعها يحتاج صلاحية من مالك المنشأة.',
    en: 'Creating and signing contracts requires permission from the business owner.',
  },
  membership: {
    ar: 'إدارة اشتراك العضوية تحتاج صلاحية من مالك المنشأة.',
    en: 'Managing the membership subscription requires permission from the business owner.',
  },
  business_identity: {
    ar: 'تعديل بيانات الجهة الرسمية (الاسم، الرقم الضريبي، السجل التجاري) يحتاج صلاحية من مالك المنشأة.',
    en: 'Editing official business identity fields (name, VAT, CR) requires permission from the business owner.',
  },
};

interface Props {
  businessId: string | null | undefined;
  capability: CapabilityKey;
  className?: string;
}

export const StaffCapabilityBanner: React.FC<Props> = ({
  businessId,
  capability,
  className,
}) => {
  const { isRTL } = useLanguage();
  const caps = useBusinessCapabilities(businessId);
  if (!businessId || caps.isLoading) return null;
  if (!caps.isStaff) return null;
  if (capabilityAllowed(caps, capability)) return null;

  const copy = COPY[capability];
  return (
    <div
      role="alert"
      data-testid={`staff-capability-banner-${capability}`}
      className={
        'rounded-2xl border border-warning/40 bg-warning/10 p-3 flex items-start gap-2 text-sm ' +
        (className ?? '')
      }
    >
      <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" />
      <div className="text-warning">{isRTL ? copy.ar : copy.en}</div>
    </div>
  );
};

export default StaffCapabilityBanner;