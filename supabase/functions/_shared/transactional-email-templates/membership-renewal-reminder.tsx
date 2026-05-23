/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  businessName?: string
  tierName?: string
  daysRemaining?: number | string
  expiresAt?: string
}

const Email: React.FC<Props> = ({ recipientName, businessName, tierName, daysRemaining, expiresAt }) => {
  const days = daysRemaining ?? '—'
  return (
    <BilingualEmail
      preview={`تذكير: تجديد اشتراكك خلال ${days} يوم · Renewal in ${days} days`}
      badge={{ textAr: 'تذكير بالتجديد', textEn: 'Renewal reminder', tone: 'info' }}
      titleAr="تذكير بتجديد اشتراكك"
      titleEn="Renewal reminder"
      greetingNameAr={recipientName}
      greetingNameEn={recipientName}
      introAr={`ينتهي اشتراكك في باقة ${tierName ?? ''} خلال ${days} يوم${expiresAt ? ` (${expiresAt})` : ''}. لضمان استمرار المزايا، يُرجى مراجعة فريق ${SITE_NAME_AR} للتجديد.`}
      introEn={`Your ${tierName ?? ''} subscription ends in ${days} days${expiresAt ? ` on ${expiresAt}` : ''}. To keep your benefits active, please contact the Qitaat team to renew.`}
      details={[
        ...(businessName ? [{ labelAr: 'المنشأة', labelEn: 'Business', value: businessName }] : []),
        ...(tierName ? [{ labelAr: 'الباقة', labelEn: 'Plan', value: tierName, mono: true }] : []),
        ...(expiresAt ? [{ labelAr: 'تاريخ الانتهاء', labelEn: 'Expires at', value: expiresAt }] : []),
      ]}
      cta={{ href: `${SITE_URL}/membership`, labelAr: 'عرض الباقات', labelEn: 'View plans' }}
      tipAr="التجديد التلقائي عبر الدفع الإلكتروني غير متاح حالياً."
      tipEn="Online auto-renewal is not available yet."
    />
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, unknown>) => {
    const days = (d?.daysRemaining as number | string | undefined) ?? '—'
    return `تذكير: تجديد اشتراكك خلال ${days} يوم · Renewal in ${days} days`
  },
  displayName: 'اشتراك — تذكير بالتجديد · Renewal reminder',
  previewData: { recipientName: 'أحمد العتيبي', tierName: 'premium', daysRemaining: 7, expiresAt: '2026-06-01' },
} satisfies TemplateEntry