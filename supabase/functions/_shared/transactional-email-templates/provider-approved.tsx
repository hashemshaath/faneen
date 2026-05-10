/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  businessName?: string
  username?: string
}

const ProviderApprovedEmail: React.FC<Props> = ({ recipientName, businessName, username }) => (
  <BilingualEmail
    preview={`تم اعتماد حساب منشأتك في ${SITE_NAME_AR} · Your provider account is approved`}
    badge={{ textAr: 'تم الاعتماد', textEn: 'Approved', tone: 'success' }}
    titleAr="تم اعتماد حساب منشأتك في قِطاعات"
    titleEn="Your provider account is approved"
    greetingNameAr={recipientName}
    greetingNameEn={recipientName}
    introAr="تم اعتماد حساب منشأتك ويمكنك الآن إدارة ملفك واستقبال الطلبات عبر منصة قِطاعات."
    introEn="Your provider account has been approved. You can now manage your profile and receive requests on Qitaat."
    details={[
      ...(businessName ? [{ labelAr: 'اسم المنشأة', labelEn: 'Business', value: businessName }] : []),
      ...(username ? [{ labelAr: 'الرابط', labelEn: 'Public URL', value: `qitaat.com/${username}`, mono: true }] : []),
    ]}
    cta={{
      href: username ? `${SITE_URL}/${username}` : `${SITE_URL}/dashboard`,
      labelAr: 'فتح ملف المنشأة',
      labelEn: 'Open business profile',
    }}
    tipAr="ننصح بإكمال صور الأعمال والخدمات لزيادة فرص ظهور منشأتك في نتائج البحث."
    tipEn="Add portfolio images and services to improve your visibility in search results."
  />
)

export const template = {
  component: ProviderApprovedEmail,
  subject: 'تم اعتماد حساب منشأتك في قِطاعات · Provider account approved',
  displayName: 'اعتماد منشأة · Provider approved',
  previewData: { recipientName: 'أحمد العتيبي', businessName: 'مصنع الخليج للألمنيوم', username: 'gulf-aluminum' },
} satisfies TemplateEntry