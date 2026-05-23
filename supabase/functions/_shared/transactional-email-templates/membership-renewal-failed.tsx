/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  businessName?: string
  tierName?: string
  gracePeriodUntil?: string
  downgradeToTier?: string
}

const Email: React.FC<Props> = ({ recipientName, businessName, tierName, gracePeriodUntil, downgradeToTier }) => (
  <BilingualEmail
    preview={`تعذّر تجديد اشتراكك · Renewal failed`}
    badge={{ textAr: 'فشل التجديد', textEn: 'Renewal failed', tone: 'danger' }}
    titleAr="تعذّر تجديد اشتراكك"
    titleEn="We could not renew your subscription"
    greetingNameAr={recipientName}
    greetingNameEn={recipientName}
    introAr={`تعذّر تجديد اشتراكك في باقة ${tierName ?? ''}. الحساب الآن في فترة سماح حتى ${gracePeriodUntil ?? '—'}، وبعدها سيتم التحويل إلى باقة ${downgradeToTier ?? 'free'}.`}
    introEn={`We could not renew your ${tierName ?? ''} subscription. Your account is in a grace period until ${gracePeriodUntil ?? '—'}, after which it will move to ${downgradeToTier ?? 'free'}.`}
    details={[
      ...(businessName ? [{ labelAr: 'المنشأة', labelEn: 'Business', value: businessName }] : []),
      ...(tierName ? [{ labelAr: 'الباقة', labelEn: 'Plan', value: tierName, mono: true }] : []),
      ...(gracePeriodUntil ? [{ labelAr: 'فترة السماح حتى', labelEn: 'Grace period until', value: gracePeriodUntil }] : []),
      ...(downgradeToTier ? [{ labelAr: 'سيتم التحويل إلى', labelEn: 'Will downgrade to', value: downgradeToTier, mono: true }] : []),
    ]}
    cta={{ href: `${SITE_URL}/membership`, labelAr: 'مراجعة الاشتراك', labelEn: 'Review subscription' }}
    tipAr="للتجديد يدوياً يُرجى التواصل مع فريق قِطاعات."
    tipEn="To renew manually, please contact the Qitaat team."
  />
)

export const template = {
  component: Email,
  subject: `تعذّر تجديد اشتراكك · Renewal failed`,
  displayName: 'اشتراك — فشل التجديد · Renewal failed',
  previewData: { recipientName: 'أحمد العتيبي', tierName: 'premium', gracePeriodUntil: '2026-05-26', downgradeToTier: 'free' },
} satisfies TemplateEntry