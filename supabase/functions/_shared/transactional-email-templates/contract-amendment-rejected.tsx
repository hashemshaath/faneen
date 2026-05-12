/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  contractRefId?: string
  amendmentNumber?: number | string
  amendmentTitle?: string
  contractUrl?: string
}

const Email: React.FC<Props> = ({
  recipientName, contractRefId, amendmentNumber, amendmentTitle, contractUrl,
}) => (
  <BilingualEmail
    preview={`تم رفض طلب الملحق · Amendment rejected${contractRefId ? ` #${contractRefId}` : ''}`}
    badge={{ textAr: 'مرفوض', textEn: 'Rejected', tone: 'danger' }}
    titleAr="تم رفض طلب الملحق"
    titleEn="Amendment request rejected"
    greetingNameAr={recipientName}
    greetingNameEn={recipientName}
    introAr="تم رفض طلب الملحق الذي تقدمت به. يبقى العقد ساري المفعول بشروطه الحالية. يمكنك مراجعة التفاصيل أو إنشاء طلب جديد عند الحاجة."
    introEn="Your amendment request has been rejected. The contract remains in effect under its current terms. You can review the details or submit a new request if needed."
    details={[
      ...(contractRefId ? [{ labelAr: 'رقم العقد', labelEn: 'Contract ID', value: contractRefId, mono: true }] : []),
      ...(amendmentNumber != null ? [{ labelAr: 'رقم الملحق', labelEn: 'Amendment #', value: String(amendmentNumber), mono: true }] : []),
      ...(amendmentTitle ? [{ labelAr: 'عنوان الملحق', labelEn: 'Title', value: amendmentTitle }] : []),
    ]}
    cta={contractUrl ? { href: contractUrl, labelAr: 'فتح العقد', labelEn: 'Open contract' } : undefined}
  />
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `تم رفض الملحق${d?.contractRefId ? ` للعقد ${d.contractRefId}` : ''} · Amendment rejected — ${SITE_NAME_AR}`,
  displayName: 'ملحق — تم الرفض · Amendment rejected',
  previewData: {
    recipientName: 'سارة المطيري',
    contractRefId: 'CON-0001234',
    amendmentNumber: 2,
    amendmentTitle: 'تمديد فترة التنفيذ',
    contractUrl: 'https://qitaat.com/contracts/123',
  },
} satisfies TemplateEntry