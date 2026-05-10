/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  businessName?: string
  notes?: string
}

const ProviderRevisionRequestedEmail: React.FC<Props> = ({ recipientName, businessName, notes }) => (
  <BilingualEmail
    preview={`مطلوب تحديث بيانات منشأتك في ${SITE_NAME_AR} · Updates required`}
    badge={{ textAr: 'مطلوب تعديل', textEn: 'Revision required', tone: 'warning' }}
    titleAr="مطلوب تحديث بيانات منشأتك"
    titleEn="Updates required on your provider profile"
    greetingNameAr={recipientName}
    greetingNameEn={recipientName}
    introAr="يحتاج طلب التسجيل إلى بعض التعديلات قبل الاعتماد. يرجى مراجعة الملاحظات أدناه وإعادة الإرسال."
    introEn="Your registration needs a few updates before it can be approved. Please review the notes below and resubmit."
    details={businessName ? [{ labelAr: 'اسم المنشأة', labelEn: 'Business', value: businessName }] : undefined}
    highlight={notes ? { labelAr: 'الملاحظات المطلوبة', labelEn: 'Required changes', content: notes } : undefined}
    cta={{
      href: `${SITE_URL}/dashboard`,
      labelAr: 'تحديث بيانات المنشأة',
      labelEn: 'Update business profile',
    }}
    tipAr="بعد إجراء التعديلات يمكنك إعادة إرسال الطلب من لوحة التحكم."
    tipEn="After updating, you can resubmit the request from your dashboard."
  />
)

export const template = {
  component: ProviderRevisionRequestedEmail,
  subject: 'مطلوب تحديث بيانات منشأتك في قِطاعات · Updates required',
  displayName: 'طلب تعديل منشأة · Provider revision requested',
  previewData: { recipientName: 'أحمد العتيبي', businessName: 'مصنع الخليج للألمنيوم', notes: 'الرجاء تحديث وصف المنشأة وإضافة شعار بدقة عالية.' },
} satisfies TemplateEntry