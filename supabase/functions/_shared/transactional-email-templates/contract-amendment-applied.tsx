/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  contractRefId?: string
  amendmentNumber?: number | string
  amendmentTitle?: string
  amendmentType?: string
  appliedAt?: string
  contractUrl?: string
}

const Email: React.FC<Props> = ({
  recipientName, contractRefId, amendmentNumber, amendmentTitle, contractUrl,
}) => (
  <BilingualEmail
    preview={`تم تطبيق ملحق العقد · Amendment applied${contractRefId ? ` #${contractRefId}` : ''}`}
    badge={{ textAr: 'تم التطبيق', textEn: 'Applied', tone: 'success' }}
    titleAr="تم تطبيق ملحق العقد بنجاح ✓"
    titleEn="Amendment applied to contract ✓"
    greetingNameAr={recipientName}
    greetingNameEn={recipientName}
    introAr="تم تطبيق الملحق وتحديث العقد رسمياً. يمكنك الاطلاع على النسخة المحدثة وتفاصيل المراحل والدفعات من لوحة التحكم."
    introEn="The amendment has been applied and the contract has been officially updated. You can view the updated version, milestones, and payments from your dashboard."
    details={[
      ...(contractRefId ? [{ labelAr: 'رقم العقد', labelEn: 'Contract ID', value: contractRefId, mono: true }] : []),
      ...(amendmentNumber != null ? [{ labelAr: 'رقم الملحق', labelEn: 'Amendment #', value: String(amendmentNumber), mono: true }] : []),
      ...(amendmentTitle ? [{ labelAr: 'عنوان الملحق', labelEn: 'Title', value: amendmentTitle }] : []),
    ]}
    cta={contractUrl ? { href: contractUrl, labelAr: 'عرض العقد المحدّث', labelEn: 'View updated contract' } : undefined}
  />
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `تم تطبيق ملحق العقد${d?.contractRefId ? ` ${d.contractRefId}` : ''} · Amendment applied — ${SITE_NAME_AR}`,
  displayName: 'ملحق — تم التطبيق · Amendment applied',
  previewData: {
    recipientName: 'أحمد العتيبي',
    contractRefId: 'CON-0001234',
    amendmentNumber: 2,
    amendmentTitle: 'تمديد فترة التنفيذ',
    contractUrl: 'https://qitaat.com/contracts/123',
  },
} satisfies TemplateEntry