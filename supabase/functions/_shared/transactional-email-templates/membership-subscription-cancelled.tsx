/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  businessName?: string
}

const Email: React.FC<Props> = ({ recipientName, businessName }) => (
  <BilingualEmail
    preview={`تم إلغاء اشتراكك في ${SITE_NAME_AR} · Subscription cancelled`}
    badge={{ textAr: 'تم الإلغاء', textEn: 'Cancelled', tone: 'neutral' }}
    titleAr="تم إلغاء اشتراكك"
    titleEn="Your subscription has been cancelled"
    greetingNameAr={recipientName}
    greetingNameEn={recipientName}
    introAr="تم إلغاء الاشتراك والعودة إلى الباقة المجانية. يمكنك طلب الترقية مرة أخرى في أي وقت."
    introEn="Your subscription has been cancelled and your account is now on the Free plan. You can request an upgrade again at any time."
    details={businessName ? [{ labelAr: 'المنشأة', labelEn: 'Business', value: businessName }] : undefined}
    cta={{ href: `${SITE_URL}/membership`, labelAr: 'عرض الباقات', labelEn: 'View plans' }}
  />
)

export const template = {
  component: Email,
  subject: `تم إلغاء اشتراكك في ${SITE_NAME_AR} · Subscription cancelled`,
  displayName: 'اشتراك — تم الإلغاء · Subscription cancelled',
  previewData: { recipientName: 'أحمد العتيبي', businessName: 'مصنع الخليج للألمنيوم' },
} satisfies TemplateEntry