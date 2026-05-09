/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface ContractSignedProps {
  recipientName?: string
  contractRefId?: string
  contractTitle?: string
  counterpartyName?: string
  totalAmount?: string
  currency?: string
  contractUrl?: string
}

const ContractSignedEmail: React.FC<ContractSignedProps> = ({
  recipientName, contractRefId, contractTitle, counterpartyName,
  totalAmount, currency, contractUrl,
}) => {
  const amountStr = totalAmount ? `${totalAmount} ${currency || 'SAR'}` : null
  return (
    <BilingualEmail
      preview={`تم توقيع العقد · Contract signed${contractRefId ? ` #${contractRefId}` : ''}`}
      badge={{ textAr: 'تم التوقيع', textEn: 'Signed', tone: 'success' }}
      titleAr="تم توقيع العقد بنجاح ✓"
      titleEn="Contract signed successfully ✓"
      greetingNameAr={recipientName}
      greetingNameEn={recipientName}
      introAr="نؤكد أن العقد تم التوقيع عليه إلكترونياً من قبل الطرفين، وأصبح ساري المفعول وفقاً لشروطه المعتمدة."
      introEn="We confirm the contract has been electronically signed by both parties and is now in effect under its agreed terms."
      details={[
        ...(contractRefId ? [{ labelAr: 'رقم العقد', labelEn: 'Contract ID', value: contractRefId, mono: true }] : []),
        ...(contractTitle ? [{ labelAr: 'العنوان', labelEn: 'Title', value: contractTitle }] : []),
        ...(counterpartyName ? [{ labelAr: 'الطرف الآخر', labelEn: 'Counterparty', value: counterpartyName }] : []),
        ...(amountStr ? [{ labelAr: 'القيمة الإجمالية', labelEn: 'Total amount', value: amountStr, mono: true }] : []),
      ]}
      bodyAr="حُرر هذا العقد إلكترونياً بنفس الحجية القانونية، ويمكنك تحميل نسخة PDF ومتابعة المراحل والدفعات من لوحة التحكم."
      bodyEn="The electronic signature carries full legal validity. You can download the PDF and track milestones and payments from your dashboard."
      cta={{
        href: contractUrl || 'https://qitaat.com/dashboard/contracts',
        labelAr: 'عرض العقد',
        labelEn: 'View contract',
      }}
    />
  )
}

export const template = {
  component: ContractSignedEmail,
  subject: (data: Record<string, any>) =>
    `تم توقيع العقد${data?.contractRefId ? ` #${data.contractRefId}` : ''} · Contract signed`,
  displayName: 'تأكيد توقيع عقد · Contract signed',
  previewData: {
    recipientName: 'أحمد العتيبي',
    contractRefId: 'CON-0001234',
    contractTitle: 'توريد وتركيب واجهات ألمنيوم',
    counterpartyName: 'شركة الإنجاز للمقاولات',
    totalAmount: '125,000.00',
    currency: 'SAR',
    contractUrl: 'https://qitaat.com/dashboard/contracts',
  },
} satisfies TemplateEntry
