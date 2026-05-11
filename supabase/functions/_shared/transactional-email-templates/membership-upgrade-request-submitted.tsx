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
    preview={`تم استلام طلب ترقية الباقة في ${SITE_NAME_AR} · Upgrade request received`}
    badge={{ textAr: 'قيد المراجعة', textEn: 'Under review', tone: 'info' }}
    titleAr="تم استلام طلب ترقية الباقة"
    titleEn="We received your upgrade request"
    greetingNameAr={recipientName}
    greetingNameEn={recipientName}
    introAr="تم استلام طلب ترقية باقتك، وسيقوم فريق قِطاعات بمراجعته والتواصل معك قريباً."
    introEn="Your membership upgrade request has been received. The Qitaat team will review it and contact you shortly."
    details={[
      ...(businessName ? [{ labelAr: 'المنشأة', labelEn: 'Business', value: businessName }] : []),
      ...(requestedTier ? [{ labelAr: 'الباقة المطلوبة', labelEn: 'Requested plan', value: requestedTier, mono: true }] : []),
    ]}
    cta={{ href: `${SITE_URL}/membership`, labelAr: 'عرض العضوية', labelEn: 'View membership' }}
    tipAr="خلال هذه المرحلة التجريبية يتم تفعيل الترقيات يدوياً دون رسوم."
    tipEn="During the beta, upgrades are activated manually with no charge."
  />
)

export const template = {
  component: Email,
  subject: `تم استلام طلب ترقية الباقة في ${SITE_NAME_AR} · Upgrade request received`,
  displayName: 'طلب ترقية باقة — تم الاستلام · Upgrade request submitted',
  previewData: { recipientName: 'أحمد العتيبي', businessName: 'مصنع الخليج للألمنيوم', requestedTier: 'premium' },
} satisfies TemplateEntry