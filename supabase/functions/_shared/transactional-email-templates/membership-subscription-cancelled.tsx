/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  businessName?: string
  expiresAt?: string
}

const Email: React.FC<Props> = ({ recipientName, businessName, expiresAt }) => (
  <BilingualEmail
    preview={`تم جدولة إلغاء اشتراكك في ${SITE_NAME_AR} · Cancellation scheduled`}
    badge={{ textAr: 'تم جدولة الإلغاء', textEn: 'Cancellation scheduled', tone: 'warning' }}
    titleAr="تم جدولة إلغاء اشتراكك"
    titleEn="Your cancellation is scheduled"
    greetingNameAr={recipientName}
    greetingNameEn={recipientName}
    introAr="تم جدولة إلغاء اشتراكك. ستظل مزايا باقتك الحالية فعّالة حتى تاريخ انتهاء الفترة الحالية، ثم يعود الحساب إلى الباقة المجانية."
    introEn="Your cancellation is scheduled. Your current plan benefits remain active until the end of the current period, after which your account returns to the Free plan."
    details={[
      ...(businessName ? [{ labelAr: 'المنشأة', labelEn: 'Business', value: businessName }] : []),
      ...(expiresAt ? [{ labelAr: 'تاريخ انتهاء الفترة', labelEn: 'Period ends', value: expiresAt }] : []),
    ]}
    cta={{ href: `${SITE_URL}/membership`, labelAr: 'عرض الباقات', labelEn: 'View plans' }}
  />
)

export const template = {
  component: Email,
  subject: `تم جدولة إلغاء اشتراكك في ${SITE_NAME_AR} · Cancellation scheduled`,
  displayName: 'اشتراك — جدولة الإلغاء · Cancellation scheduled',
  previewData: { recipientName: 'أحمد العتيبي', businessName: 'مصنع الخليج للألمنيوم', expiresAt: '2026-06-23' },
} satisfies TemplateEntry