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
  publicReason?: string
  contractUrl?: string
  createdAt?: string
}

const TYPE_AR: Record<string, string> = {
  scope_change: 'تغيير في النطاق', amount_change: 'تعديل القيمة',
  date_change: 'تعديل التاريخ', terms_change: 'تعديل الشروط', other: 'أخرى',
}
const TYPE_EN: Record<string, string> = {
  scope_change: 'Scope change', amount_change: 'Amount change',
  date_change: 'Date change', terms_change: 'Terms change', other: 'Other',
}

const Email: React.FC<Props> = ({
  recipientName, contractRefId, amendmentNumber, amendmentTitle,
  amendmentType, publicReason, contractUrl,
}) => (
  <BilingualEmail
    preview={`طلب ملحق جديد · New amendment request${contractRefId ? ` #${contractRefId}` : ''}`}
    badge={{ textAr: 'طلب جديد', textEn: 'New request', tone: 'info' }}
    titleAr="طلب ملحق جديد على عقدك"
    titleEn="New amendment request on your contract"
    greetingNameAr={recipientName}
    greetingNameEn={recipientName}
    introAr="تم إنشاء طلب ملحق على أحد عقودك يحتاج إلى مراجعتك."
    introEn="An amendment request has been created on one of your contracts and is awaiting your review."
    details={[
      ...(contractRefId ? [{ labelAr: 'رقم العقد', labelEn: 'Contract ID', value: contractRefId, mono: true }] : []),
      ...(amendmentNumber != null ? [{ labelAr: 'رقم الملحق', labelEn: 'Amendment #', value: String(amendmentNumber), mono: true }] : []),
      ...(amendmentTitle ? [{ labelAr: 'عنوان الملحق', labelEn: 'Title', value: amendmentTitle }] : []),
      ...(amendmentType ? [{ labelAr: 'نوع التعديل', labelEn: 'Type', value: `${TYPE_AR[amendmentType] || amendmentType} · ${TYPE_EN[amendmentType] || amendmentType}` }] : []),
    ]}
    highlight={publicReason ? { labelAr: 'سبب التعديل', labelEn: 'Reason', content: publicReason } : undefined}
    cta={contractUrl ? { href: contractUrl, labelAr: 'مراجعة الطلب', labelEn: 'Review request' } : undefined}
  />
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `طلب ملحق جديد${d?.contractRefId ? ` #${d.contractRefId}` : ''} · New amendment — ${SITE_NAME_AR}`,
  displayName: 'ملحق — تم الإنشاء · Amendment created',
  previewData: {
    recipientName: 'أحمد العتيبي',
    contractRefId: 'CON-0001234',
    amendmentNumber: 2,
    amendmentTitle: 'تمديد فترة التنفيذ',
    amendmentType: 'date_change',
    publicReason: 'تأخير بسيط في توريد المواد من المورد.',
    contractUrl: 'https://qitaat.com/contracts/123',
  },
} satisfies TemplateEntry