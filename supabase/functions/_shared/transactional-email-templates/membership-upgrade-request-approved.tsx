/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  businessName?: string
  approvedTier?: string
}

const Email: React.FC<Props> = ({ recipientName, businessName, approvedTier }) => (
  <BilingualEmail
    preview={`تمت الموافقة على ترقية باقتك في ${SITE_NAME_AR} · Upgrade approved`}
    badge={{ textAr: 'تمت الموافقة', textEn: 'Approved', tone: 'success' }}
    titleAr="تمت الموافقة على ترقية باقتك"
    titleEn="Your upgrade has been approved"
    greetingNameAr={recipientName}
    greetingNameEn={recipientName}
    introAr="تمت الموافقة على طلب ترقية باقتك، وتم تفعيل الباقة الجديدة على حسابك."
    introEn="Your membership upgrade request was approved and the new plan is now active on your account."
    details={[
      ...(businessName ? [{ labelAr: 'المنشأة', labelEn: 'Business', value: businessName }] : []),
      ...(approvedTier ? [{ labelAr: 'الباقة الجديدة', labelEn: 'New plan', value: approvedTier, mono: true }] : []),
    ]}
    cta={{ href: `${SITE_URL}/dashboard`, labelAr: 'عرض لوحة التحكم', labelEn: 'Open dashboard' }}
    tipAr="استفد الآن من المزايا الجديدة عبر لوحة التحكم."
    tipEn="Make the most of your new plan from the dashboard."
  />
)

export const template = {
  component: Email,
  subject: `تمت الموافقة على ترقية باقتك في ${SITE_NAME_AR} · Upgrade approved`,
  displayName: 'طلب ترقية باقة — موافقة · Upgrade approved',
  previewData: { recipientName: 'أحمد العتيبي', businessName: 'مصنع الخليج للألمنيوم', approvedTier: 'premium' },
} satisfies TemplateEntry