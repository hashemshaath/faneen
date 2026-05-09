/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  clientName?: string
  contractNumber?: string
  installmentNumber?: number
  amount?: number
  currency?: string
  dueDate?: string
}

const CURRENCY_EN: Record<string, string> = {
  'ر.س': 'SAR', 'SAR': 'SAR', 'AED': 'AED', 'USD': 'USD', 'EUR': 'EUR',
}

const PaymentReminderEmail: React.FC<Props> = ({
  clientName, contractNumber, installmentNumber, amount, currency = 'SAR', dueDate,
}) => {
  const curEn = CURRENCY_EN[currency] || currency
  const amountAr = amount != null ? `${amount.toLocaleString('ar-SA')} ${currency}` : undefined
  const amountEn = amount != null ? `${amount.toLocaleString('en-US')} ${curEn}` : undefined
  return (
    <BilingualEmail
      preview={`تذكير بسداد قسط · Payment reminder${installmentNumber ? ` #${installmentNumber}` : ''}`}
      badge={{ textAr: 'تذكير بالسداد', textEn: 'Payment due', tone: 'warning' }}
      titleAr="تذكير بموعد سداد قسط 💳"
      titleEn="Payment reminder 💳"
      greetingNameAr={clientName}
      greetingNameEn={clientName}
      introAr="نود تذكيرك بموعد سداد القسط المستحق ضمن أحد عقودك على المنصة."
      introEn="This is a friendly reminder that an installment under one of your contracts is due."
      details={[
        ...(contractNumber ? [{ labelAr: 'رقم العقد', labelEn: 'Contract ID', value: contractNumber, mono: true }] : []),
        ...(installmentNumber ? [{ labelAr: 'رقم القسط', labelEn: 'Installment #', value: String(installmentNumber), mono: true }] : []),
        ...(amountAr && amountEn ? [{ labelAr: 'المبلغ المستحق', labelEn: 'Amount due', value: `${amountAr}`, mono: true }] : []),
        ...(dueDate ? [{ labelAr: 'تاريخ الاستحقاق', labelEn: 'Due date', value: dueDate, mono: true }] : []),
      ]}
      tipAr="يرجى سداد المبلغ قبل تاريخ الاستحقاق لتجنّب أي رسوم تأخير محتملة وللحفاظ على سجل سداد ممتاز."
      tipEn="Please pay before the due date to avoid late fees and to keep an excellent payment history."
      cta={{
        href: 'https://qitaat.com/dashboard/installments',
        labelAr: 'فتح صفحة الأقساط',
        labelEn: 'Open installments',
      }}
    />
  )
}

export const template = {
  component: PaymentReminderEmail,
  subject: (data: Record<string, any>) =>
    `تذكير بسداد قسط${data?.contractNumber ? ` — عقد ${data.contractNumber}` : ''} · Payment reminder`,
  displayName: 'تذكير بموعد سداد قسط · Payment reminder',
  previewData: {
    clientName: 'خالد العنزي',
    contractNumber: 'CON-0001234',
    installmentNumber: 3,
    amount: 5000,
    currency: 'SAR',
    dueDate: '2026-05-01',
  },
} satisfies TemplateEntry
