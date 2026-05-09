/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  businessName?: string
}

const LeadConfirmationEmail: React.FC<Props> = ({ name, businessName }) => (
  <BilingualEmail
    preview={`تم إرسال طلبك إلى ${businessName ?? 'المنشأة'} · Your request was sent`}
    badge={{ textAr: 'تم الإرسال', textEn: 'Sent', tone: 'success' }}
    titleAr="وصلنا طلبك بنجاح ✓"
    titleEn="We've got your request ✓"
    greetingNameAr={name}
    greetingNameEn={name}
    introAr={
      <>
        تم إرسال طلب عرض السعر بنجاح إلى <strong>{businessName ?? 'المنشأة'}</strong>،
        وسيتواصل معك ممثل المنشأة عبر وسيلة التواصل التي اخترتها في أقرب وقت ممكن.
      </>
    }
    introEn={
      <>
        Your quote request has been delivered to <strong>{businessName ?? 'the provider'}</strong>.
        A representative will contact you shortly through your preferred channel.
      </>
    }
    tipAr="تأكد من فحص بريدك الإلكتروني والمكالمات الواردة. غالبية المنشآت ترد خلال 24 ساعة عمل."
    tipEn="Please check your inbox and incoming calls. Most providers respond within 24 business hours."
    cta={{
      href: 'https://qitaat.com/dashboard/messages',
      labelAr: 'متابعة الطلبات',
      labelEn: 'Track my requests',
    }}
  />
)

export const template = {
  component: LeadConfirmationEmail,
  subject: (data: Record<string, any>) =>
    `تم إرسال طلبك إلى ${data?.businessName ?? 'المنشأة'} · Request sent — ${SITE_NAME_AR}`,
  displayName: 'تأكيد إرسال طلب عرض سعر · Lead confirmation',
  previewData: { name: 'سارة أحمد', businessName: 'مصنع الألمنيوم المتقدم' },
} satisfies TemplateEntry
