/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  businessName?: string
  reason?: string
}

const Email: React.FC<Props> = ({ recipientName, businessName, reason }) => (
  <BilingualEmail
    preview={`تم إلغاء اشتراكك فوراً · Subscription cancelled immediately`}
    badge={{ textAr: 'تم الإلغاء', textEn: 'Cancelled', tone: 'danger' }}
    titleAr="تم إلغاء اشتراكك فوراً"
    titleEn="Your subscription has been cancelled"
    greetingNameAr={recipientName}
    greetingNameEn={recipientName}
    introAr={`تم إلغاء اشتراكك بشكل فوري من قِبل الإدارة، وعاد حسابك إلى الباقة المجانية. للاستفسار يُرجى التواصل مع فريق ${SITE_NAME_AR}.`}
    introEn={`Your subscription has been cancelled immediately by an administrator and your account is now on the Free plan. Please contact the Qitaat team for any questions.`}
    details={[
      ...(businessName ? [{ labelAr: 'المنشأة', labelEn: 'Business', value: businessName }] : []),
      ...(reason ? [{ labelAr: 'السبب', labelEn: 'Reason', value: reason }] : []),
    ]}
    cta={{ href: `${SITE_URL}/membership`, labelAr: 'عرض الباقات', labelEn: 'View plans' }}
  />
)

export const template = {
  component: Email,
  subject: `تم إلغاء اشتراكك فوراً · Subscription cancelled immediately`,
  displayName: 'اشتراك — إلغاء فوري · Cancelled immediately',
  previewData: { recipientName: 'أحمد العتيبي', businessName: 'مصنع الخليج للألمنيوم' },
} satisfies TemplateEntry