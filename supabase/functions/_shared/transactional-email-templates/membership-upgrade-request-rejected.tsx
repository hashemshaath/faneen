/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  businessName?: string
  requestedTier?: string
}

const Email: React.FC<Props> = ({ recipientName, businessName, requestedTier }) => (
  <BilingualEmail
    preview={`تحديث بخصوص طلب ترقية الباقة في ${SITE_NAME_AR} · Upgrade request update`}
    badge={{ textAr: 'تحديث', textEn: 'Update', tone: 'warning' }}
    titleAr="تحديث بخصوص طلب ترقية الباقة"
    titleEn="Update on your upgrade request"
    greetingNameAr={recipientName}
    greetingNameEn={recipientName}
    introAr="تمت مراجعة طلب ترقية الباقة، ولم يتم اعتماده حالياً. يمكنك التواصل مع فريق قِطاعات لمزيد من التفاصيل."
    introEn="Your upgrade request has been reviewed and was not approved at this time. Please contact the Qitaat team for more details."
    details={[
      ...(businessName ? [{ labelAr: 'المنشأة', labelEn: 'Business', value: businessName }] : []),
      ...(requestedTier ? [{ labelAr: 'الباقة المطلوبة', labelEn: 'Requested plan', value: requestedTier, mono: true }] : []),
    ]}
    cta={{ href: `${SITE_URL}/membership`, labelAr: 'عرض العضوية', labelEn: 'View membership' }}
  />
)

export const template = {
  component: Email,
  subject: `تحديث بخصوص طلب ترقية الباقة · Upgrade request update — ${SITE_NAME_AR}`,
  displayName: 'طلب ترقية باقة — رفض · Upgrade rejected',
  previewData: { recipientName: 'أحمد العتيبي', businessName: 'مصنع الخليج للألمنيوم', requestedTier: 'premium' },
} satisfies TemplateEntry