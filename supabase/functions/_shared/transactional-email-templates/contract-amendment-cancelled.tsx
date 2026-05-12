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
    preview={`تم إلغاء طلب الملحق · Amendment cancelled${contractRefId ? ` #${contractRefId}` : ''}`}
    badge={{ textAr: 'ملغى', textEn: 'Cancelled', tone: 'neutral' }}
    titleAr="تم إلغاء طلب الملحق"
    titleEn="Amendment request cancelled"
    greetingNameAr={recipientName}
    greetingNameEn={recipientName}
    introAr="تم إلغاء طلب الملحق ولن يتم تطبيقه. يبقى العقد ساري المفعول بشروطه الحالية."
    introEn="The amendment request has been cancelled and will not be applied. The contract remains in effect under its current terms."
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
    `تم إلغاء الملحق${d?.contractRefId ? ` للعقد ${d.contractRefId}` : ''} · Amendment cancelled — ${SITE_NAME_AR}`,
  displayName: 'ملحق — تم الإلغاء · Amendment cancelled',
  previewData: {
    recipientName: 'أحمد العتيبي',
    contractRefId: 'CON-0001234',
    amendmentNumber: 2,
    amendmentTitle: 'تمديد فترة التنفيذ',
    contractUrl: 'https://qitaat.com/contracts/123',
  },
} satisfies TemplateEntry