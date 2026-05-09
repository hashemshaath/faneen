/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  businessName?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  budgetRange?: string
  contactPreference?: string
  message?: string
  leadId?: string
}

const CONTACT_AR: Record<string, string> = {
  whatsapp: 'واتساب', phone: 'مكالمة هاتفية', email: 'بريد إلكتروني',
}
const CONTACT_EN: Record<string, string> = {
  whatsapp: 'WhatsApp', phone: 'Phone call', email: 'Email',
}

const LeadNotificationEmail: React.FC<Props> = ({
  businessName, customerName, customerEmail, customerPhone,
  budgetRange, contactPreference, message, leadId,
}) => {
  const prefAr = contactPreference ? CONTACT_AR[contactPreference] || contactPreference : undefined
  const prefEn = contactPreference ? CONTACT_EN[contactPreference] || contactPreference : undefined
  return (
    <BilingualEmail
      preview={`طلب عرض سعر جديد من ${customerName ?? 'عميل محتمل'} · New quote request`}
      badge={{ textAr: 'طلب جديد', textEn: 'New lead', tone: 'info' }}
      titleAr="طلب عرض سعر جديد"
      titleEn="New quote request"
      greetingNameAr={businessName}
      greetingNameEn={businessName}
      introAr="وصلك طلب جديد من عميل محتمل عبر منصة قِطاعات. سرعة الرد ترفع فرص تحويله إلى عقد."
      introEn="You've received a new request from a potential customer via Qitaat. Faster responses convert better."
      details={[
        ...(customerName ? [{ labelAr: 'الاسم', labelEn: 'Name', value: customerName }] : []),
        ...(customerEmail ? [{ labelAr: 'البريد', labelEn: 'Email', value: customerEmail, mono: true }] : []),
        ...(customerPhone ? [{ labelAr: 'الجوال', labelEn: 'Phone', value: customerPhone, mono: true }] : []),
        ...(budgetRange ? [{ labelAr: 'الميزانية', labelEn: 'Budget', value: budgetRange, mono: true }] : []),
        ...(prefAr && prefEn ? [{ labelAr: 'وسيلة التواصل المفضلة', labelEn: 'Preferred contact', value: `${prefAr} · ${prefEn}` }] : []),
      ]}
      highlight={message ? {
        labelAr: 'رسالة العميل',
        labelEn: "Customer's message",
        content: message,
      } : undefined}
      tipAr="ننصح بالرد خلال ساعة لأقصى فرصة لإغلاق الصفقة."
      tipEn="We recommend responding within one hour for the highest conversion rate."
      cta={{
        href: `https://qitaat.com/dashboard/messages${leadId ? `?lead=${leadId}` : ''}`,
        labelAr: 'فتح الطلب في لوحة التحكم',
        labelEn: 'Open in dashboard',
      }}
    />
  )
}

export const template = {
  component: LeadNotificationEmail,
  subject: (data: Record<string, any>) =>
    `طلب جديد من ${data?.customerName ?? 'عميل محتمل'} · New lead — ${SITE_NAME_AR}`,
  displayName: 'إشعار طلب جديد للمنشأة · New lead notification',
  previewData: {
    businessName: 'مصنع الألمنيوم المتقدم',
    customerName: 'سارة أحمد',
    customerEmail: 'sara@example.com',
    customerPhone: '+966500000000',
    budgetRange: '20k–100k SAR',
    contactPreference: 'whatsapp',
    message: 'أرغب في تركيب واجهات ألمنيوم لمشروع تجاري بمساحة 250 متر مربع.',
    leadId: 'demo-lead-id',
  },
} satisfies TemplateEntry
