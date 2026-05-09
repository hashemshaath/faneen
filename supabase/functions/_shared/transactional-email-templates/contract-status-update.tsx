/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface ContractStatusProps {
  recipientName?: string
  contractNumber?: string
  contractTitle?: string
  newStatus?: string
  contractId?: string
}

const STATUS_AR: Record<string, string> = {
  draft: 'مسودة', pending: 'بانتظار الموافقة', active: 'نشط',
  completed: 'مكتمل', cancelled: 'ملغي', disputed: 'متنازع عليه',
}
const STATUS_EN: Record<string, string> = {
  draft: 'Draft', pending: 'Pending approval', active: 'Active',
  completed: 'Completed', cancelled: 'Cancelled', disputed: 'Disputed',
}
const STATUS_TONE: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success', completed: 'success', pending: 'warning',
  draft: 'neutral', cancelled: 'danger', disputed: 'danger',
}

const ContractStatusEmail: React.FC<ContractStatusProps> = ({
  recipientName, contractNumber, contractTitle, newStatus, contractId,
}) => {
  const statusAr = newStatus ? (STATUS_AR[newStatus] || newStatus) : undefined
  const statusEn = newStatus ? (STATUS_EN[newStatus] || newStatus) : undefined
  const tone = newStatus ? STATUS_TONE[newStatus] || 'info' : 'info'
  return (
    <BilingualEmail
      preview={`تحديث حالة العقد ${contractNumber || ''} · Contract status updated`}
      badge={statusAr && statusEn ? { textAr: statusAr, textEn: statusEn, tone } : undefined}
      titleAr="تحديث حالة العقد"
      titleEn="Contract status updated"
      greetingNameAr={recipientName}
      greetingNameEn={recipientName}
      introAr="تم تحديث حالة أحد عقودك على المنصة. التفاصيل أدناه."
      introEn="The status of one of your contracts has been updated. See details below."
      details={[
        ...(contractNumber ? [{ labelAr: 'رقم العقد', labelEn: 'Contract ID', value: contractNumber, mono: true }] : []),
        ...(contractTitle ? [{ labelAr: 'عنوان العقد', labelEn: 'Title', value: contractTitle }] : []),
        ...(statusAr ? [{ labelAr: 'الحالة الحالية', labelEn: 'Current status', value: `${statusAr} · ${statusEn}` }] : []),
      ]}
      cta={contractId ? {
        href: `https://qitaat.com/contracts/${contractId}`,
        labelAr: 'عرض تفاصيل العقد',
        labelEn: 'View contract details',
      } : undefined}
    />
  )
}

export const template = {
  component: ContractStatusEmail,
  subject: (data: Record<string, any>) =>
    `تحديث عقد ${data?.contractNumber || ''} · Contract update — ${SITE_NAME_AR}`,
  displayName: 'تحديث حالة العقد · Contract status update',
  previewData: {
    recipientName: 'أحمد العتيبي',
    contractNumber: 'CON-0001234',
    contractTitle: 'عقد توريد وتركيب واجهات ألمنيوم',
    newStatus: 'active',
    contractId: '123',
  },
} satisfies TemplateEntry
