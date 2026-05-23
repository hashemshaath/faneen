/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  businessName?: string
  tierName?: string
  startsAt?: string
  expiresAt?: string
}

const Email: React.FC<Props> = ({ recipientName, businessName, tierName, startsAt, expiresAt }) => (
  <BilingualEmail
    preview={`تم تفعيل اشتراكك في ${SITE_NAME_AR} · Subscription activated`}
    badge={{ textAr: 'تم التفعيل', textEn: 'Activated', tone: 'success' }}
    titleAr="تم تفعيل اشتراكك"
    titleEn="Your subscription is now active"
    greetingNameAr={recipientName}
    greetingNameEn={recipientName}
    introAr={`تم تفعيل اشتراكك في باقة ${tierName ?? ''}. يمكنك الآن الاستفادة من جميع مزايا الباقة عبر لوحة التحكم.`}
    introEn={`Your ${tierName ?? ''} subscription is now active. You can start using all plan benefits from your dashboard.`}
    details={[
      ...(businessName ? [{ labelAr: 'المنشأة', labelEn: 'Business', value: businessName }] : []),
      ...(tierName ? [{ labelAr: 'الباقة', labelEn: 'Plan', value: tierName, mono: true }] : []),
      ...(startsAt ? [{ labelAr: 'تاريخ البدء', labelEn: 'Starts at', value: startsAt }] : []),
      ...(expiresAt ? [{ labelAr: 'تاريخ الانتهاء', labelEn: 'Expires at', value: expiresAt }] : []),
    ]}
    cta={{ href: `${SITE_URL}/dashboard`, labelAr: 'فتح لوحة التحكم', labelEn: 'Open dashboard' }}
    tipAr="خلال المرحلة التجريبية يتم التفعيل يدوياً دون رسوم."
    tipEn="During beta, activation is manual and free of charge."
  />
)

export const template = {
  component: Email,
  subject: `تم تفعيل اشتراكك في ${SITE_NAME_AR} · Subscription activated`,
  displayName: 'اشتراك — تم التفعيل · Subscription activated',
  previewData: { recipientName: 'أحمد العتيبي', businessName: 'مصنع الخليج للألمنيوم', tierName: 'premium', expiresAt: '2026-12-31' },
} satisfies TemplateEntry