/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  businessName?: string
  refId?: string
  amount?: number | string
  currency?: string
  validUntil?: string
}

const formatAmount = (amount?: number | string, currency?: string) => {
  if (amount === undefined || amount === null || amount === '') return ''
  const n = typeof amount === 'number' ? amount : Number(amount)
  if (!Number.isFinite(n)) return String(amount)
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currency ?? 'SAR'}`
}

const LeadQuotedEmail: React.FC<Props> = ({
  name, businessName, refId, amount, currency, validUntil,
}) => {
  const formatted = formatAmount(amount, currency)
  const details = [
    refId ? { labelAr: 'رقم الطلب', labelEn: 'Request ID', value: refId } : null,
    businessName ? { labelAr: 'المنشأة', labelEn: 'Provider', value: businessName } : null,
    formatted ? { labelAr: 'قيمة العرض', labelEn: 'Quote amount', value: formatted } : null,
    validUntil ? { labelAr: 'صالح حتى', labelEn: 'Valid until', value: validUntil } : null,
  ].filter(Boolean) as Array<{ labelAr: string; labelEn: string; value: string }>
  return (
    <BilingualEmail
      preview={`تم إرسال عرض سعر لطلبك · A quote was sent for your request`}
      badge={{ textAr: 'عرض سعر', textEn: 'Quote sent', tone: 'success' }}
      titleAr="تم إرسال عرض سعر لطلبك"
      titleEn="A quote has been sent for your request"
      greetingNameAr={name}
      greetingNameEn={name}
      introAr={
        <>
          أرسلت <strong>{businessName ?? 'المنشأة'}</strong> عرض سعر لطلب الخدمة الخاص بك.
          يمكنك مراجعة التفاصيل والتواصل مع المنشأة لمناقشتها من لوحة التحكم.
        </>
      }
      introEn={
        <>
          <strong>{businessName ?? 'The provider'}</strong> has sent you a quote for your
          service request. You can review the details and reach out from your dashboard.
        </>
      }
      details={details.length ? details : undefined}
      cta={{
        href: `${SITE_URL}/dashboard/my-requests`,
        labelAr: 'مراجعة العرض',
        labelEn: 'Review the quote',
      }}
    />
  )
}

export const template = {
  component: LeadQuotedEmail,
  subject: (data: Record<string, any>) =>
    `تم إرسال عرض سعر ${data?.refId ? `(${data.refId}) ` : ''}· Quote sent — ${SITE_NAME_AR}`,
  displayName: 'إرسال عرض سعر · Lead quoted',
  previewData: {
    name: 'سارة أحمد',
    businessName: 'مصنع الألمنيوم المتقدم',
    refId: 'LR-1000123',
    amount: 12500,
    currency: 'SAR',
    validUntil: '2026-06-15',
  },
} satisfies TemplateEntry