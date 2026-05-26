/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_URL } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string | null
  planName?: string | null
  planNameAr?: string | null
  planNameEn?: string | null
  refundedAt?: string | null
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
  refundedAt, invoiceId, paymentRef, subscriptionRef, amount, currency, dashboardUrl,
}) => {
  const planAr = planNameAr ?? planName ?? ''
  const planEn = planNameEn ?? planName ?? ''
  const amt = formatAmount(amount, currency)
  return (
    <BilingualEmail
      preview={`تم تسجيل الاسترداد يدويًا · Membership payment marked refunded`}
      badge={{ textAr: 'تم تسجيل الاسترداد', textEn: 'Refunded', tone: 'warning' }}
      titleAr="تم تسجيل الاسترداد يدويًا"
      titleEn="Membership payment marked refunded"
      greetingNameAr={recipientName ?? undefined}
      greetingNameEn={recipientName ?? undefined}
      introAr={`تم تسجيل استرداد دفعة اشتراكك${planAr ? ` (${planAr})` : ''} يدويًا من قبل الإدارة. هذا تسجيل يدوي للاسترداد، وقد تتم معالجة الاسترداد الفعلي عبر القناة الأصلية للدفع بشكل منفصل.`}
      introEn={`Your${planEn ? ` ${planEn}` : ''} membership payment was marked as refunded manually by the admin. This is a manual refund / credit-note record — the actual refund may be processed separately through the original payment channel.`}
      details={[
        ...(planEn || planAr ? [{ labelAr: 'الباقة', labelEn: 'Plan', value: planEn || planAr, mono: true }] : []),
        ...(amt ? [{ labelAr: 'المبلغ', labelEn: 'Amount', value: amt, mono: true }] : []),
        ...(paymentRef ? [{ labelAr: 'مرجع الدفع', labelEn: 'Payment reference', value: paymentRef, mono: true }] : []),
        ...(subscriptionRef ? [{ labelAr: 'مرجع الاشتراك', labelEn: 'Subscription reference', value: subscriptionRef, mono: true }] : []),
        ...(invoiceId ? [{ labelAr: 'رقم الفاتورة', labelEn: 'Invoice', value: invoiceId, mono: true }] : []),
        ...(refundedAt ? [{ labelAr: 'تاريخ الاسترداد', labelEn: 'Refunded at', value: refundedAt }] : []),
      ]}
      cta={{ href: `${SITE_URL}${dashboardUrl ?? '/dashboard/membership'}`, labelAr: 'عرض الاشتراك', labelEn: 'View membership' }}
    />
  )
}

export const template = {
  component: Email,
  subject: `تم تسجيل الاسترداد يدويًا · Membership payment marked refunded`,
  displayName: 'دفع العضوية — تم تسجيل الاسترداد · Membership payment marked refunded',
  previewData: {
    recipientName: 'أحمد العتيبي',
    planName: 'premium',
    refundedAt: '2026-05-24T10:00:00Z',
    invoiceId: 'INV-2026-0001',
    paymentRef: 'PAY-1000123',
    subscriptionRef: 'PVS-1000045',
    amount: 199,
    currency: 'SAR',
  },
} satisfies TemplateEntry