/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  businessName?: string
  oldTier?: string
  newTier?: string
  expiresAt?: string
}

const Email: React.FC<Props> = ({ recipientName, businessName, oldTier, newTier, expiresAt }) => (
  <BilingualEmail
    preview={`انتهت صلاحية اشتراكك · Subscription expired`}
    badge={{ textAr: 'انتهى الاشتراك', textEn: 'Expired', tone: 'warning' }}
    titleAr="انتهت صلاحية اشتراكك"
    titleEn="Your subscription has expired"
    greetingNameAr={recipientName}
    greetingNameEn={recipientName}
    introAr={`انتهت صلاحية اشتراكك في باقة ${oldTier ?? ''}، وتم تحويل الحساب إلى باقة ${newTier ?? 'free'}. يمكنك ترقية الباقة في أي وقت.`}
    introEn={`Your ${oldTier ?? ''} subscription has expired and your account has been moved to ${newTier ?? 'free'}. You can upgrade again anytime.`}
    details={[
      ...(businessName ? [{ labelAr: 'المنشأة', labelEn: 'Business', value: businessName }] : []),
      ...(oldTier ? [{ labelAr: 'الباقة السابقة', labelEn: 'Previous plan', value: oldTier, mono: true }] : []),
      ...(newTier ? [{ labelAr: 'الباقة الحالية', labelEn: 'Current plan', value: newTier, mono: true }] : []),
      ...(expiresAt ? [{ labelAr: 'انتهت في', labelEn: 'Expired at', value: expiresAt }] : []),
    ]}
    cta={{ href: `${SITE_URL}/membership`, labelAr: 'عرض الباقات', labelEn: 'View plans' }}
  />
)

export const template = {
  component: Email,
  subject: `انتهت صلاحية اشتراكك · Subscription expired`,
  displayName: 'اشتراك — انتهى · Subscription expired',
  previewData: { recipientName: 'أحمد العتيبي', oldTier: 'premium', newTier: 'free', expiresAt: '2026-05-23' },
} satisfies TemplateEntry