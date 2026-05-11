/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  contractRefId?: string
  contractTitle?: string
  installmentNumber?: number | string
  amount?: string
  currency?: string
  contractId?: string
  contractUrl?: string
}

const ContractPaymentRecordedEmail: React.FC<Props> = ({
  recipientName, contractRefId, contractTitle, installmentNumber, amount, currency, contractId, contractUrl,
}) => {
  const amountStr = amount ? `${amount} ${currency || 'SAR'}` : null
  const url = contractUrl || (contractId ? `https://qitaat.com/contracts/${contractId}` : 'https://qitaat.com/dashboard/contracts')
  return (
    <BilingualEmail
      preview={`تم تسجيل دفعة على عقدك · Payment recorded${contractRefId ? ` #${contractRefId}` : ''}`}
      badge={{ textAr: 'دفعة مسجّلة', textEn: 'Payment recorded', tone: 'success' }}
      titleAr="تم تسجيل دفعة على عقدك"
      titleEn="A payment was recorded on your contract"
      greetingNameAr={recipientName}
      greetingNameEn={recipientName}
      introAr="تم تسجيل دفعة على العقد. يمكنك مراجعة تفاصيل العقد وجدول الدفعات من لوحة التحكم."
      introEn="A payment has been recorded on your contract. You can review the contract details and payment schedule from your dashboard."
      details={[
        ...(contractRefId ? [{ labelAr: 'رقم العقد', labelEn: 'Contract ID', value: contractRefId, mono: true }] : []),
        ...(contractTitle ? [{ labelAr: 'عنوان العقد', labelEn: 'Title', value: contractTitle }] : []),
        ...(installmentNumber !== undefined && installmentNumber !== null && installmentNumber !== '' ? [{ labelAr: 'رقم الدفعة', labelEn: 'Installment #', value: String(installmentNumber), mono: true }] : []),
        ...(amountStr ? [{ labelAr: 'القيمة', labelEn: 'Amount', value: amountStr, mono: true }] : []),
      ]}
      cta={{ href: url, labelAr: 'عرض العقد', labelEn: 'View contract' }}
    />
  )
}

export const template = {
  component: ContractPaymentRecordedEmail,
  subject: (_data: Record<string, any>) =>
    `تم تسجيل دفعة على عقدك في ${SITE_NAME_AR} · Payment recorded`,
  displayName: 'تسجيل دفعة على العقد · Contract payment recorded',
  previewData: {
    recipientName: 'أحمد العتيبي',
    contractRefId: 'CON-0001234',
    contractTitle: 'توريد وتركيب واجهات ألمنيوم',
    installmentNumber: 1,
    amount: '37,500.00',
    currency: 'SAR',
    contractId: '123',
  },
} satisfies TemplateEntry
