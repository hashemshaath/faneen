/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  contractRefId?: string
  contractTitle?: string
  installmentNumber?: number | string
  dueDate?: string
  contractId?: string
  contractUrl?: string
}

const ContractPaymentDueEmail: React.FC<Props> = ({
  recipientName, contractRefId, contractTitle, installmentNumber, dueDate, contractId, contractUrl,
}) => {
  const url = contractUrl || (contractId ? `https://qitaat.com/contracts/${contractId}` : 'https://qitaat.com/dashboard/contracts')
  return (
    <BilingualEmail
      preview={`تذكير باستحقاق دفعة · Payment reminder${contractRefId ? ` #${contractRefId}` : ''}`}
      badge={{ textAr: 'تذكير دفعة', textEn: 'Payment due', tone: 'warning' }}
      titleAr="تذكير باستحقاق دفعة"
      titleEn="Payment due reminder"
      greetingNameAr={recipientName}
      greetingNameEn={recipientName}
      introAr="توجد دفعة مستحقة مرتبطة بعقدك. يمكنك مراجعة جدول الدفعات من صفحة العقد."
      introEn="There is an upcoming or pending payment on your contract. You can review the payment schedule from the contract page."
      details={[
        ...(contractRefId ? [{ labelAr: 'رقم العقد', labelEn: 'Contract ID', value: contractRefId, mono: true }] : []),
        ...(contractTitle ? [{ labelAr: 'عنوان العقد', labelEn: 'Title', value: contractTitle }] : []),
        ...(installmentNumber !== undefined && installmentNumber !== null && installmentNumber !== '' ? [{ labelAr: 'رقم الدفعة', labelEn: 'Installment #', value: String(installmentNumber), mono: true }] : []),
        ...(dueDate ? [{ labelAr: 'تاريخ الاستحقاق', labelEn: 'Due date', value: dueDate, mono: true }] : []),
      ]}
      cta={{ href: url, labelAr: 'عرض العقد', labelEn: 'View contract' }}
    />
  )
}

export const template = {
  component: ContractPaymentDueEmail,
  subject: (_data: Record<string, any>) =>
    `تذكير باستحقاق دفعة في ${SITE_NAME_AR} · Payment due reminder`,
  displayName: 'تذكير باستحقاق دفعة · Contract payment due',
  previewData: {
    recipientName: 'أحمد العتيبي',
    contractRefId: 'CON-0001234',
    contractTitle: 'توريد وتركيب واجهات ألمنيوم',
    installmentNumber: 2,
    dueDate: '2026-06-01',
    contractId: '123',
  },
} satisfies TemplateEntry
