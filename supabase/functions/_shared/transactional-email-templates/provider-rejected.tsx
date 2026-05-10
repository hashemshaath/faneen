/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  businessName?: string
  notes?: string
}

const ProviderRejectedEmail: React.FC<Props> = ({ recipientName, businessName, notes }) => (
  <BilingualEmail
    preview={`لم يتم اعتماد حساب منشأتك في ${SITE_NAME_AR} · Provider account not approved`}
    badge={{ textAr: 'لم يتم الاعتماد', textEn: 'Not approved', tone: 'danger' }}
    titleAr="لم يتم اعتماد حساب منشأتك"
    titleEn="Provider account not approved"
    greetingNameAr={recipientName}
    greetingNameEn={recipientName}
    introAr="نأسف، لم يتم اعتماد حساب منشأتك حالياً. يمكنك مراجعة الملاحظات أدناه وتحديث البيانات عند الحاجة."
    introEn="We're sorry — your provider account was not approved at this time. You can review the notes below and update your details if needed."
    details={businessName ? [{ labelAr: 'اسم المنشأة', labelEn: 'Business', value: businessName }] : undefined}
    highlight={notes ? { labelAr: 'ملاحظات الفريق', labelEn: 'Reviewer notes', content: notes } : undefined}
    cta={{
      href: `${SITE_URL}/contact`,
      labelAr: 'تواصل مع الدعم',
      labelEn: 'Contact support',
    }}
  />
)

export const template = {
  component: ProviderRejectedEmail,
  subject: 'لم يتم اعتماد حساب منشأتك في قِطاعات · Provider account not approved',
  displayName: 'رفض منشأة · Provider rejected',
  previewData: { recipientName: 'أحمد العتيبي', businessName: 'مصنع الخليج للألمنيوم', notes: 'يرجى رفع السجل التجاري بصيغة PDF واضحة.' },
} satisfies TemplateEntry