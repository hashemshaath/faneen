/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string | null
  planName?: string | null
  planNameAr?: string | null
  planNameEn?: string | null
  paidAt?: string | null
  invoiceId?: string | null
  paymentRef?: string | null
  subscriptionRef?: string | null
  amount?: number | string | null
  currency?: string | null
  dashboardUrl?: string | null
}

const formatAmount = (amount?: number | string | null, currency?: string | null) => {
  if (amount === null || amount === undefined || amount === '') return null
  const v = typeof amount === 'number' ? amount.toFixed(2) : String(amount)
  return currency ? `${v} ${currency}` : v
}

const Email: React.FC<Props> = ({
  recipientName, planName, planNameAr, planNameEn,
  paidAt, invoiceId, paymentRef, subscriptionRef, amount, currency, dashboardUrl,
}) => {
  const planAr = planNameAr ?? planName ?? ''
  const planEn = planNameEn ?? planName ?? ''
  const amt = formatAmount(amount, currency)
  return (
    <BilingualEmail
      preview={`تم تأكيد دفع اشتراك العضوية · Membership payment confirmed`}
      badge={{ textAr: 'تم الدفع', textEn: 'Paid', tone: 'success' }}
      titleAr="تم تأكيد دفع اشتراك العضوية"
      titleEn="Membership payment confirmed"
      greetingNameAr={recipientName ?? undefined}
      greetingNameEn={recipientName ?? undefined}
      introAr={`تم تأكيد دفع اشتراكك${planAr ? ` (${planAr})` : ''} يدوياً من قبل الإدارة. تبقى الباقة الفعّالة ضمن نظام التفعيل التجريبي/اليدوي الحالي.`}
      introEn={`Your${planEn ? ` ${planEn}` : ''} membership payment was manually confirmed by the admin. Your active plan continues under the current beta / manual activation flow.`}
      details={[
        ...(planEn || planAr ? [{ labelAr: 'الباقة', labelEn: 'Plan', value: planEn || planAr, mono: true }] : []),
        ...(amt ? [{ labelAr: 'المبلغ', labelEn: 'Amount', value: amt, mono: true }] : []),
        ...(paymentRef ? [{ labelAr: 'مرجع الدفع', labelEn: 'Payment reference', value: paymentRef, mono: true }] : []),
        ...(subscriptionRef ? [{ labelAr: 'مرجع الاشتراك', labelEn: 'Subscription reference', value: subscriptionRef, mono: true }] : []),
        ...(invoiceId ? [{ labelAr: 'رقم الفاتورة', labelEn: 'Invoice', value: invoiceId, mono: true }] : []),
        ...(paidAt ? [{ labelAr: 'تاريخ الدفع', labelEn: 'Paid at', value: paidAt }] : []),
      ]}
      cta={{ href: `${SITE_URL}${dashboardUrl ?? '/dashboard/membership'}`, labelAr: 'عرض الاشتراك', labelEn: 'View membership' }}
    />
  )
}

export const template = {
  component: Email,
  subject: `تم تأكيد دفع اشتراك العضوية · Membership payment confirmed`,
  displayName: 'دفع العضوية — تم التأكيد · Membership payment marked paid',
  previewData: {
    recipientName: 'أحمد العتيبي',
    planName: 'premium',
    paidAt: '2026-05-24T10:00:00Z',
    invoiceId: 'INV-2026-0001',
    paymentRef: 'PAY-1000123',
    subscriptionRef: 'PVS-1000045',
    amount: 199,
    currency: 'SAR',
  },
} satisfies TemplateEntry
